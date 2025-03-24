package models

import (
	"encoding/json"
	"strconv"

	"github.com/gosimple/slug"
	"github.com/lib/pq"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"gorm.io/gorm"
)

type Project struct {
	storage.BaseModel
	CreatedByID      string         `gorm:"index;not null" json:"created_by_id"` // User ID who created the project
	CreatedBy        User           `json:"created_by" gorm:"foreignKey:CreatedByID"`
	OrganizationID   string         `gorm:"index;not null" json:"organization_id"`
	Name             string         `gorm:"not null" json:"name"`
	Slug             string         `gorm:"not null;unique" json:"slug"`
	AllowedOrigins   pq.StringArray `gorm:"type:text[]" json:"allowed_origins"`
	LogRetentionDays int            `gorm:"default:30" json:"log_retention_days"`
	EventChannels    []EventChannel `json:"event_channels"`
	APIKeys          []APIKey       `json:"api_keys"`
}

func (p *Project) BeforeCreate(tx *gorm.DB) (err error) {
	if p.BaseModel.ID == "" {
		id, err := typeid.New[ProjectID]()
		if err != nil {
			return err
		}
		p.BaseModel.ID = id.String()
	}

	// Generate initial slug from name
	p.Slug = slug.Make(p.Name)

	var count int64
	if err := tx.Model(&Project{}).Where("slug = ?", p.Slug).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		p.Slug = p.Slug + "-" + strconv.FormatInt(count+1, 10)
	}

	return nil
}

// TODO: There's probably a better way to do this
func (p Project) MarshalJSON() ([]byte, error) {
	baseJSON, err := json.Marshal(p.BaseModel)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(baseJSON, &result); err != nil {
		return nil, err
	}

	result["created_by_id"] = p.CreatedByID
	result["created_by"] = OtherUser{
		BaseModel: p.CreatedBy.BaseModel,
		Name:      p.CreatedBy.Name,
		Email:     p.CreatedBy.Email,
		Image:     p.CreatedBy.Image,
	}
	result["organization_id"] = p.OrganizationID
	result["name"] = p.Name
	result["slug"] = p.Slug
	result["allowed_origins"] = p.AllowedOrigins
	result["log_retention_days"] = p.LogRetentionDays
	result["event_channels"] = p.EventChannels
	result["api_keys"] = p.APIKeys

	return json.Marshal(result)
}
