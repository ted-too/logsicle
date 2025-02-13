package models

import (
	"encoding/json"
	"fmt"
	"time"
)

// Generic type used in redis queue and db processor
type LogEntry interface {
	GetProjectID() string
	GetLogType() string
}

func ParseTimestamp(timestamp interface{}) (time.Time, error) {
	if timestamp == nil {
		return time.Now(), nil
	}

	switch v := timestamp.(type) {
	case string:
		// Parse RFC3339 or similar string formats
		return time.Parse(time.RFC3339, v)
	case float64:
		// Handle Unix timestamp (either seconds or milliseconds)
		sec := int64(v)
		if sec > 1e11 { // Assuming milliseconds if very large
			sec /= 1000
		}
		return time.Unix(sec, 0), nil
	default:
		return time.Time{}, fmt.Errorf("unsupported timestamp format")
	}
}

// JSONB type for PostgreSQL jsonb columns
type JSONB []byte

// Scan implements the sql.Scanner interface
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		*j = v
	case string:
		*j = []byte(v)
	default:
		return fmt.Errorf("unsupported type: %T", value)
	}
	return nil
}

// Helper function to convert map to JSONB
func ConvertToJSONB(v interface{}) JSONB {
	if v == nil {
		return nil
	}

	data, err := json.Marshal(v)
	if err != nil {
		// TODO: Log and handle the error
		return JSONB(`{}`)
	}

	return JSONB(data)
}

// Custom JSON marshaling for JSONB
func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return j, nil
}

// Custom JSON unmarshaling for JSONB
func (j *JSONB) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		*j = nil
		return nil
	}
	*j = data
	return nil
}
