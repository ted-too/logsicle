package handlers

import (
	"database/sql"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

// Base update channel input struct
type UpdateChannelInput struct {
	Name          *string `json:"name"`
	Description   *string `json:"description"`
	Color         *string `json:"color"`
	RetentionDays *uint8  `json:"retention_days"`
}

func (u UpdateChannelInput) Validate() error {
	return validation.ValidateStruct(&u,
		validation.Field(&u.Name,
			validation.Required,
			validation.Length(1, 255),
		),
		validation.Field(&u.RetentionDays,
			validation.Min(uint8(1)),
			validation.Max(uint8(90)),
		),
	)
}

// Event channel specific update input
type UpdateEventChannelInput struct {
	UpdateChannelInput
	RequiredTags   *[]string `json:"required_tags"`
	MetadataSchema *string   `json:"metadata_schema"`
}

func (h *ChannelsHandler) UpdateChannel(c fiber.Ctx) error {
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

	// Handle different channel types
	switch channelType {
	case EventChannel:
		input := new(UpdateEventChannelInput)
		if err := c.Bind().JSON(input); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"message": "Invalid request body",
				"error":   err.Error(),
			})
		}

		if err := input.Validate(); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"message": "Validation failed",
				"error":   err.Error(),
			})
		}

		var channel models.EventChannel
		if err := h.db.Where("id = ? AND project_id = ?", channelID, projectID).First(&channel).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"message": "Channel not found",
					"error":   err.Error(),
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to fetch channel",
				"error":   err.Error(),
			})
		}

		// Update base fields
		if input.Name != nil {
			channel.Name = *input.Name
		}
		if input.Description != nil {
			channel.BaseChannel.Description = sql.NullString{String: *input.Description, Valid: true}
		}
		if input.Color != nil {
			channel.BaseChannel.Color = sql.NullString{String: *input.Color, Valid: true}
		}
		if input.RetentionDays != nil {
			if int16(*input.RetentionDays) == int16(project.LogRetentionDays) {
				channel.BaseChannel.RetentionDays = sql.NullInt16{Valid: false}
			} else {
				channel.BaseChannel.RetentionDays = sql.NullInt16{Int16: int16(*input.RetentionDays), Valid: true}
			}
		}

		// Update event-specific fields
		if input.RequiredTags != nil {
			channel.RequiredTags = *input.RequiredTags
		}
		if input.MetadataSchema != nil {
			channel.MetadataSchema = sql.NullString{String: *input.MetadataSchema, Valid: true}
		}

		if err := h.db.Save(&channel).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Failed to update channel",
				"error":   err.Error(),
			})
		}

		return c.JSON(channel)

	// Add similar cases for other channel types...
	case AppLogChannel:
		// Implementation for updating app log channel
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid channel type",
			"error":   fmt.Sprintf("Channel type '%s' is not supported", channelType),
		})
	case RequestChannel:
		// Implementation for updating request channel
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid channel type",
			"error":   fmt.Sprintf("Channel type '%s' is not supported", channelType),
		})
	case TraceChannel:
		// Implementation for updating trace channel
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid channel type",
			"error":   fmt.Sprintf("Channel type '%s' is not supported", channelType),
		})

	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid channel type",
			"error":   fmt.Sprintf("Channel type '%s' is not supported", channelType),
		})
	}
}
