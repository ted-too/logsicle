package timescale

import (
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/sumup/typeid"
)

// Type definitions for IDs
type (
	EventLogID   = typeid.Sortable[EventLogPrefix]
	AppLogID     = typeid.Sortable[AppLogPrefix]
	RequestLogID = typeid.Sortable[RequestLogPrefix]
	MetricID     = typeid.Sortable[MetricPrefix]
)

// Prefix definitions
type (
	EventLogPrefix   struct{}
	AppLogPrefix     struct{}
	RequestLogPrefix struct{}
	MetricPrefix     struct{}
)

func (EventLogPrefix) Prefix() string   { return "evt" }
func (AppLogPrefix) Prefix() string     { return "app" }
func (RequestLogPrefix) Prefix() string { return "req" }
func (MetricPrefix) Prefix() string     { return "met" }

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

// Event logs (high-level business events)
type EventLog struct {
	ID          string    `json:"id,omitempty"`
	ProjectID   string    `json:"project_id" validate:"required"`
	ChannelID   *string   `json:"channel_id,omitempty"`
	Name        string    `json:"name" validate:"required,min=1,max=255"`
	Description string    `json:"description" validate:"max=1000"`
	Metadata    JSONB     `json:"metadata,omitempty" validate:"omitempty,json"`
	Tags        JSONB     `json:"tags,omitempty" validate:"omitempty,json"`
	Timestamp   time.Time `json:"timestamp" validate:"required"`
}

// Application logs (debug, info, error logs)
type AppLog struct {
	ID          string    `json:"id,omitempty"`
	ProjectID   string    `json:"project_id" validate:"required"`
	ChannelID   *string   `json:"channel_id,omitempty"`
	Level       LogLevel  `json:"level" validate:"required,oneof=debug info warning error"`
	Message     string    `json:"message" validate:"required,min=1,max=10000"`
	Metadata    JSONB     `json:"metadata,omitempty" validate:"omitempty,json"`
	StackTrace  string    `json:"stack_trace,omitempty" validate:"max=50000"`
	ServiceName string    `json:"service_name" validate:"required,min=1,max=255"`
	Timestamp   time.Time `json:"timestamp" validate:"required"`
}

// Request logs (HTTP requests)
type RequestLog struct {
	ID           string    `json:"id,omitempty"`
	ProjectID    string    `json:"project_id" validate:"required"`
	ChannelID    *string   `json:"channel_id,omitempty"`
	Method       string    `json:"method" validate:"required,oneof=GET POST PUT PATCH DELETE OPTIONS HEAD"`
	Path         string    `json:"path" validate:"required,max=2048"`
	StatusCode   int       `json:"status_code" validate:"required,min=100,max=599"`
	Duration     int64     `json:"duration" validate:"required,min=0"` // in milliseconds
	RequestBody  JSONB     `json:"request_body,omitempty" validate:"omitempty,json"`
	ResponseBody JSONB     `json:"response_body,omitempty" validate:"omitempty,json"`
	UserAgent    string    `json:"user_agent" validate:"max=1024"`
	IPAddress    string    `json:"ip_address" validate:"required,ip"`
	Timestamp    time.Time `json:"timestamp" validate:"required"`
}

// Metrics data
type Metric struct {
	ID        string    `json:"id,omitempty"`
	ProjectID string    `json:"project_id" validate:"required"`
	Name      string    `json:"name" validate:"required,min=1,max=255"`
	Value     float64   `json:"value" validate:"required"`
	Labels    JSONB     `json:"labels,omitempty" validate:"omitempty,json"`
	Timestamp time.Time `json:"timestamp" validate:"required"`
}

type LogLevel string

const (
	LogLevelDebug   LogLevel = "debug"
	LogLevelInfo    LogLevel = "info"
	LogLevelWarning LogLevel = "warning"
	LogLevelError   LogLevel = "error"
)

// Helper methods for scanning rows
func ScanEventLog(row pgx.Row) (*EventLog, error) {
	var log EventLog
	err := row.Scan(
		&log.ID,
		&log.ProjectID,
		&log.ChannelID,
		&log.Name,
		&log.Description,
		&log.Metadata,
		&log.Tags,
		&log.Timestamp,
	)
	if err != nil {
		return nil, err
	}
	return &log, nil
}

func ScanAppLog(row pgx.Row) (*AppLog, error) {
	var log AppLog
	err := row.Scan(
		&log.ID,
		&log.ProjectID,
		&log.ChannelID,
		&log.Level,
		&log.Message,
		&log.Metadata,
		&log.StackTrace,
		&log.ServiceName,
		&log.Timestamp,
	)
	if err != nil {
		return nil, err
	}
	return &log, nil
}

func ScanRequestLog(row pgx.Row) (*RequestLog, error) {
	var log RequestLog
	err := row.Scan(
		&log.ID,
		&log.ProjectID,
		&log.ChannelID,
		&log.Method,
		&log.Path,
		&log.StatusCode,
		&log.Duration,
		&log.RequestBody,
		&log.ResponseBody,
		&log.UserAgent,
		&log.IPAddress,
		&log.Timestamp,
	)
	if err != nil {
		return nil, err
	}
	return &log, nil
}

func ScanMetric(row pgx.Row) (*Metric, error) {
	var metric Metric
	err := row.Scan(
		&metric.ID,
		&metric.ProjectID,
		&metric.Name,
		&metric.Value,
		&metric.Labels,
		&metric.Timestamp,
	)
	if err != nil {
		return nil, err
	}
	return &metric, nil
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
