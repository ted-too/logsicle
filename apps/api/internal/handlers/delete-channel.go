package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

func (h *ChannelsHandler) DeleteChannel(c fiber.Ctx) error {
	projectID := c.Params("projectId")
	channelType := ChannelType(c.Params("type"))
	channelID := c.Params("id")
	userID := c.Locals("user-id").(string)

	// Verify project access
	var project models.Project
	if err := h.db.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"message": "Project not found or access denied",
				"error":   err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to verify project access",
			"error":   err.Error(),
		})
	}

	switch channelType {
	case EventChannel:
		result := h.db.Unscoped().Where("id = ? AND project_id = ?", channelID, projectID).Delete(&models.EventChannel{})
		if result.Error != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to delete channel",
				"error":   result.Error.Error(),
			})
		}
		if result.RowsAffected == 0 {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"message": "Channel not found",
			})
		}

		return c.SendStatus(fiber.StatusNoContent)

	case AppLogChannel:
		result := h.db.Unscoped().Where("id = ? AND project_id = ?", channelID, projectID).Delete(&models.AppLogChannel{})
		if result.Error != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to delete channel",
				"error":   result.Error.Error(),
			})
		}
		if result.RowsAffected == 0 {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"message": "Channel not found",
			})
		}

		return c.SendStatus(fiber.StatusNoContent)

	case RequestChannel:
		result := h.db.Unscoped().Where("id = ? AND project_id = ?", channelID, projectID).Delete(&models.RequestLogChannel{})
		if result.Error != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to delete channel",
				"error":   result.Error.Error(),
			})
		}
		if result.RowsAffected == 0 {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"message": "Channel not found",
			})
		}

		return c.SendStatus(fiber.StatusNoContent)

	case TraceChannel:
		result := h.db.Unscoped().Where("id = ? AND project_id = ?", channelID, projectID).Delete(&models.TraceChannel{})
		if result.Error != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to delete channel",
				"error":   result.Error.Error(),
			})
		}
		if result.RowsAffected == 0 {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"message": "Channel not found",
			})
		}

		return c.SendStatus(fiber.StatusNoContent)

	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid channel type",
			"error":   fmt.Sprintf("Channel type '%s' is not supported", channelType),
		})
	}
}
