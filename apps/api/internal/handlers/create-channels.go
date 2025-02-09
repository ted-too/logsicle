package handlers

import (
	"database/sql"
	"fmt"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

type ChannelType string

const (
	EventChannel   ChannelType = "event"
	AppLogChannel  ChannelType = "app"
	RequestChannel ChannelType = "request"
	TraceChannel   ChannelType = "trace"
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
		BaseChannel: storage.BaseChannel{
			BaseModel:     storage.BaseModel{ID: id.String()},
			Description:   description,
			Color:         color,
			RetentionDays: retentionDays,
		},
		ProjectID:      projectID,
		Name:           c.Name,
		RequiredTags:   c.RequiredTags,
		MetadataSchema: metadataSchema,
	}, nil
}

// App log channel specific input
type CreateAppLogChannelInput struct {
	CreateChannelInput
	AllowedLevels     []string `json:"allowed_levels"`
	RequireStackTrace bool     `json:"require_stack_trace"`
}

func (c CreateAppLogChannelInput) ValidateAndCreate(projectID string) (*models.AppLogChannel, error) {
	if err := c.Validate(); err != nil {
		return nil, err
	}

	id, err := typeid.New[models.AppLogChannelID]()
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

	return &models.AppLogChannel{
		BaseChannel: storage.BaseChannel{
			BaseModel:     storage.BaseModel{ID: id.String()},
			Description:   description,
			Color:         color,
			RetentionDays: retentionDays,
		},
		ProjectID:         projectID,
		Name:              c.Name,
		AllowedLevels:     c.AllowedLevels,
		RequireStackTrace: c.RequireStackTrace,
	}, nil
}

// Request log channel specific input
type CreateRequestChannelInput struct {
	CreateChannelInput
	CaptureRequestBody  bool    `json:"capture_request_body"`
	CaptureResponseBody bool    `json:"capture_response_body"`
	StatusCodeRanges    []int64 `json:"status_code_ranges"`
}

func (c CreateRequestChannelInput) ValidateAndCreate(projectID string) (*models.RequestLogChannel, error) {
	if err := c.Validate(); err != nil {
		return nil, err
	}

	id, err := typeid.New[models.RequestLogChannelID]()
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

	return &models.RequestLogChannel{
		BaseChannel: storage.BaseChannel{
			BaseModel:     storage.BaseModel{ID: id.String()},
			Description:   description,
			Color:         color,
			RetentionDays: retentionDays,
		},
		ProjectID:           projectID,
		Name:                c.Name,
		CaptureRequestBody:  c.CaptureRequestBody,
		CaptureResponseBody: c.CaptureResponseBody,
		StatusCodeRanges:    c.StatusCodeRanges,
	}, nil
}

// Trace channel specific input
type CreateTraceChannelInput struct {
	CreateChannelInput
	RequiredLabels []string `json:"required_labels"`
}

func (c CreateTraceChannelInput) ValidateAndCreate(projectID string) (*models.TraceChannel, error) {
	if err := c.Validate(); err != nil {
		return nil, err
	}

	id, err := typeid.New[models.TraceChannelID]()
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

	return &models.TraceChannel{
		BaseChannel: storage.BaseChannel{
			BaseModel:     storage.BaseModel{ID: id.String()},
			Description:   description,
			Color:         color,
			RetentionDays: retentionDays,
		},
		ProjectID:      projectID,
		Name:           c.Name,
		RequiredLabels: c.RequiredLabels,
	}, nil
}

func (h *ChannelsHandler) CreateChannel(c fiber.Ctx) error {
	projectID := c.Params("projectId")
	channelType := ChannelType(c.Params("type"))
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

	case AppLogChannel:
		input := new(CreateAppLogChannelInput)
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

	case RequestChannel:
		input := new(CreateAppLogChannelInput)
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

	case TraceChannel:
		input := new(CreateAppLogChannelInput)
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

	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid channel type",
			"error":   fmt.Sprintf("Channel type '%s' is not supported", channelType),
		})
	}
}
