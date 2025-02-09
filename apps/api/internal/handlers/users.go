package handlers

import (
	"github.com/gofiber/fiber/v3"
	"github.com/lib/pq"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
)

type createProjectRequest struct {
	Name             string   `json:"name" validate:"required"`
	AllowedOrigins   []string `json:"allowed_origins"`
	LogRetentionDays int      `json:"log_retention_days"`
}

func (g *BaseHandler) createProject(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)

	body := new(createProjectRequest)
	if err := c.Bind().Body(body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
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

	if err := g.DB.Create(&project).Error; err != nil {
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

func (g *BaseHandler) updateProject(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")

	// Check if project exists and belongs to user
	var project models.Project
	if err := g.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Project not found",
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
	if err := g.DB.Model(&project).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to update project",
			"error":   err.Error(),
		})
	}

	// Fetch updated project
	if err := g.DB.First(&project, "id = ?", projectID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch updated project",
			"error":   err.Error(),
		})
	}

	return c.JSON(project)
}

func (g *BaseHandler) listProjects(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)

	var projects []models.Project
	if err := g.DB.Where("user_id = ?", userID).Preload("APIKeys").Find(&projects).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch projects",
			"error":   err.Error(),
		})
	}

	return c.JSON(projects)
}

func (g *BaseHandler) getProject(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")

	var project models.Project
	if err := g.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Project not found",
		})
	}

	// Load associated API keys
	if err := g.DB.Where("project_id = ?", projectID).Find(&project.APIKeys).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch project details",
			"error":   err.Error(),
		})
	}

	return c.JSON(project)
}

func (g *BaseHandler) deleteProject(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")

	// Begin transaction
	tx := g.DB.Begin()
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
	Name   string   `json:"name" validate:"required"`
	Scopes []string `json:"scopes" validate:"required,dive,oneof=logs:write logs:read metrics:write metrics:read events:write events:read"`
}

func (g *BaseHandler) createAPIKey(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")

	// Verify project ownership
	var project models.Project
	if err := g.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Project not found",
		})
	}

	var req createAPIKeyRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
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
		Name:      req.Name,
		Key:       rawAPIKey,
		Scopes:    pq.StringArray(req.Scopes),
	}

	// The BeforeCreate hook will hash the raw key and set the masked version
	if err := g.DB.Create(&apiKey).Error; err != nil {
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

func (g *BaseHandler) listAPIKeys(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")

	// Verify project ownership
	var project models.Project
	if err := g.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Project not found",
		})
	}

	var apiKeys []models.ApiKey
	if err := g.DB.Where("project_id = ?", projectID).Find(&apiKeys).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch API keys",
			"error":   err.Error(),
		})
	}

	return c.JSON(apiKeys)
}

func (g *BaseHandler) deleteAPIKey(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	projectID := c.Params("id")
	keyID := c.Params("keyId")

	// First verify project ownership
	var project models.Project
	if err := g.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Project not found",
		})
	}

	// Delete the API key
	result := g.DB.Where("id = ? AND project_id = ?", keyID, projectID).Delete(&models.ApiKey{})
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
