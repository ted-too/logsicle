package models

import (
	"crypto/rand"
	"encoding/base32"
	"fmt"
	"strings"

	"github.com/lib/pq"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/crypto"
	"github.com/ted-too/logsicle/internal/storage"
	"gorm.io/gorm"
)

// Define available scopes
const (
	ScopeAppLogsWrite = "app:write"
	ScopeAppLogsRead  = "app:read"
	ScopeRequestWrite = "request:write"
	ScopeRequestRead  = "request:read"
	ScopeMetricsWrite = "metrics:write"
	ScopeMetricsRead  = "metrics:read"
	ScopeTracesWrite  = "traces:write"
	ScopeTracesRead   = "traces:read"
	ScopeEventsWrite  = "events:write"
	ScopeEventsRead   = "events:read"
)

// APIKey represents an API key in the database
type APIKey struct {
	storage.BaseModel
	Name        string         `gorm:"not null" json:"name"`
	Key         string         `gorm:"uniqueIndex;not null" json:"-"` // Hashed key
	MaskedKey   string         `gorm:"not null" json:"key"`           // Masked version for display
	ProjectID   string         `gorm:"index;not null" json:"project_id"`
	Project     *Project       `json:"project" gorm:"foreignKey:ProjectID"`
	UserID      string         `gorm:"index;not null" json:"created_by"` // User who created the key
	User        *User          `json:"creator" gorm:"foreignKey:UserID"`
	ExpiresAt   *string        `json:"expires_at,omitempty"`
	LastUsedAt  *string        `json:"last_used_at,omitempty"`
	Permissions string         `json:"permissions"`
	Metadata    string         `json:"metadata"`
	Scopes      pq.StringArray `gorm:"type:text[]" json:"scopes"`
}

func (k *APIKey) BeforeCreate(tx *gorm.DB) error {
	if k.BaseModel.ID == "" {
		id, err := typeid.New[APIKeyID]()
		if err != nil {
			return err
		}
		k.BaseModel.ID = id.String()
	}

	// Create masked version for display
	if len(k.Key) > 12 {
		k.MaskedKey = k.Key[:8] + "..." + k.Key[len(k.Key)-3:]
	} else {
		k.MaskedKey = k.Key
	}

	// Hash the key
	hashedKey, err := crypto.HashPassword(k.Key, crypto.DefaultParams)
	if err != nil {
		return err
	}
	k.Key = hashedKey

	return nil
}

// VerifyKey verifies if a provided key matches
func (k *APIKey) VerifyKey(providedKey string) bool {
	match, err := crypto.VerifyPassword(providedKey, k.Key)
	if err != nil {
		return false
	}
	return match
}

// GenerateAPIKey generates a new API key
func GenerateAPIKey() (string, error) {
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	prefix := "lsk-v1-"
	encoded := strings.ToLower(base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(randomBytes))
	apiKey := prefix + encoded

	return apiKey, nil
}
