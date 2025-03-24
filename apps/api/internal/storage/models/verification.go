package models

import (
	"time"

	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"gorm.io/gorm"
)

type Verification struct {
	storage.BaseModel
	Identifier string    `gorm:"not null" json:"identifier"` // Email or user ID being verified
	Value      string    `gorm:"not null" json:"-"`          // Verification token/code
	ExpiresAt  time.Time `gorm:"not null" json:"expires_at"`
}

func (v *Verification) BeforeCreate(tx *gorm.DB) error {
	if v.BaseModel.ID == "" {
		id, err := typeid.New[VerificationID]()
		if err != nil {
			return err
		}
		v.BaseModel.ID = id.String()
	}
	return nil
}
