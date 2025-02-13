package models

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base32"
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"golang.org/x/crypto/argon2"
	"gorm.io/gorm"
)

type UserPrefix struct{}

func (UserPrefix) Prefix() string {
	return "user"
}

type UserID = typeid.Sortable[UserPrefix]

type User struct {
	storage.BaseModel
	ExternalOauthID string    `gorm:"uniqueIndex;not null" json:"-"`
	Email           string    `gorm:"uniqueIndex" json:"email"`
	Name            string    `json:"name"`
	HasOnboarded    bool      `gorm:"default:false" json:"has_onboarded"`
	LastLoginAt     time.Time `json:"last_login_at"`
	Projects        []Project `json:"projects"`
}

type ProjectPrefix struct{}

func (ProjectPrefix) Prefix() string {
	return "proj"
}

type ProjectID = typeid.Sortable[ProjectPrefix]

type Project struct {
	storage.BaseModel
	UserID           string         `gorm:"index;not null" json:"user_id"`
	Name             string         `gorm:"not null" json:"name"`
	AllowedOrigins   pq.StringArray `gorm:"type:text[]" json:"allowed_origins"`
	LogRetentionDays int            `gorm:"default:30" json:"log_retention_days"`
	EventChannels    []EventChannel `json:"event_channels"`
	APIKeys          []ApiKey       `json:"api_keys"` // Multiple API keys per project
}

type ApiKeyPrefix struct{}

func (ApiKeyPrefix) Prefix() string {
	return "key"
}

type ApiKeyID = typeid.Sortable[ApiKeyPrefix]

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

type ApiKey struct {
	storage.BaseModel
	ProjectID string         `gorm:"index;not null" json:"project_id"`
	Name      string         `gorm:"not null" json:"name"`
	Key       string         `gorm:"uniqueIndex;not null" json:"-"` // Hashed key, hidden from JSON
	MaskedKey string         `gorm:"not null" json:"key"`           // Stored masked version for display
	Scopes    pq.StringArray `gorm:"type:text[]" json:"scopes"`
}

// Argon2 parameters
type params struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
	saltLength  uint32
	keyLength   uint32
}

var defaultParams = &params{
	memory:      64 * 1024, // 64MB
	iterations:  3,
	parallelism: 2,
	saltLength:  16,
	keyLength:   32,
}

// generateSalt creates a random salt of the specified length
func generateSalt(n uint32) ([]byte, error) {
	salt := make([]byte, n)
	_, err := rand.Read(salt)
	return salt, err
}

// hashKey hashes an API key using Argon2id
func hashKey(key string, p *params) (string, error) {
	salt, err := generateSalt(p.saltLength)
	if err != nil {
		return "", err
	}

	hash := argon2.IDKey(
		[]byte(key),
		salt,
		p.iterations,
		p.memory,
		p.parallelism,
		p.keyLength,
	)

	// Encode as base64
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	// Format: $argon2id$v=19$m=65536,t=3,p=2$<salt>$<hash>
	encodedHash := fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		p.memory,
		p.iterations,
		p.parallelism,
		b64Salt,
		b64Hash,
	)

	return encodedHash, nil
}

// verifyKey checks if a provided key matches the hash
func verifyKey(providedKey, encodedHash string) (bool, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return false, fmt.Errorf("invalid hash format")
	}

	var p params
	_, err := fmt.Sscanf(
		parts[3],
		"m=%d,t=%d,p=%d",
		&p.memory,
		&p.iterations,
		&p.parallelism,
	)
	if err != nil {
		return false, err
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, err
	}

	decodedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, err
	}

	p.keyLength = uint32(len(decodedHash))

	// Compute hash of provided key
	computedHash := argon2.IDKey(
		[]byte(providedKey),
		salt,
		p.iterations,
		p.memory,
		p.parallelism,
		p.keyLength,
	)

	// Compare in constant time
	return subtle.ConstantTimeCompare(decodedHash, computedHash) == 1, nil
}

// Hooks
func (k *ApiKey) BeforeCreate(tx *gorm.DB) error {
	// Create masked version for display
	if len(k.Key) > 12 {
		k.MaskedKey = k.Key[:8] + "..." + k.Key[len(k.Key)-3:]
	} else {
		k.MaskedKey = k.Key
	}

	// Hash the key using Argon2
	hashedKey, err := hashKey(k.Key, defaultParams)
	if err != nil {
		return err
	}
	k.Key = hashedKey

	return nil
}

// Method to verify an API key
func (k *ApiKey) VerifyKey(providedKey string) bool {
	match, err := verifyKey(providedKey, k.Key)
	if err != nil {
		return false
	}
	return match
}

func GenerateAPIKey() (string, error) {
	// Generate 32 bytes of random data (256 bits)
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	// Create a prefix to identify the key type
	prefix := "lsk-v1-" // logsicle key prefix

	// Encode the random bytes to base32 (more readable than base64, no special chars)
	// Use base32.NoPadding to avoid the trailing '=' characters
	encoded := strings.ToLower(base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(randomBytes))

	// Combine prefix and encoded bytes
	apiKey := prefix + encoded

	return apiKey, nil
}
