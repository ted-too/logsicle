package models

import (
	"database/sql"
	"time"

	validation "github.com/go-ozzo/ozzo-validation"
	"github.com/sumup/typeid"
)

// OpenTelemetry traces

type TraceID = typeid.Sortable[TracePrefix]
type TracePrefix struct{}

func (TracePrefix) Prefix() string { return "trc" }

// SpanKind represents the type of span
type SpanKind string

const (
	SpanKindUnspecified SpanKind = "SPAN_KIND_UNSPECIFIED"
	SpanKindInternal    SpanKind = "SPAN_KIND_INTERNAL"
	SpanKindServer      SpanKind = "SPAN_KIND_SERVER"
	SpanKindClient      SpanKind = "SPAN_KIND_CLIENT"
	SpanKindProducer    SpanKind = "SPAN_KIND_PRODUCER"
	SpanKindConsumer    SpanKind = "SPAN_KIND_CONSUMER"
)

// SpanStatus represents the status of a span
type SpanStatus string

const (
	SpanStatusUnset SpanStatus = "STATUS_UNSET"
	SpanStatusOk    SpanStatus = "STATUS_OK"
	SpanStatusError SpanStatus = "STATUS_ERROR"
)

// Trace represents a span in a distributed trace
type Trace struct {
	ID         string         `json:"id"`        // Span ID
	TraceID    string         `json:"trace_id"`  // Trace ID
	ParentID   sql.NullString `json:"parent_id"` // Parent Span ID
	ProjectID  string         `json:"project_id"`
	Name       string         `json:"name"` // Operation name
	Kind       SpanKind       `json:"kind"`
	StartTime  time.Time      `json:"start_time"`
	EndTime    time.Time      `json:"end_time"`
	DurationMs int64          `json:"duration_ms"`
	Status     SpanStatus     `json:"status"`
	StatusMsg  sql.NullString `json:"status_message"`

	// Context
	ServiceName    string         `json:"service_name"`
	ServiceVersion sql.NullString `json:"service_version"`

	// Additional data
	Attributes         JSONB     `json:"attributes"`          // Key-value span attributes
	Events             JSONB     `json:"events"`              // Timeline events within the span
	Links              JSONB     `json:"links"`               // Links to other spans
	ResourceAttributes JSONB     `json:"resource_attributes"` // Resource information
	Timestamp          time.Time `json:"timestamp"`
}

// Implement the LogEntry interface
func (t *Trace) GetProjectID() string {
	return t.ProjectID
}

func (t *Trace) GetLogType() string {
	return "trace"
}

// TODO: Implement JSON marshalling and unmarshaling

// TraceEvent represents an event that occurred during a span
type TraceEvent struct {
	Name       string    `json:"name"`
	Timestamp  time.Time `json:"timestamp"`
	Attributes JSONB     `json:"attributes,omitempty"`
}

// TraceLink represents a link to another span
type TraceLink struct {
	TraceID    string `json:"trace_id"`
	SpanID     string `json:"span_id"`
	Attributes JSONB  `json:"attributes,omitempty"`
}

// TraceInput validation struct
type TraceInput struct {
	ProjectID          string         `json:"project_id"`
	TraceID            string         `json:"trace_id"`
	ParentID           string         `json:"parent_id,omitempty"`
	Name               string         `json:"name"`
	Kind               string         `json:"kind"`
	StartTime          time.Time      `json:"start_time"`
	EndTime            time.Time      `json:"end_time"`
	Status             string         `json:"status"`
	StatusMessage      string         `json:"status_message,omitempty"`
	ServiceName        string         `json:"service_name"`
	ServiceVersion     string         `json:"service_version,omitempty"`
	Attributes         map[string]any `json:"attributes,omitempty"`
	Events             []TraceEvent   `json:"events,omitempty"`
	Links              []TraceLink    `json:"links,omitempty"`
	ResourceAttributes map[string]any `json:"resource_attributes,omitempty"`
}

func (t TraceInput) ValidateAndCreate() (*Trace, error) {
	if err := validation.ValidateStruct(&t,
		validation.Field(&t.ProjectID,
			validation.Required,
		),
		validation.Field(&t.TraceID,
			validation.Required,
			validation.Length(16, 32), // Typical trace ID length
		),
		validation.Field(&t.Name,
			validation.Required,
			validation.Length(1, 255),
		),
		validation.Field(&t.Kind,
			validation.Required,
			validation.In(string(SpanKindUnspecified),
				string(SpanKindInternal),
				string(SpanKindServer),
				string(SpanKindClient),
				string(SpanKindProducer),
				string(SpanKindConsumer)),
		),
		validation.Field(&t.Status,
			validation.Required,
			validation.In(string(SpanStatusUnset),
				string(SpanStatusOk),
				string(SpanStatusError)),
		),
		validation.Field(&t.ServiceName,
			validation.Required,
			validation.Length(1, 255),
		),
	); err != nil {
		return nil, err
	}

	id, err := typeid.New[TraceID]()
	if err != nil {
		return nil, err
	}

	// Calculate duration in milliseconds
	durationMs := t.EndTime.Sub(t.StartTime).Milliseconds()

	// Convert maps to JSONB
	attributesJSON := ConvertToJSONB(t.Attributes)
	eventsJSON := ConvertToJSONB(t.Events)
	linksJSON := ConvertToJSONB(t.Links)
	resourceAttributesJSON := ConvertToJSONB(t.ResourceAttributes)

	// Handle optional fields
	var parentID sql.NullString
	if t.ParentID != "" {
		parentID = sql.NullString{String: t.ParentID, Valid: true}
	}

	var statusMsg sql.NullString
	if t.StatusMessage != "" {
		statusMsg = sql.NullString{String: t.StatusMessage, Valid: true}
	}

	var serviceVersion sql.NullString
	if t.ServiceVersion != "" {
		serviceVersion = sql.NullString{String: t.ServiceVersion, Valid: true}
	}

	return &Trace{
		ID:                 id.String(),
		TraceID:            t.TraceID,
		ParentID:           parentID,
		ProjectID:          t.ProjectID,
		Name:               t.Name,
		Kind:               SpanKind(t.Kind),
		StartTime:          t.StartTime,
		EndTime:            t.EndTime,
		DurationMs:         durationMs,
		Status:             SpanStatus(t.Status),
		StatusMsg:          statusMsg,
		ServiceName:        t.ServiceName,
		ServiceVersion:     serviceVersion,
		Attributes:         attributesJSON,
		Events:             eventsJSON,
		Links:              linksJSON,
		ResourceAttributes: resourceAttributesJSON,
		Timestamp:          time.Now(),
	}, nil
}
