package middleware

import (
	"fmt"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/ted-too/logsicle/internal/config"
	"github.com/ted-too/logsicle/internal/integrations/logto"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

func AuthMiddleware(cfg *config.Config, db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		session := session.FromContext(c)
		if session == nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to get session",
			})
		}

		logto := logto.NewClient(cfg, session)
		isAuthenticated := logto.IsAuthenticated()

		if !isAuthenticated {
			fmt.Printf("Unauthorized access attempt to path: %s\n", c.Path())
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "Unauthorized",
			})
		}

		idTokenClaims, err := logto.GetIdTokenClaims()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to get token claims",
				"error":   err.Error(),
			})
		}

		c.Locals("logto-id", idTokenClaims.Sub)

		var user models.User
		if err := db.Where("logto_id = ?", idTokenClaims.Sub).First(&user).Error; err != nil {
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
