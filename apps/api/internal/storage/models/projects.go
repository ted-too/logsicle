package models

import (
	"strconv"

	"github.com/gosimple/slug"
	"github.com/lib/pq"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"gorm.io/gorm"
)

type ProjectPrefix struct{}

func (ProjectPrefix) Prefix() string {
	return "proj"
}

type ProjectID = typeid.Sortable[ProjectPrefix]

type Project struct {
	storage.BaseModel
	UserID           string         `gorm:"index;not null" json:"user_id"`
	OrganizationID   string         `gorm:"index;not null" json:"organization_id"`
	Name             string         `gorm:"not null" json:"name"`
	Slug             string         `gorm:"not null;unique" json:"slug"`
	AllowedOrigins   pq.StringArray `gorm:"type:text[]" json:"allowed_origins"`
	LogRetentionDays int            `gorm:"default:30" json:"log_retention_days"`
	EventChannels    []EventChannel `json:"event_channels"`
	APIKeys          []ApiKey       `json:"api_keys"`
}

func (p *Project) BeforeCreate(tx *gorm.DB) (err error) {
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
