// apps/api/internal/handlers/channels.go

package handlers

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

type ChannelsHandler struct {
	db *gorm.DB
}

func NewChannelsHandler(db *gorm.DB) *ChannelsHandler {
	return &ChannelsHandler{db: db}
}

func (h *ChannelsHandler) GetEventChannels(c fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("user-id").(string)

	// Verify project access
	var project models.Project
	if err := h.db.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Project not found or access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to verify project access",
		})
	}

	// Get all event channels for the project
	var channels []models.EventChannel
	if err := h.db.Where("project_id = ?", projectID).Find(&channels).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch event channels",
		})
	}

	return c.JSON(channels)
}

// Optional: Add a function to get a single channel by ID
func (h *ChannelsHandler) GetEventChannel(c fiber.Ctx) error {
	projectID := c.Params("projectId")
	channelID := c.Params("channelId")
	userID := c.Locals("user-id").(string)

	// Verify project access
	var project models.Project
	if err := h.db.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Project not found or access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to verify project access",
		})
	}

	// Get the specific channel
	var channel models.EventChannel
	if err := h.db.Where("id = ? AND project_id = ?", channelID, projectID).First(&channel).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Channel not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch channel",
		})
	}

	return c.JSON(channel)
}
