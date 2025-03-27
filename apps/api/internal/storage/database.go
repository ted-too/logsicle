package storage

import (
	"context"
	"fmt"
	"time"

	"github.com/ted-too/logsicle/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Base model with string ID
type BaseModel struct {
	ID        string         `gorm:"primaryKey;not null" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}

// User session data
type Session struct {
	UserID             string    `json:"user_id"`             // User this session belongs to
	IPAddress          string    `json:"ip_address"`          // IP address of the client
	UserAgent          string    `json:"user_agent"`          // User agent of the client
	ActiveOrganization string    `json:"active_organization"` // Currently active organization
	ExpiresAt          time.Time `json:"expires_at"`          // When the session expires
}

const (
	SessionDataKey = "user"
)

func New(cfg *config.Config) (*gorm.DB, error) {
	dsn := cfg.Storage.Dsn

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get generic database object
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	// Set connection pool parameters
	sqlDB.SetMaxOpenConns(cfg.Storage.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.Storage.MaxIdleConns)

	// Parse duration from config
	duration, err := time.ParseDuration(cfg.Storage.ConnMaxLifetime)
	if err != nil {
		return nil, fmt.Errorf("invalid connection max lifetime: %w", err)
	}
	sqlDB.SetConnMaxLifetime(duration)

	// Verify connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	return db, nil
}
