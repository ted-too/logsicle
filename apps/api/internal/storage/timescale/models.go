package timescale

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/go-ozzo/ozzo-validation/v4/is"
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

func (l *Metric) GetProjectID() string {
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

func (l *Metric) GetLogType() string {
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

type LogLevel string

const (
	LogLevelDebug   LogLevel = "debug"
	LogLevelInfo    LogLevel = "info"
	LogLevelWarning LogLevel = "warning"
	LogLevelError   LogLevel = "error"
	LogLevelFatal   LogLevel = "fatal"
)

// Application logs (debug, info, error logs)
type AppLog struct {
	ID        string         `json:"id"`
	ProjectID string         `json:"project_id"`
	ChannelID sql.NullString `json:"channel_id"`

	// Always available
	Level     LogLevel  `json:"level"`
	Message   string    `json:"message"`
	Fields    JSONB     `json:"fields"` // Structured data
	Timestamp time.Time `json:"timestamp"`

	// Optional fields (might be available depending on logger)
	Caller   sql.NullString `json:"caller"`   // file:line
	Function sql.NullString `json:"function"` // function name

	// Configuration-time fields (set once during setup)
	ServiceName string         `json:"service_name"`
	Version     sql.NullString `json:"version"`
	Environment sql.NullString `json:"environment"`
	Host        sql.NullString `json:"host"`
}

func (l AppLog) MarshalJSON() ([]byte, error) {
	type Alias AppLog // Prevent recursive MarshalJSON calls

	clean := struct {
		*Alias
		ChannelID   *string `json:"channel_id"`
		Caller      *string `json:"caller"`
		Function    *string `json:"function"`
		Version     *string `json:"version"`
		Environment *string `json:"environment"`
		Host        *string `json:"host"`
	}{
		Alias: (*Alias)(&l),
	}

	// Convert sql.NullString to *string for all nullable fields
	if l.ChannelID.Valid {
		clean.ChannelID = &l.ChannelID.String
	}
	if l.Caller.Valid {
		clean.Caller = &l.Caller.String
	}
	if l.Function.Valid {
		clean.Function = &l.Function.String
	}
	if l.Version.Valid {
		clean.Version = &l.Version.String
	}
	if l.Environment.Valid {
		clean.Environment = &l.Environment.String
	}
	if l.Host.Valid {
		clean.Host = &l.Host.String
	}

	return json.Marshal(clean)
}

func (l *AppLog) UnmarshalJSON(data []byte) error {
	type Alias AppLog // Prevent recursive UnmarshalJSON calls

	aux := struct {
		*Alias
		ChannelID   *string `json:"channel_id"`
		Caller      *string `json:"caller"`
		Function    *string `json:"function"`
		Version     *string `json:"version"`
		Environment *string `json:"environment"`
		Host        *string `json:"host"`
	}{
		Alias: (*Alias)(l),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Convert all *string to sql.NullString
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

	if aux.Caller != nil {
		l.Caller = sql.NullString{
			String: *aux.Caller,
			Valid:  true,
		}
	} else {
		l.Caller = sql.NullString{
			Valid: false,
		}
	}

	if aux.Function != nil {
		l.Function = sql.NullString{
			String: *aux.Function,
			Valid:  true,
		}
	} else {
		l.Function = sql.NullString{
			Valid: false,
		}
	}

	if aux.Version != nil {
		l.Version = sql.NullString{
			String: *aux.Version,
			Valid:  true,
		}
	} else {
		l.Version = sql.NullString{
			Valid: false,
		}
	}

	if aux.Environment != nil {
		l.Environment = sql.NullString{
			String: *aux.Environment,
			Valid:  true,
		}
	} else {
		l.Environment = sql.NullString{
			Valid: false,
		}
	}

	if aux.Host != nil {
		l.Host = sql.NullString{
			String: *aux.Host,
			Valid:  true,
		}
	} else {
		l.Host = sql.NullString{
			Valid: false,
		}
	}

	return nil
}

// AppLog validation struct
type AppLogInput struct {
	ProjectID   string         `json:"project_id"`
	Level       string         `json:"level"`
	Message     string         `json:"message"`
	Fields      map[string]any `json:"fields,omitempty"`
	Caller      *string        `json:"caller,omitempty"`
	Function    *string        `json:"function,omitempty"`
	ServiceName string         `json:"service_name"`
	Version     string         `json:"version,omitempty"`
	Environment string         `json:"environment,omitempty"`
	Host        string         `json:"host,omitempty"`
}

func (a AppLogInput) ValidateAndCreate(channelIDInput string) (*AppLog, error) {
	if err := validation.ValidateStruct(&a,
		validation.Field(&a.ProjectID,
			validation.Required,
		),
		validation.Field(&a.Level,
			validation.Required,
			validation.In("info", "debug", "info", "warning", "error", "fatal"),
		),
		validation.Field(&a.Message,
			validation.Required,
			validation.Length(1, 10000),
		),
		validation.Field(&a.Fields),
		validation.Field(&a.Caller,
			validation.Length(0, 1000),
		),
		validation.Field(&a.Function,
			validation.Length(0, 255),
		),
		validation.Field(&a.ServiceName,
			validation.Required,
			validation.Length(1, 255),
		),
		validation.Field(&a.Version,
			validation.Length(0, 50),
		),
		validation.Field(&a.Environment,
			validation.Length(0, 50),
		),
		validation.Field(&a.Host,
			validation.Length(0, 255),
		),
	); err != nil {
		return nil, err
	}

	id, err := typeid.New[AppLogID]()
	if err != nil {
		return nil, err
	}

	// Convert fields to JSONB
	var fieldsJSON JSONB
	if a.Fields != nil {
		fieldsJSON = convertToJSONB(a.Fields)
	} else {
		fieldsJSON = JSONB(`{}`)
	}

	// Convert string to sql.NullString
	var channelID sql.NullString
	if channelIDInput != "" {
		channelID = sql.NullString{
			String: channelIDInput,
			Valid:  true,
		}
	}

	// Convert optional fields to sql.NullString
	var caller sql.NullString
	if a.Caller != nil {
		caller = sql.NullString{
			String: *a.Caller,
			Valid:  true,
		}
	}

	var function sql.NullString
	if a.Function != nil {
		function = sql.NullString{
			String: *a.Function,
			Valid:  true,
		}
	}

	var version sql.NullString
	if a.Version != "" {
		version = sql.NullString{
			String: a.Version,
			Valid:  true,
		}
	}

	var environment sql.NullString
	if a.Environment != "" {
		environment = sql.NullString{
			String: a.Environment,
			Valid:  true,
		}
	}

	var host sql.NullString
	if a.Host != "" {
		host = sql.NullString{
			String: a.Host,
			Valid:  true,
		}
	}

	return &AppLog{
		ID:          id.String(),
		ProjectID:   a.ProjectID,
		ChannelID:   channelID,
		Level:       LogLevel(a.Level),
		Message:     a.Message,
		Fields:      fieldsJSON,
		Caller:      caller,
		Function:    function,
		ServiceName: a.ServiceName,
		Version:     version,
		Environment: environment,
		Host:        host,
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
type Metric struct {
	ID        string    `json:"id,omitempty"`
	ProjectID string    `json:"project_id"`
	Name      string    `json:"name"`
	Value     float64   `json:"value"`
	Labels    JSONB     `json:"labels,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// Metric validation struct
type MetricInput struct {
	ProjectID string         `json:"project_id"`
	ChannelID *string        `json:"channel_id,omitempty"`
	Name      string         `json:"name"`
	Value     float64        `json:"value"`
	Labels    map[string]any `json:"labels,omitempty"`
}

func (m MetricInput) ValidateAndCreate() (*Metric, error) {
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

	return &Metric{
		ID:        id.String(),
		ProjectID: m.ProjectID,
		Name:      m.Name,
		Value:     m.Value,
		Labels:    labelsJSON,
		Timestamp: time.Now(),
	}, nil
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
