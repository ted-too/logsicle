package models

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation"
	"github.com/go-ozzo/ozzo-validation/is"
	"github.com/sumup/typeid"
)

// Request logs (HTTP requests)

type RequestLogID = typeid.Sortable[RequestLogPrefix]
type RequestLogPrefix struct{}

func (RequestLogPrefix) Prefix() string { return "req" }

type RequestLog struct {
	ID           string    `json:"id"`
	ProjectID    string    `json:"project_id"`
	Method       string    `json:"method"`
	Path         string    `json:"path"`
	StatusCode   int       `json:"status_code"`
	Duration     int64     `json:"duration"` // in milliseconds
	RequestBody  JSONB     `json:"request_body,omitempty"`
	ResponseBody JSONB     `json:"response_body,omitempty"`
	Headers      JSONB     `json:"headers,omitempty"`      // Added headers
	QueryParams  JSONB     `json:"query_params,omitempty"` // Added query parameters
	UserAgent    string    `json:"user_agent,omitempty"`
	IPAddress    string    `json:"ip_address"`
	Protocol     string    `json:"protocol,omitempty"` // Added protocol (HTTP/1.1, HTTP/2, etc.)
	Host         string    `json:"host,omitempty"`     // Added host
	Error        string    `json:"error,omitempty"`    // Added error field
	Timestamp    time.Time `json:"timestamp"`
}

func (l *RequestLog) GetLogType() string {
	return "request"
}

func (l *RequestLog) GetProjectID() string {
	return l.ProjectID
}

// TODO: Implement JSON marshalling and unmarshaling
// TODO: Allow timestamp to be part of input

type RequestLogInput struct {
	ProjectID    string         `json:"project_id"`
	Method       string         `json:"method"`
	Path         string         `json:"path"`
	StatusCode   int            `json:"status_code"`
	Duration     int64          `json:"duration"`
	RequestBody  map[string]any `json:"request_body,omitempty"`
	ResponseBody map[string]any `json:"response_body,omitempty"`
	Headers      map[string]any `json:"headers,omitempty"`
	QueryParams  map[string]any `json:"query_params,omitempty"`
	UserAgent    string         `json:"user_agent,omitempty"`
	IPAddress    string         `json:"ip_address"`
	Protocol     string         `json:"protocol,omitempty"`
	Host         string         `json:"host,omitempty"`
	Error        string         `json:"error,omitempty"`
}

func (r RequestLogInput) ValidateAndCreate() (*RequestLog, error) {
	if err := validation.ValidateStruct(&r,
		validation.Field(&r.ProjectID,
			validation.Required,
		),
		validation.Field(&r.Method,
			validation.Required,
			validation.In("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "TRACE", "CONNECT"),
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
		validation.Field(&r.UserAgent,
			validation.Length(0, 1024),
		),
		validation.Field(&r.IPAddress,
			validation.Required,
			is.IP,
		),
		validation.Field(&r.Protocol,
			validation.In("HTTP/1.0", "HTTP/1.1", "HTTP/2", "HTTP/3"),
		),
		validation.Field(&r.Host,
			validation.Length(0, 255),
		),
	); err != nil {
		return nil, err
	}

	id, err := typeid.New[RequestLogID]()
	if err != nil {
		return nil, err
	}

	return &RequestLog{
		ID:           id.String(),
		ProjectID:    r.ProjectID,
		Method:       r.Method,
		Path:         r.Path,
		StatusCode:   r.StatusCode,
		Duration:     r.Duration,
		RequestBody:  ConvertToJSONB(r.RequestBody),
		ResponseBody: ConvertToJSONB(r.ResponseBody),
		Headers:      ConvertToJSONB(r.Headers),
		QueryParams:  ConvertToJSONB(r.QueryParams),
		UserAgent:    r.UserAgent,
		IPAddress:    r.IPAddress,
		Protocol:     r.Protocol,
		Host:         r.Host,
		Error:        r.Error,
		Timestamp:    time.Now(),
	}, nil
}
