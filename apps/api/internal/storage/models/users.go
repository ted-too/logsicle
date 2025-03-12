package models

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
)

type UserPrefix struct{}

func (UserPrefix) Prefix() string {
	return "user"
}

type UserID = typeid.Sortable[UserPrefix]

type User struct {
	storage.BaseModel
	ExternalOauthID string         `gorm:"uniqueIndex;not null" json:"-"`
	Email           string         `gorm:"uniqueIndex" json:"email"`
	Name            string         `json:"name"`
	AvatarURL       sql.NullString `json:"-"`
	HasOnboarded    bool           `gorm:"default:false" json:"has_onboarded"`
	LastLoginAt     time.Time      `json:"last_login_at"`
	Projects        []Project      `json:"projects"`
}

func (u User) MarshalJSON() ([]byte, error) {
	// Get the base model fields
	baseJSON, err := json.Marshal(u.BaseModel)
	if err != nil {
		return nil, err
	}

	// Unmarshal into a map to combine with other fields
	var result map[string]interface{}
	if err := json.Unmarshal(baseJSON, &result); err != nil {
		return nil, err
	}

	// Add the fields
	result["email"] = u.Email
	result["name"] = u.Name
	result["has_onboarded"] = u.HasOnboarded
	result["last_login_at"] = u.LastLoginAt
	result["projects"] = u.Projects

	// Handle AvatarURL
	result["avatar_url"] = nil
	if u.AvatarURL.Valid {
		result["avatar_url"] = u.AvatarURL.String
	}

	return json.Marshal(result)
}
