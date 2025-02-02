package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

type BasicBody struct {
	ProjectID string `json:"project_id" validate:"required"`
}

// APIAuth middleware checks for valid API key and permissions
func APIAuth(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		// Get project ID from request body
		body := new(BasicBody)
		if err := c.Bind().JSON(body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Missing project_id",
			})
		}

		// Get API key from header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing API key",
			})
		}

		// Extract the key from "Bearer <key>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization header format",
			})
		}

		providedKey := parts[1]

		// Find API keys for the project
		var keys []models.ApiKey
		if err := db.Where("project_id = ?", body.ProjectID).Find(&keys).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to validate API key",
			})
		}

		// Verify the provided key against all project keys
		var validKey *models.ApiKey
		for i := range keys {
			if keys[i].VerifyKey(providedKey) {
				validKey = &keys[i]
				break
			}
		}

		if validKey == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid API key",
			})
		}

		// Verify the key has the required scope for the operation
		requiredScope := getRequiredScope(c.Method(), c.Path())
		if !hasScope(validKey.Scopes, requiredScope) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Insufficient permissions",
			})
		}

		// Store API key and project info in context for later use
		c.Locals("api_key", validKey)
		c.Locals("project_id", body.ProjectID)

		return c.Next()
	}
}

// TODO: Fix this
// getRequiredScope determines the required scope based on the request
func getRequiredScope(method, path string) string {
	// Extract the base path
	parts := strings.Split(path, "/")
	if len(parts) < 3 {
		return ""
	}

	// Determine scope based on path and method
	switch parts[2] { // parts[2] would be "event", "app", "request", or "metric"
	case "event", "app", "request":
		if method == "POST" {
			return models.ScopeLogsWrite
		}
		return models.ScopeLogsRead
	case "metric":
		if method == "POST" {
			return models.ScopeMetricsWrite
		}
		return models.ScopeMetricsRead
	default:
		return ""
	}
}

// hasScope checks if the API key has the required scope
func hasScope(scopes []string, requiredScope string) bool {
	// Check for specific scope
	for _, scope := range scopes {
		if scope == requiredScope {
			return true
		}
	}

	return false
}
