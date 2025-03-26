package auth

import (
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

// UpdateUserInput represents the input for updating a user
type UpdateUserInput struct {
	Name         *string `json:"name,omitempty"`
	Image        *string `json:"image,omitempty"`
	HasOnboarded *bool   `json:"has_onboarded,omitempty"`
}

func (u UpdateUserInput) Validate() error {
	return validation.ValidateStruct(&u,
		validation.Field(&u.Name, validation.When(u.Name != nil, validation.Length(1, 255))),
		validation.Field(&u.Image, validation.When(u.Image != nil, validation.Length(1, 255))),
	)
}

// UpdateUser updates the current user's information
func (h *AuthHandler) UpdateUser(c fiber.Ctx) error {
	session := c.Locals("session").(storage.Session)

	var input UpdateUserInput
	if err := c.Bind().Body(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := input.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": err.Error(),
		})
	}

	var user models.User
	if err := h.db.First(&user, "id = ?", session.UserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user",
		})
	}

	// Update fields only if they are provided
	if input.Name != nil {
		user.Name = *input.Name
	}
	if input.Image != nil {
		if *input.Image != "" {
			user.Image.Valid = true
			user.Image.String = *input.Image
		} else {
			user.Image.Valid = false
		}
	}
	if input.HasOnboarded != nil {
		user.HasOnboarded = *input.HasOnboarded
	}

	if err := h.db.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update user",
		})
	}

	return c.JSON(user)
}
