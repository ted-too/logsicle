package timescale

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/go-ozzo/ozzo-validation/v4/is"
	"github.com/jackc/pgx/v5"
	"github.com/sumup/typeid"
)

type LogEntry interface {
	GetProjectID() string
	GetLogType() string
}

// Implement the interface for each log type
func (l *EventLog) GetProjectID() string {
	return l.ProjectID
}

func (l *AppLog) GetProjectID() string {
	return l.ProjectID
}

func (l *RequestLog) GetProjectID() string {
	return l.ProjectID
}

func (l *Trace) GetProjectID() string {
	return l.ProjectID
}

// Implement GetLogType for each type
func (l *EventLog) GetLogType() string {
	return "event"
}

func (l *AppLog) GetLogType() string {
	return "app"
}

func (l *RequestLog) GetLogType() string {
	return "request"
}

func (l *Trace) GetLogType() string {
	return "metric"
}

type ChannelRelation struct {
	Name  string  `json:"name"`
	Color *string `json:"color"`
}

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

// Event logs (high-level business events)
type EventLog struct {
	ID          string           `json:"id,omitempty"`
	ProjectID   string           `json:"project_id"`
	ChannelID   sql.NullString   `json:"channel_id"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Parser      string           `json:"parser,omitempty"`
	Metadata    JSONB            `json:"metadata,omitempty"`
	Tags        JSONB            `json:"tags,omitempty"`
	Timestamp   time.Time        `json:"timestamp"`
	Channel     *ChannelRelation `json:"channel"`
}

func (l EventLog) MarshalJSON() ([]byte, error) {
	type Alias EventLog // Prevent recursive MarshalJSON calls

	clean := struct {
		*Alias
		ChannelID *string `json:"channel_id"`
	}{
		Alias:     (*Alias)(&l),
		ChannelID: nil,
	}

	if l.ChannelID.Valid {
		clean.ChannelID = &l.ChannelID.String
	}

	return json.Marshal(clean)
}

// Add this to your EventLog struct in timescale/models.go
func (l *EventLog) UnmarshalJSON(data []byte) error {
	type Alias EventLog // Prevent recursive UnmarshalJSON calls

	aux := struct {
		*Alias
		ChannelID *string `json:"channel_id"`
	}{
		Alias: (*Alias)(l),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Convert *string to sql.NullString
	if aux.ChannelID != nil {
		l.ChannelID = sql.NullString{
			String: *aux.ChannelID,
			Valid:  true,
		}
	} else {
		l.ChannelID = sql.NullString{
			Valid: false,
		}
	}

	return nil
}

// EventLog validation struct
type EventLogInput struct {
	ProjectID   string         `json:"project_id"`
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Parser      string         `json:"parser,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
	Tags        []string       `json:"tags,omitempty"`
}

func (e EventLogInput) ValidateAndCreate(channelIDInput string) (*EventLog, error) {
	if err := validation.ValidateStruct(&e,
		validation.Field(&e.ProjectID,
			validation.Required,
		),
		validation.Field(&e.Name,
			validation.Required,
			validation.Length(1, 255),
		),
		validation.Field(&e.Description,
			validation.Length(0, 1000),
		),
		validation.Field(&e.Parser,
			validation.In("text", "markdown"),
		),
		validation.Field(&e.Metadata),
		validation.Field(&e.Tags,
			validation.Each(validation.Length(1, 50)),
		),
	); err != nil {
		return nil, err
	}

	// Generate ID
	id, err := typeid.New[EventLogID]()
	if err != nil {
		return nil, err
	}

	// Convert metadata and tags to JSONB if needed
	var metadataJSON, tagsJSON JSONB
	if e.Metadata != nil {
		// Convert map to JSON bytes
		// You'll need to implement this conversion
		metadataJSON = convertToJSONB(e.Metadata)
	}
	if e.Tags != nil {
		tagsJSON = convertToJSONB(e.Tags)
	}

	// Convert string to sql.NullString
	var channelID sql.NullString
	if channelIDInput != "" {
		channelID = sql.NullString{
			String: channelIDInput,
			Valid:  true,
		}
	}

	return &EventLog{
		ID:          id.String(),
		ProjectID:   e.ProjectID,
		ChannelID:   channelID,
		Name:        e.Name,
		Description: e.Description,
		Parser:      e.Parser,
		Metadata:    metadataJSON,
		Tags:        tagsJSON,
		Timestamp:   time.Now(),
	}, nil
}

// Application logs (debug, info, error logs)
type AppLog struct {
	ID          string    `json:"id,omitempty"`
	ProjectID   string    `json:"project_id"`
	ChannelID   *string   `json:"channel_id,omitempty"`
	Level       LogLevel  `json:"level"`
	Message     string    `json:"message"`
	Metadata    JSONB     `json:"metadata,omitempty"`
	StackTrace  string    `json:"stack_trace,omitempty"`
	ServiceName string    `json:"service_name"`
	Timestamp   time.Time `json:"timestamp"`
}

// AppLog validation struct
type AppLogInput struct {
	ProjectID   string         `json:"project_id"`
	ChannelID   *string        `json:"channel_id,omitempty"`
	Level       string         `json:"level"`
	Message     string         `json:"message"`
	Metadata    map[string]any `json:"metadata,omitempty"`
	StackTrace  string         `json:"stack_trace,omitempty"`
	ServiceName string         `json:"service_name"`
}

