package models

import (
	"time"

	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"gorm.io/gorm"
)

type Account struct {
	storage.BaseModel
	AccountID             string    `gorm:"not null" json:"account_id"`    // External account ID from provider
	ProviderID            string    `gorm:"not null" json:"provider_id"`   // Provider name (google, github)
	UserID                string    `gorm:"index;not null" json:"user_id"` // User this account belongs to
	User                  *User     `json:"user" gorm:"foreignKey:UserID"`
	AccessToken           string    `json:"-"`                        // OAuth access token
	RefreshToken          string    `json:"-"`                        // OAuth refresh token
	IDToken               string    `json:"-"`                        // OAuth ID token
	AccessTokenExpiresAt  time.Time `json:"access_token_expires_at"`  // When the access token expires
	RefreshTokenExpiresAt time.Time `json:"refresh_token_expires_at"` // When the refresh token expires
	Scope                 string    `json:"scope"`                    // OAuth scopes
	Password              string    `json:"-"`                        // Hashed password for password auth
}

func (a *Account) BeforeCreate(tx *gorm.DB) error {
	if a.BaseModel.ID == "" {
		id, err := typeid.New[AccountID]()
		if err != nil {
			return err
		}
		a.BaseModel.ID = id.String()
	}
	return nil
}
