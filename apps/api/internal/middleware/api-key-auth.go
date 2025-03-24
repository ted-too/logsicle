package middleware

import (
	"fmt"
	"slices"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation"
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

type BasicBody struct {
	ProjectID   string  `json:"project_id"`
	ChannelName *string `json:"channel"`
}

func (b BasicBody) Validate() error {
	return validation.ValidateStruct(&b,
		validation.Field(&b.ProjectID, validation.Required),
	)
}

// validatePreflightOrigin checks if the origin is allowed in any project
func validatePreflightOrigin(c fiber.Ctx, db *gorm.DB) error {
	origin := c.Get("Origin")
	if origin == "" {
		return nil // No CORS needed for non-browser requests
	}

	// Check if origin is allowed in any project
	var count int64
	if err := db.Model(&models.Project{}).
		Where("? = ANY(allowed_origins)", origin).
		Count(&count).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to validate origin")
	}

	if count == 0 {
		return fiber.NewError(fiber.StatusForbidden, "Origin not allowed")
	}

	// Origin is allowed, set CORS headers
	c.Set("Access-Control-Allow-Origin", origin)
	c.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	c.Set("Access-Control-Allow-Methods", "POST")
	c.Set("Access-Control-Max-Age", "86400")
	return nil
}

// validateOrigin checks if the origin is allowed for a specific project
func validateOrigin(c fiber.Ctx, db *gorm.DB) (string, *string, error) {
	// Get project ID from body
	body := new(BasicBody)
	if err := c.Bind().JSON(body); err != nil {
		return "", nil, fiber.NewError(fiber.StatusBadRequest, "Invalid json body")
	}

	err := body.Validate()
	if err != nil {
		return "", nil, fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	var project models.Project
	if err := db.Where("id = ?", body.ProjectID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", nil, fiber.NewError(fiber.StatusBadRequest, "Invalid project")
		}
		return "", nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to validate project")
	}

	origin := c.Get("Origin")
	if origin == "" {
		return project.ID, body.ChannelName, nil
	}

	// Check if origin matches any allowed origins
	for _, allowedOrigin := range project.AllowedOrigins {
		if allowedOrigin == origin {
			c.Set("Access-Control-Allow-Origin", origin)
			c.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			c.Set("Access-Control-Allow-Methods", "POST")
			return project.ID, body.ChannelName, nil
		}
	}

	return "", nil, fiber.NewError(fiber.StatusForbidden, "Origin not allowed")
}

// validateAPIKey validates the API key and its permissions
func validateAPIKey(c fiber.Ctx, db *gorm.DB, projectID string, channelName *string) (*models.APIKey, string, error) {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return nil, "", fiber.NewError(fiber.StatusUnauthorized, "Missing API key")
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return nil, "", fiber.NewError(fiber.StatusUnauthorized, "Invalid authorization header format")
	}

	providedKey := parts[1]

	// Find API keys for the project
	var keys []models.APIKey
	if err := db.Where("project_id = ?", projectID).Find(&keys).Error; err != nil {
		return nil, "", fiber.NewError(fiber.StatusInternalServerError, "Failed to validate API key")
	}

	// Get scope
	resource, scope := getRequiredScope(c.Method(), c.Path())

	var channelID string
	var err error
	if channelName != nil && resource == "event" {
		var channel models.EventChannel
		err = db.Where("name = ? AND project_id = ?", *channelName, projectID).First(&channel).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, "", fiber.NewError(fiber.StatusForbidden, "event channel not found or access denied")
			}
			return nil, "", fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("failed to verify event channel access: %s", err.Error()))
		}
		channelID = channel.ID
	}

	// Verify the provided key
	for i := range keys {
		if keys[i].VerifyKey(providedKey) {
			if !hasScope(keys[i].Scopes, scope) {
				return nil, "", fiber.NewError(fiber.StatusForbidden, "Insufficient permissions")
			}
			return &keys[i], channelID, nil
		}
	}

	return nil, "", fiber.NewError(fiber.StatusUnauthorized, "Invalid API key")
}

// APIAuth middleware checks for valid API key and permissions
func APIAuth(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		// Handle preflight requests
		if c.Method() == "OPTIONS" {
			if err := validatePreflightOrigin(c, db); err != nil {
				return c.Status(err.(*fiber.Error).Code).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
			return c.SendStatus(fiber.StatusOK)
		}

		// TODO: Potentially do allowed ip checks here
		// Validate origin and get project ID
		projectID, channelName, err := validateOrigin(c, db)
		if err != nil {
			return c.Status(err.(*fiber.Error).Code).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		// Validate API key
		apiKey, channelID, err := validateAPIKey(c, db, projectID, channelName)
		if err != nil {
			return c.Status(err.(*fiber.Error).Code).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		// Store validated data in context
		c.Locals("api_key", apiKey)
		c.Locals("project_id", projectID)
		c.Locals("channel_id", channelID)

		return c.Next()
	}
}

func getRequiredScope(method, path string) (string, string) {
	parts := strings.Split(path, "/")
	parts = slices.DeleteFunc(parts, func(s string) bool { return s == "" })
	if len(parts) < 3 {
		return "", ""
	}

	// Get resource from path
	resource := parts[2]

	// Determine scope based on resource and method
	var scope string
	switch resource {
	case "event":
		if method == "POST" {
			scope = models.ScopeEventsWrite
		} else {
			scope = models.ScopeEventsRead
		}
	case "app":
		if method == "POST" {
			scope = models.ScopeAppLogsWrite
		} else {
			scope = models.ScopeAppLogsRead
		}
	case "request":
		if method == "POST" {
			scope = models.ScopeRequestWrite
		} else {
			scope = models.ScopeRequestRead
		}
	case "metric":
		if method == "POST" {
			scope = models.ScopeMetricsWrite
		} else {
			scope = models.ScopeMetricsRead
		}
	case "trace":
		if method == "POST" {
			scope = models.ScopeTracesWrite
		} else {
			scope = models.ScopeTracesRead
		}
	default:
		return resource, ""
	}

	return resource, scope
}

func hasScope(scopes []string, requiredScope string) bool {
	// Check for specific scope
	for _, scope := range scopes {
		if scope == requiredScope {
			return true
		}
	}

	return false
}
