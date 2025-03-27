package models

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"gorm.io/gorm"
)

type User struct {
	storage.BaseModel
	Name          string         `gorm:"not null" json:"name"`
	Email         string         `gorm:"uniqueIndex;not null" json:"email"`
	EmailVerified bool           `gorm:"default:false" json:"email_verified"`
	Image         sql.NullString `json:"image"`
	HasOnboarded  bool           `gorm:"default:false" json:"has_onboarded"`
	LastLoginAt   time.Time      `json:"last_login_at"`
	Organizations []Organization `json:"organizations" gorm:"many2many:team_memberships"`
}

type OtherUser struct {
	storage.BaseModel
	Name  string         `json:"name"`
	Image sql.NullString `json:"image"`
	Email string         `json:"email"`
}

func (u OtherUser) MarshalJSON() ([]byte, error) {
	baseJSON, err := json.Marshal(u.BaseModel)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(baseJSON, &result); err != nil {
		return nil, err
	}

	result["name"] = u.Name
	result["email"] = u.Email

	// Handle Image
	result["image"] = nil
	if u.Image.Valid {
		result["image"] = u.Image.String
	}

	return json.Marshal(result)
}

func (u User) MarshalJSON() ([]byte, error) {
	baseJSON, err := json.Marshal(u.BaseModel)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(baseJSON, &result); err != nil {
		return nil, err
	}

	result["name"] = u.Name
	result["email"] = u.Email
	result["email_verified"] = u.EmailVerified
	result["has_onboarded"] = u.HasOnboarded
	result["last_login_at"] = u.LastLoginAt
	result["organizations"] = u.Organizations

	// Handle Image
	result["image"] = nil
	if u.Image.Valid {
		result["image"] = u.Image.String
	}

	return json.Marshal(result)
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.BaseModel.ID == "" {
		id, err := typeid.New[UserID]()
		if err != nil {
			return err
		}
		u.BaseModel.ID = id.String()
	}
	return nil
}
