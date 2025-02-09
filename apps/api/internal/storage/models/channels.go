// apps/api/internal/storage/models/channels.go

package models

import (
	"database/sql"
	"encoding/json"

	"github.com/lib/pq"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
)

// Event Channels
type EventChannelPrefix struct{}

func (EventChannelPrefix) Prefix() string {
	return "evch"
}

type EventChannelID = typeid.Sortable[EventChannelPrefix]

type EventChannel struct {
	storage.BaseChannel `json:"-"`
	ProjectID           string `gorm:"uniqueIndex:idx_event_channels_project_id_name;not null" json:"project_id"`
	Name                string `gorm:"uniqueIndex:idx_event_channels_project_id_name;not null" json:"name"`
	// Event-specific configurations
	RequiredTags   pq.StringArray `gorm:"type:text[]" json:"required_tags"`
	MetadataSchema sql.NullString `gorm:"type:jsonb" json:"-"` // JSON Schema for metadata validation
}

func (ec EventChannel) MarshalJSON() ([]byte, error) {
	baseJSON, err := ec.BaseChannel.MarshalJSON()
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(baseJSON, &result); err != nil {
		return nil, err
	}

	// Add EventChannel specific fields
	result["project_id"] = ec.ProjectID
	result["name"] = ec.Name
	result["required_tags"] = ec.RequiredTags

	// Handle MetadataSchema as raw JSON
	result["metadata_schema"] = nil
	if ec.MetadataSchema.Valid {
		var jsonSchema interface{}
		if err := json.Unmarshal([]byte(ec.MetadataSchema.String), &jsonSchema); err != nil {
			return nil, err
		}
		result["metadata_schema"] = jsonSchema
	}

	return json.Marshal(result)
}

// App Log Channels
type AppLogChannelPrefix struct{}

func (AppLogChannelPrefix) Prefix() string {
	return "apch"
}

type AppLogChannelID = typeid.Sortable[AppLogChannelPrefix]

type AppLogChannel struct {
	storage.BaseChannel
	ProjectID string `gorm:"uniqueIndex:idx_app_channels_project_id_name;not null" json:"project_id"`
	Name      string `gorm:"uniqueIndex:idx_app_channels_project_id_name;not null" json:"name"`
	// App log-specific configurations
	AllowedLevels     pq.StringArray `gorm:"type:text[];default:'{debug,info,warning,error}'" json:"allowed_levels"`
	RequireStackTrace bool           `gorm:"default:false" json:"require_stack_trace"`
}

// Request Log Channels
type RequestLogChannelPrefix struct{}

func (RequestLogChannelPrefix) Prefix() string {
	return "rqch"
}

type RequestLogChannelID = typeid.Sortable[RequestLogChannelPrefix]

type RequestLogChannel struct {
	storage.BaseChannel
	ProjectID string `gorm:"uniqueIndex:idx_req_channels_project_id_name;not null" json:"project_id"`
	Name      string `gorm:"uniqueIndex:idx_req_channels_project_id_name;not null" json:"name"`
	// Request log-specific configurations
	CaptureRequestBody  bool          `gorm:"default:true" json:"capture_request_body"`
	CaptureResponseBody bool          `gorm:"default:true" json:"capture_response_body"`
	StatusCodeRanges    pq.Int64Array `gorm:"type:integer[]" json:"status_code_ranges"` // e.g., [200,299] for success
}

// Trace Channels
type TraceChannelPrefix struct{}

func (TraceChannelPrefix) Prefix() string {
	return "trch"
}

type TraceChannelID = typeid.Sortable[TraceChannelPrefix]

type TraceChannel struct {
	storage.BaseChannel
	ProjectID string `gorm:"uniqueIndex:idx_trace_channels_project_id_name;not null" json:"project_id"`
	Name      string `gorm:"uniqueIndex:idx_trace_channels_project_id_name;not null" json:"name"`
	// Trace-specific configurations
	RequiredLabels pq.StringArray `gorm:"type:text[]" json:"required_labels"`
	// Could add other trace-specific configurations like:
	// - Value thresholds
	// - Aggregation preferences
	// - Alert thresholds
}
