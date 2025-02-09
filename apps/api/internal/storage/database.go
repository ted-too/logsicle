package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/ted-too/logsicle/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Base model with string ID
type BaseModel struct {
	ID        string         `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}

// Base channel struct with common fields
type BaseChannel struct {
	BaseModel
	Description   sql.NullString `json:"-"`
	Color         sql.NullString `json:"-"`
	RetentionDays sql.NullInt16  `json:"-"`
}

// MarshalJSON implements custom JSON marshaling
func (bc BaseChannel) MarshalJSON() ([]byte, error) {
	// Get the base model fields
	baseJSON, err := json.Marshal(bc.BaseModel)
	if err != nil {
		return nil, err
	}

	// Unmarshal into a map to combine with other fields
	var result map[string]interface{}
	if err := json.Unmarshal(baseJSON, &result); err != nil {
		return nil, err
	}

	// Add the nullable fields
	result["description"] = nil
	if bc.Description.Valid {
		result["description"] = bc.Description.String
	}

	result["color"] = nil
	if bc.Color.Valid {
		result["color"] = bc.Color.String
	}

	result["retention_days"] = nil
	if bc.RetentionDays.Valid {
		result["retention_days"] = bc.RetentionDays.Int16
	}

	return json.Marshal(result)
}

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
