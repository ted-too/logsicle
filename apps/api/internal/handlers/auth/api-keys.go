package auth

import (
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"
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

func (h *AuthHandler) CreateAPIKey(c fiber.Ctx) error {
	projectID := c.Params("id")

	sess := session.FromContext(c)
	userSession, ok := sess.Get(storage.SessionDataKey).(storage.Session)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Not authenticated",
		})
	}

	input := new(createAPIKeyRequest)
	if err := c.Bind().Body(input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	err := input.Validate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Validation failed: " + err.Error(),
		})
	}

	keyID, err := typeid.New[models.APIKeyID]()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate API key ID",
		})
	}

	// Generate the raw API key
	rawAPIKey, err := models.GenerateAPIKey()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate API key",
		})
	}

	apiKey := models.APIKey{
		BaseModel: storage.BaseModel{ID: keyID.String()},
		ProjectID: projectID,
		UserID:    userSession.UserID, // Track who created the key
		Name:      input.Name,
		Key:       rawAPIKey,
		Scopes:    pq.StringArray(input.Scopes),
	}

	// The BeforeCreate hook will hash the raw key and set the masked version
	if err := h.db.Create(&apiKey).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create API key: " + err.Error(),
		})
	}

	// Return the raw API key in the response
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":         apiKey.ID,
		"name":       apiKey.Name,
		"key":        rawAPIKey,
		"scopes":     apiKey.Scopes,
		"created_by": apiKey.UserID,
		"created_at": apiKey.CreatedAt,
	})
}

// ListAPIKeys lists all API keys for a project
func (h *AuthHandler) ListAPIKeys(c fiber.Ctx) error {
	projectID := c.Params("id")

	var apiKeys []models.APIKey
	if err := h.db.Where("project_id = ?", projectID).Find(&apiKeys).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch API keys: " + err.Error(),
		})
	}

	return c.JSON(apiKeys)
}

// DeleteAPIKey deletes an API key
func (h *AuthHandler) DeleteAPIKey(c fiber.Ctx) error {
	projectID := c.Params("id")
	keyID := c.Params("keyId")

	result := h.db.Where("id = ? AND project_id = ?", keyID, projectID).Delete(&models.APIKey{})
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete API key: " + result.Error.Error(),
		})
	}

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "API key not found",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
