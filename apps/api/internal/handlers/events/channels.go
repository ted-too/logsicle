package events

import (
	"database/sql"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

// Base channel input struct
type CreateChannelInput struct {
	Name          string  `json:"name"`
	Description   *string `json:"description"`
	Color         *string `json:"color"`
	RetentionDays *uint8  `json:"retention_days"`
}

func (c CreateChannelInput) Validate() error {
	return validation.ValidateStruct(&c,
		validation.Field(&c.Name,
			validation.Required,
			validation.Length(1, 255),
		),
		validation.Field(&c.RetentionDays,
			validation.Min(uint8(1)),
			validation.Max(uint8(90)),
		),
	)
}

// Event channel specific input
type CreateEventChannelInput struct {
	CreateChannelInput
	RequiredTags   []string `json:"required_tags"`
	MetadataSchema *string  `json:"metadata_schema"`
}

func (c CreateEventChannelInput) ValidateAndCreate(projectID string) (*models.EventChannel, error) {
	if err := c.Validate(); err != nil {
		return nil, err
	}

	id, err := typeid.New[models.EventChannelID]()
	if err != nil {
		return nil, err
	}

	// Convert *uint8 to sql.NullInt16
	var retentionDays sql.NullInt16
	if c.RetentionDays != nil {
		retentionDays = sql.NullInt16{
			Int16: int16(*c.RetentionDays),
			Valid: true,
		}
	}

	// Convert string to sql.NullString
	var color sql.NullString
	if c.Color != nil {
		color = sql.NullString{
			String: *c.Color,
			Valid:  true,
		}
	}
	var description sql.NullString
	if c.Description != nil {
		description = sql.NullString{
			String: *c.Description,
			Valid:  true,
		}
	}
	var metadataSchema sql.NullString
	if c.MetadataSchema != nil {
		metadataSchema = sql.NullString{
			String: *c.MetadataSchema,
			Valid:  true,
		}
	}

	return &models.EventChannel{
		BaseModel:      storage.BaseModel{ID: id.String()},
		Description:    description,
		Color:          color,
		RetentionDays:  retentionDays,
		ProjectID:      projectID,
		Name:           c.Name,
		RequiredTags:   c.RequiredTags,
		MetadataSchema: metadataSchema,
	}, nil
}

func (h *EventsHandler) CreateChannel(c fiber.Ctx) error {
	projectID := c.Params("id")

	var project models.Project
	if err := h.db.Where("id = ?", projectID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"message": "Project not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch project",
			"error":   err.Error(),
		})
	}

	input := new(CreateEventChannelInput)
	if err := c.Bind().JSON(input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	channel, err := input.ValidateAndCreate(projectID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Validation failed",
			"error":   err.Error(),
		})
	}

	// If retention days matches project default, set it to null
	if channel.RetentionDays.Valid && int16(project.LogRetentionDays) == channel.RetentionDays.Int16 {
		channel.RetentionDays = sql.NullInt16{Valid: false}
	}

	if err := h.db.Create(channel).Error; err != nil {
		// Check for unique constraint violation
		if strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "Duplicate entry") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"message": "Channel with this name already exists in the project",
				"error":   "duplicate_channel_name",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to create channel",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(channel)
}

func (h *EventsHandler) DeleteChannel(c fiber.Ctx) error {
	projectID := c.Params("id")
	channelID := c.Params("id")

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
}

// Update channel input structs
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

type UpdateEventChannelInput struct {
	UpdateChannelInput
	RequiredTags   *[]string `json:"required_tags"`
	MetadataSchema *string   `json:"metadata_schema"`
}

func (h *EventsHandler) UpdateChannel(c fiber.Ctx) error {
	projectID := c.Params("id")
	channelID := c.Params("id")

	var project models.Project
	if err := h.db.Where("id = ?", projectID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"message": "Project not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch project",
			"error":   err.Error(),
		})
	}

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
		channel.Description = sql.NullString{String: *input.Description, Valid: true}
	}
	if input.Color != nil {
		channel.Color = sql.NullString{String: *input.Color, Valid: true}
	}
	if input.RetentionDays != nil {
		if int16(*input.RetentionDays) == int16(project.LogRetentionDays) {
			channel.RetentionDays = sql.NullInt16{Valid: false}
		} else {
			channel.RetentionDays = sql.NullInt16{Int16: int16(*input.RetentionDays), Valid: true}
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
}

func (h *EventsHandler) GetEventChannels(c fiber.Ctx) error {
	projectID := c.Params("id")

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
func (h *EventsHandler) GetEventChannel(c fiber.Ctx) error {
	projectID := c.Params("id")
	channelID := c.Params("channelId")

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