func (a AppLogInput) ValidateAndCreate() (*AppLog, error) {
	if err := validation.ValidateStruct(&a,
		validation.Field(&a.ProjectID,
			validation.Required,
		),
		validation.Field(&a.Level,
			validation.Required,
			validation.In("debug", "info", "warning", "error"),
		),
		validation.Field(&a.Message,
			validation.Required,
			validation.Length(1, 10000),
		),
		validation.Field(&a.Metadata),
		validation.Field(&a.StackTrace,
			validation.Length(0, 50000),
		),
		validation.Field(&a.ServiceName,
			validation.Required,
			validation.Length(1, 255),
		),
	); err != nil {
		return nil, err
	}

	id, err := typeid.New[AppLogID]()
	if err != nil {
		return nil, err
	}

	var metadataJSON JSONB
	if a.Metadata != nil {
		metadataJSON = convertToJSONB(a.Metadata)
	}

	return &AppLog{
		ID:          id.String(),
		ProjectID:   a.ProjectID,
		ChannelID:   a.ChannelID,
		Level:       LogLevel(a.Level),
		Message:     a.Message,
		Metadata:    metadataJSON,
		StackTrace:  a.StackTrace,
		ServiceName: a.ServiceName,
		Timestamp:   time.Now(),
	}, nil
}

// Request logs (HTTP requests)
type RequestLog struct {
	ID           string    `json:"id,omitempty"`
	ProjectID    string    `json:"project_id"`
	ChannelID    *string   `json:"channel_id,omitempty"`
	Method       string    `json:"method"`
	Path         string    `json:"path"`
	StatusCode   int       `json:"status_code"`
	Duration     int64     `json:"duration"`
	RequestBody  JSONB     `json:"request_body,omitempty"`
	ResponseBody JSONB     `json:"response_body,omitempty"`
	UserAgent    string    `json:"user_agent,omitempty"`
	IPAddress    string    `json:"ip_address"`
	Timestamp    time.Time `json:"timestamp"`
}

// RequestLog validation struct
type RequestLogInput struct {
	ProjectID    string         `json:"project_id"`
	ChannelID    *string        `json:"channel_id,omitempty"`
	Method       string         `json:"method"`
	Path         string         `json:"path"`
	StatusCode   int            `json:"status_code"`
	Duration     int64          `json:"duration"`
	RequestBody  map[string]any `json:"request_body,omitempty"`
	ResponseBody map[string]any `json:"response_body,omitempty"`
	UserAgent    string         `json:"user_agent,omitempty"`
	IPAddress    string         `json:"ip_address"`
}

func (r RequestLogInput) ValidateAndCreate() (*RequestLog, error) {
	if err := validation.ValidateStruct(&r,
		validation.Field(&r.ProjectID,
			validation.Required,
		),
		validation.Field(&r.Method,
			validation.Required,
			validation.In("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"),
		),
		validation.Field(&r.Path,
			validation.Required,
			validation.Length(1, 2048),
		),
		validation.Field(&r.StatusCode,
			validation.Required,
			validation.Min(100),
			validation.Max(599),
		),
		validation.Field(&r.Duration,
			validation.Required,
			validation.Min(0),
		),
		validation.Field(&r.RequestBody),
		validation.Field(&r.ResponseBody),
		validation.Field(&r.UserAgent,
			validation.Length(0, 1024),
		),
		validation.Field(&r.IPAddress,
			validation.Required,
			is.IP,
		),
	); err != nil {
		return nil, err
	}

	id, err := typeid.New[RequestLogID]()
	if err != nil {
		return nil, err
	}

	var reqBodyJSON, respBodyJSON JSONB
	if r.RequestBody != nil {
		reqBodyJSON = convertToJSONB(r.RequestBody)
	}
	if r.ResponseBody != nil {
		respBodyJSON = convertToJSONB(r.ResponseBody)
	}

	return &RequestLog{
		ID:           id.String(),
		ProjectID:    r.ProjectID,
		ChannelID:    r.ChannelID,
		Method:       r.Method,
		Path:         r.Path,
		StatusCode:   r.StatusCode,
		Duration:     r.Duration,
		RequestBody:  reqBodyJSON,
		ResponseBody: respBodyJSON,
		UserAgent:    r.UserAgent,
		IPAddress:    r.IPAddress,
		Timestamp:    time.Now(),
	}, nil
}

// Metrics data
type Trace struct {
	ID        string    `json:"id,omitempty"`
	ProjectID string    `json:"project_id"`
	Name      string    `json:"name"`
	Value     float64   `json:"value"`
	Labels    JSONB     `json:"labels,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// Metric validation struct
type TraceInput struct {
	ProjectID string         `json:"project_id"`
	ChannelID *string        `json:"channel_id,omitempty"`
	Name      string         `json:"name"`
	Value     float64        `json:"value"`
	Labels    map[string]any `json:"labels,omitempty"`
}

func (m TraceInput) ValidateAndCreate() (*Trace, error) {
	if err := validation.ValidateStruct(&m,
		validation.Field(&m.ProjectID,
			validation.Required,
		),
		validation.Field(&m.Name,
			validation.Required,
			validation.Length(1, 255),
		),
		validation.Field(&m.Value,
			validation.Required,
		),
		validation.Field(&m.Labels),
	); err != nil {
		return nil, err
	}

	id, err := typeid.New[MetricID]()
	if err != nil {
		return nil, err
	}

	var labelsJSON JSONB
	if m.Labels != nil {
		labelsJSON = convertToJSONB(m.Labels)
	}

	return &Trace{
		ID:        id.String(),
		ProjectID: m.ProjectID,
		Name:      m.Name,
		Value:     m.Value,
		Labels:    labelsJSON,
		Timestamp: time.Now(),
	}, nil
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

func ScanMetric(row pgx.Row) (*Trace, error) {
	var metric Trace
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
func convertToJSONB(v interface{}) JSONB {
	if v == nil {
		return nil
	}

	data, err := json.Marshal(v)
	if err != nil {
		// TODO: Log and handle the error
		return nil
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
