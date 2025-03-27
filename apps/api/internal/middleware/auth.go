package middleware

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

// AuthMiddleware creates a middleware for protecting routes
func AuthMiddleware(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		session := session.FromContext(c)

		userSession, ok := session.Get(storage.SessionDataKey).(storage.Session)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Not authenticated",
			})
		}

		// Get user
		var user models.User
		if err := db.Preload("Organizations").Where("id = ?", userSession.UserID).First(&user).Error; err != nil {
			session.Delete(storage.SessionDataKey)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User not found",
			})
		}

		// Store user in context
		c.Locals("user", &user)
		c.Locals("session", userSession)

		return c.Next()
	}
}

// RequireActiveOrganization creates a middleware that requires an active organization
func RequireActiveOrganization(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		session := session.FromContext(c)
		userSession, ok := session.Get(storage.SessionDataKey).(storage.Session)
		if !ok {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get session",
			})
		}

		if userSession.ActiveOrganization == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "No active organization selected",
			})
		}

		// Verify user belongs to organization
		var membership models.TeamMembership
		if err := db.Where("user_id = ? AND organization_id = ?", userSession.UserID, userSession.ActiveOrganization).First(&membership).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Not a member of this organization",
			})
		}

		// Store membership in context
		c.Locals("membership", &membership)

		projectID := c.Params("id")
		if projectID != "" {
			// Verify project belongs to organization
			var count int64
			if err := db.Model(&models.Project{}).Where("id = ? AND organization_id = ?", projectID, userSession.ActiveOrganization).Count(&count).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to verify project access",
				})
			}

			if count == 0 {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "Project not found or access denied",
				})
			}
		}

		return c.Next()
	}
}

// RequireRole creates a middleware that requires specific roles
func RequireRole(roles ...models.Role) fiber.Handler {
	return func(c fiber.Ctx) error {
		membership, ok := c.Locals("membership").(*models.TeamMembership)
		if !ok {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Membership not found in context",
			})
		}

		// Check if user has any of the required roles
		hasRole := false
		for _, role := range roles {
			if membership.Role == role {
				hasRole = true
				break
			}
		}

		if !hasRole {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Insufficient permissions",
			})
		}

		return c.Next()
	}
}
