package handlers

import (
	validation "github.com/go-ozzo/ozzo-validation"
	"github.com/gofiber/fiber/v3"
	"github.com/lib/pq"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
)

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
	project, err := verifyDashboardProjectAccess(h.db, c, projectID, userID)
	if err != nil {
		return err
	}

	// Verify organization permissions (must be admin or owner)
	_, err = verifyOrganizationRole(h.db, project.OrganizationID, userID, []models.Role{models.RoleOwner, models.RoleAdmin})
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "You don't have permission to create API keys in this organization",
		})
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
	project, err := verifyDashboardProjectAccess(h.db, c, projectID, userID)
	if err != nil {
		return err
	}

	// Verify organization access
	_, err = verifyOrganizationAccess(h.db, project.OrganizationID, userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "You don't have access to this organization",
		})
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
	project, err := verifyDashboardProjectAccess(h.db, c, projectID, userID)
	if err != nil {
		return err
	}

	// Verify organization permissions (must be admin or owner)
	_, err = verifyOrganizationRole(h.db, project.OrganizationID, userID, []models.Role{models.RoleOwner, models.RoleAdmin})
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "You don't have permission to delete API keys in this organization",
		})
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
