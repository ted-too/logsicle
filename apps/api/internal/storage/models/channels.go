package models

import (
	"database/sql"
	"encoding/json"
	"strconv"

	"github.com/gosimple/slug"
	"github.com/lib/pq"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"gorm.io/gorm"
)

type EventChannel struct {
	storage.BaseModel
	Description    sql.NullString `json:"-"`
	Color          sql.NullString `json:"-"`
	RetentionDays  sql.NullInt16  `json:"-"`
	ProjectID      string         `gorm:"uniqueIndex:idx_event_channels_project_id_name;not null" json:"project_id"`
	Name           string         `gorm:"uniqueIndex:idx_event_channels_project_id_name;not null" json:"name"`
	Slug           string         `gorm:"not null;unique" json:"slug"`
	RequiredTags   pq.StringArray `gorm:"type:text[]" json:"required_tags"`
	MetadataSchema sql.NullString `gorm:"type:jsonb" json:"-"` // JSON Schema for metadata validation
	Project        *Project       `json:"project,omitempty"`
}

func (ec EventChannel) MarshalJSON() ([]byte, error) {
	// Get the base model fields
	baseJSON, err := json.Marshal(ec.BaseModel)
	if err != nil {
		return nil, err
	}

	// Unmarshal into a map to combine with other fields
	var result map[string]interface{}
	if err := json.Unmarshal(baseJSON, &result); err != nil {
		return nil, err
	}

	// Add the nullable fields from BaseChannel
	result["description"] = nil
	if ec.Description.Valid {
		result["description"] = ec.Description.String
	}

	result["color"] = nil
	if ec.Color.Valid {
		result["color"] = ec.Color.String
	}

	result["retention_days"] = nil
	if ec.RetentionDays.Valid {
		result["retention_days"] = ec.RetentionDays.Int16
	}

	// Add EventChannel specific fields
	result["project_id"] = ec.ProjectID
	result["name"] = ec.Name
	result["slug"] = ec.Slug
	result["required_tags"] = ec.RequiredTags

	// Handle MetadataSchema as raw JSON
	result["metadata_schema"] = nil
	if ec.MetadataSchema.Valid {
		var jsonSchema interface{}
		if err := json.Unmarshal([]byte(ec.MetadataSchema.String), &jsonSchema); err != nil {
			return nil, err
		}
		result["metadata_schema"] = jsonSchema
	}

	return json.Marshal(result)
}

func (c *EventChannel) BeforeCreate(tx *gorm.DB) error {
	if c.BaseModel.ID == "" {
		id, err := typeid.New[EventChannelID]()
		if err != nil {
			return err
		}
		c.BaseModel.ID = id.String()
	}

	// Generate initial slug from name
	c.Slug = slug.Make(c.Name)

	var count int64
	if err := tx.Model(&EventChannel{}).Where("project_id = ? AND slug = ?", c.ProjectID, c.Slug).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		c.Slug = c.Slug + "-" + strconv.FormatInt(count+1, 10)
	}

	return nil
}
