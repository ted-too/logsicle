package handlers

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation"
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
	"github.com/lib/pq"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

type createProjectRequest struct {
	Name             string   `json:"name"`
	AllowedOrigins   []string `json:"allowed_origins"`
	LogRetentionDays int      `json:"log_retention_days"`
}

func (r createProjectRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Name, validation.Required, validation.Length(1, 255)),
		validation.Field(&r.LogRetentionDays, validation.Min(1), validation.Max(90)),
	)
}

func (h *BaseHandler) createProject(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)

	body := new(createProjectRequest)
	if err := c.Bind().Body(body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	err := body.Validate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Validation failed",
			"error":   err.Error(),
		})
	}

	projectID, err := typeid.New[models.ProjectID]()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to generate project ID",
		})
	}

	project := models.Project{
		BaseModel:        storage.BaseModel{ID: projectID.String()},
		UserID:           userID,
		Name:             body.Name,
		AllowedOrigins:   pq.StringArray(body.AllowedOrigins),
		LogRetentionDays: body.LogRetentionDays,
	}

	if err := h.db.Create(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to create project",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(project)
}

type updateProjectRequest struct {
	Name             string   `json:"name"`
	AllowedOrigins   []string `json:"allowed_origins"`
	LogRetentionDays int      `json:"log_retention_days"`
}

func (h *BaseHandler) updateProject(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")

	// Verify project access
	project, err := verifyDashboardProjectAccess(h.db, c, projectID, userID)
	if err != nil {
		return err
	}

	// Parse request body
	body := new(updateProjectRequest)
	if err := c.Bind().Body(body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	// Update only provided fields
	updates := make(map[string]interface{})
	if body.Name != "" {
		updates["name"] = body.Name
	}
	if body.AllowedOrigins != nil {
		updates["allowed_origins"] = pq.StringArray(body.AllowedOrigins)
	}
	if body.LogRetentionDays != 0 {
		updates["log_retention_days"] = body.LogRetentionDays
	}

	// Apply updates
	if err := h.db.Model(&project).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to update project",
			"error":   err.Error(),
		})
	}

	// Fetch updated project
	if err := h.db.First(&project, "id = ?", projectID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch updated project",
			"error":   err.Error(),
		})
	}

	return c.JSON(project)
}

func (h *BaseHandler) listProjects(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)

	var projects []models.Project
	if err := h.db.Where("user_id = ?", userID).Preload("APIKeys").Find(&projects).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch projects",
			"error":   err.Error(),
		})
	}

	return c.JSON(projects)
}

func verifyDashboardProjectAccess(db *gorm.DB, ctx fiber.Ctx, projectID, userID string) (*models.Project, error) {
	var project models.Project
	if err := db.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fiber.NewError(fiber.StatusNotFound, "Project not found or access denied")
		}
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to verify project access")
	}
	return &project, nil
}

func (h *BaseHandler) getProject(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")

	// Verify project access
	project, err := verifyDashboardProjectAccess(h.db, c, projectID, userID)
	if err != nil {
		return err
	}

	// Load associated API keys
	if err := h.db.Where("project_id = ?", projectID).Find(&project.APIKeys).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch project details",
			"error":   err.Error(),
		})
	}

	// Get the latest log timestamp for each resource type using pgx
	query := `
        SELECT 
            (SELECT MAX(timestamp) FROM app_logs WHERE project_id = $1) as last_app_log,
            (SELECT MAX(timestamp) FROM event_logs WHERE project_id = $1) as last_event_log,
            (SELECT MAX(timestamp) FROM request_logs WHERE project_id = $1) as last_request_log
	`
	// (SELECT MAX(timestamp) FROM metrics WHERE project_id = $1) as last_metric
	var lastAppLog, lastEventLog, lastRequestLog *time.Time
	err = h.pool.QueryRow(c.Context(), query, projectID).Scan(
		&lastAppLog,
		&lastEventLog,
		&lastRequestLog,
		// &lastMetric,
	)
	if err != nil && err != pgx.ErrNoRows {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch last log timestamps",
			"error":   err.Error(),
		})
	}

	// Create a response struct that includes the project and last log timestamps
	response := fiber.Map{
		"id":                 project.ID,
		"created_at":         project.CreatedAt,
		"updated_at":         project.UpdatedAt,
		"user_id":            project.UserID,
		"name":               project.Name,
		"allowed_origins":    project.AllowedOrigins,
		"log_retention_days": project.LogRetentionDays,
		"api_keys":           project.APIKeys,
		"last_activity": fiber.Map{
			"app_logs":     lastAppLog,
			"event_logs":   lastEventLog,
			"request_logs": lastRequestLog,
			// "metrics":      lastMetric,
		},
	}

	return c.JSON(response)
}

