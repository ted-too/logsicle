package middleware

import (
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/ted-too/logsicle/internal/config"
	"github.com/ted-too/logsicle/internal/integrations/oidc"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

func AuthMiddleware(cfg *config.Config, db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		session := session.FromContext(c)
		if session == nil {
			log.Printf("Session is nil in auth middleware")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to get session",
			})
		}

		oidcClient, err := oidc.NewClient(c.Context(), cfg, session)
		if err != nil {
			log.Printf("Failed to initialize OIDC client: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to initialize OIDC client",
				"error":   err.Error(),
			})
		}

		// Try to get token claims, which will handle refresh if needed
		claims, err := oidcClient.GetIDTokenClaims(c.Context())
		if err != nil {
			log.Printf("Authentication failed on path %s: %v", c.Path(), err)
			log.Printf("Headers: %v", c.GetReqHeaders())
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "Unauthorized",
			})
		}

		c.Locals("oauth-id", claims.Sub)

		var user models.User
		if err := db.Where("external_oauth_id = ?", claims.Sub).First(&user).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"message": "User not found",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to fetch user",
				"error":   err.Error(),
			})
		}

		c.Locals("user-id", user.ID)

		return c.Next()
	}
}
