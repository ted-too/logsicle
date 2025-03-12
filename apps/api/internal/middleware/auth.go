package middleware

import (
	"log"
	"strings"

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

		isAuthenticated := oidcClient.IsAuthenticated()

		if !isAuthenticated {
			log.Printf("Unauthorized access attempt to path: %s", c.Path())
			// Redirect to sign-in for browser requests
			if strings.Contains(c.Get("Accept"), "text/html") {
				return c.Redirect().Status(fiber.StatusTemporaryRedirect).To("/v1/auth/sign-in")
			}
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "Unauthorized",
			})
		}

		idTokenClaims, err := oidcClient.GetIDTokenClaims(c.Context())
		if err != nil {
			log.Printf("Failed to get token claims: %v", err)
			// If token refresh failed, redirect to sign-in for browser requests
			if strings.Contains(err.Error(), "failed to refresh token") && strings.Contains(c.Get("Accept"), "text/html") {
				return c.Redirect().Status(fiber.StatusTemporaryRedirect).To("/v1/auth/sign-in")
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to get token claims",
				"error":   err.Error(),
			})
		}

		c.Locals("oauth-id", idTokenClaims.Sub)

		var user models.User
		if err := db.Where("external_oauth_id = ?", idTokenClaims.Sub).First(&user).Error; err != nil {
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
