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
	OrganizationID   string   `json:"organization_id"`
}

func (r createProjectRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Name, validation.Required, validation.Length(1, 255)),
		validation.Field(&r.LogRetentionDays, validation.Min(1), validation.Max(90)),
		validation.Field(&r.OrganizationID, validation.Required),
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

	// Verify organization access with admin or owner role
	_, err = verifyOrganizationRole(h.db, body.OrganizationID, userID, []models.Role{models.RoleOwner, models.RoleAdmin})
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "You don't have permission to create projects in this organization",
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
		OrganizationID:   body.OrganizationID,
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

func (r updateProjectRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Name, validation.Length(1, 255)),
		validation.Field(&r.LogRetentionDays, validation.Min(1), validation.Max(90)),
	)
}

func (h *BaseHandler) updateProject(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")

	// Verify project access
	project, err := verifyDashboardProjectAccess(h.db, c, projectID, userID)
	if err != nil {
		return err
	}

	// Verify organization permissions (must be admin or owner)
	_, err = verifyOrganizationRole(h.db, project.OrganizationID, userID, []models.Role{models.RoleOwner, models.RoleAdmin})
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "You don't have permission to update projects in this organization",
		})
	}

	// Parse request body
	body := new(updateProjectRequest)
	if err := c.Bind().Body(body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	// Validate request body
	if err := body.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Validation failed",
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
	organizationID := c.Query("organization_id")

	// If organization ID is provided, verify access to that organization
	if organizationID != "" {
		_, err := verifyOrganizationAccess(h.db, organizationID, userID)
		if err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"message": "You don't have access to this organization",
			})
		}

		var projects []models.Project
		if err := h.db.Where("organization_id = ?", organizationID).Preload("APIKeys").Find(&projects).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to fetch projects",
				"error":   err.Error(),
			})
		}

		return c.JSON(projects)
	}

	// If no organization ID is provided, list all projects the user has access to
	// Get all organizations the user is a member of
	var memberships []models.TeamMembership
	if err := h.db.Where("user_id = ?", userID).Find(&memberships).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch user memberships",
			"error":   err.Error(),
		})
	}

	// Extract organization IDs
	orgIDs := make([]string, 0, len(memberships))
	for _, membership := range memberships {
		orgIDs = append(orgIDs, membership.OrganizationID)
	}

	// If user is not a member of any organization, return empty list
	if len(orgIDs) == 0 {
		return c.JSON([]models.Project{})
	}

	// Get all projects from these organizations
	var projects []models.Project
	if err := h.db.Where("organization_id IN ?", orgIDs).Preload("APIKeys").Find(&projects).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch projects",
			"error":   err.Error(),
		})
	}

	return c.JSON(projects)
}

func verifyDashboardProjectAccess(db *gorm.DB, ctx fiber.Ctx, projectID, userID string) (*models.Project, error) {
	var project models.Project
	if err := db.Where("id = ?", projectID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fiber.NewError(fiber.StatusNotFound, "Project not found")
		}
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to verify project access")
	}

	// Check if user has access to the organization that owns this project
	var membership models.TeamMembership
	result := db.Where("organization_id = ? AND user_id = ?", project.OrganizationID, userID).First(&membership)
	if result.Error != nil {
		return nil, fiber.NewError(fiber.StatusForbidden, "You don't have access to this project")
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

	// Verify project access
	project, err := verifyDashboardProjectAccess(h.db, c, projectID, userID)
	if err != nil {
		return err
	}

	// Verify organization permissions (must be admin or owner)
	_, err = verifyOrganizationRole(h.db, project.OrganizationID, userID, []models.Role{models.RoleOwner, models.RoleAdmin})
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "You don't have permission to delete projects in this organization",
		})
	}

	// Begin transaction
	tx := h.db.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to start transaction",
			"error":   tx.Error.Error(),
		})
	}

	// Delete project
	if err := tx.Delete(&project).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to delete project",
			"error":   err.Error(),
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