func (h *BaseHandler) deleteProject(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")

	// Begin transaction
	tx := h.db.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to start transaction",
			"error":   tx.Error.Error(),
		})
	}

	// Verify project ownership and delete
	result := tx.Where("id = ? AND user_id = ?", projectID, userID).Delete(&models.Project{})
	if result.Error != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to delete project",
			"error":   result.Error.Error(),
		})
	}

	if result.RowsAffected == 0 {
		tx.Rollback()
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Project not found",
		})
	}

	// Delete associated API keys
	if err := tx.Where("project_id = ?", projectID).Delete(&models.ApiKey{}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to delete associated API keys",
			"error":   err.Error(),
		})
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to commit transaction",
			"error":   err.Error(),
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

type createAPIKeyRequest struct {
	Name   string   `json:"name"`
	Scopes []string `json:"scopes"`
}

func (r createAPIKeyRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Name, validation.Required, validation.Length(1, 255)),
		validation.Field(&r.Scopes, validation.Required, validation.Each(validation.In(
			models.ScopeAppLogsWrite,
			models.ScopeAppLogsRead,
			models.ScopeMetricsWrite,
			models.ScopeMetricsRead,
			models.ScopeEventsWrite,
			models.ScopeEventsRead,
			models.ScopeRequestWrite,
			models.ScopeRequestRead,
			models.ScopeTracesWrite,
			models.ScopeTracesRead,
		))),
	)
}

func (h *BaseHandler) createAPIKey(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")

	// Verify project access
	_, err := verifyDashboardProjectAccess(h.db, c, projectID, userID)
	if err != nil {
		return err
	}

	input := new(createAPIKeyRequest)
	if err := c.Bind().Body(input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	err = input.Validate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Validation failed",
			"error":   err.Error(),
		})
	}

	keyID, err := typeid.New[models.ApiKeyID]()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to generate API key ID",
		})
	}

	// Generate the raw API key first
	rawAPIKey, err := models.GenerateAPIKey()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to generate API key",
		})
	}

	apiKey := models.ApiKey{
		BaseModel: storage.BaseModel{ID: keyID.String()},
		ProjectID: projectID,
		Name:      input.Name,
		Key:       rawAPIKey,
		Scopes:    pq.StringArray(input.Scopes),
	}

	// The BeforeCreate hook will hash the raw key and set the masked version
	if err := h.db.Create(&apiKey).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to create API key",
			"error":   err.Error(),
		})
	}

	// Return the raw API key in the response
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":         apiKey.ID,
		"name":       apiKey.Name,
		"key":        rawAPIKey,
		"scopes":     apiKey.Scopes,
		"created_at": apiKey.CreatedAt,
	})
}

func (h *BaseHandler) listAPIKeys(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")

	// Verify project access
	_, err := verifyDashboardProjectAccess(h.db, c, projectID, userID)
	if err != nil {
		return err
	}

	var apiKeys []models.ApiKey
	if err := h.db.Where("project_id = ?", projectID).Find(&apiKeys).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch API keys",
			"error":   err.Error(),
		})
	}

	return c.JSON(apiKeys)
}

func (h *BaseHandler) deleteAPIKey(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")
	keyID := c.Params("keyId")

	// Verify project access
	_, err := verifyDashboardProjectAccess(h.db, c, projectID, userID)
	if err != nil {
		return err
	}

	// Delete the API key
	result := h.db.Where("id = ? AND project_id = ?", keyID, projectID).Delete(&models.ApiKey{})
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to delete API key",
			"error":   result.Error.Error(),
		})
	}

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "API key not found",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
