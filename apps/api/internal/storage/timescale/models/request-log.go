package models

import (
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation"
	"github.com/go-ozzo/ozzo-validation/is"
	"github.com/sumup/typeid"
)

// Request logs (HTTP requests)

type RequestLogID = typeid.Sortable[RequestLogPrefix]
type RequestLogPrefix struct{}

func (RequestLogPrefix) Prefix() string { return "req" }

type RequestMethod string

const (
	RequestMethodGet     RequestMethod = "GET"
	RequestMethodPost    RequestMethod = "POST"
	RequestMethodPut     RequestMethod = "PUT"
	RequestMethodPatch   RequestMethod = "PATCH"
	RequestMethodDelete  RequestMethod = "DELETE"
	RequestMethodOptions RequestMethod = "OPTIONS"
	RequestMethodHead    RequestMethod = "HEAD"
	RequestMethodTrace   RequestMethod = "TRACE"
	RequestMethodConnect RequestMethod = "CONNECT"
)

func ValidateRequestMethod(value interface{}) error {
	// Convert the string value to RequestMethod
	strValue, ok := value.(string)
	if !ok {
		return fmt.Errorf("invalid request method: %v", value)
	}

	method := RequestMethod(strValue)

	// Check if the method matches any of the defined request methods
	switch method {
	case RequestMethodGet, RequestMethodPost, RequestMethodPut, RequestMethodPatch,
		RequestMethodDelete, RequestMethodOptions, RequestMethodHead, RequestMethodTrace,
		RequestMethodConnect:
		return nil
	default:
		return fmt.Errorf("invalid request method: %v", method)
	}
}

type RequestLog struct {
	ID           string       `json:"id"`
	ProjectID    string       `json:"project_id"`
	Method       string       `json:"method"`
	Path         string       `json:"path"`
	StatusCode   int          `json:"status_code"`
	Level        RequestLevel `json:"level"`
	Duration     int64        `json:"duration"` // in milliseconds
	RequestBody  JSONB        `json:"request_body,omitempty"`
	ResponseBody JSONB        `json:"response_body,omitempty"`
	Headers      JSONB        `json:"headers,omitempty"`      // Added headers
	QueryParams  JSONB        `json:"query_params,omitempty"` // Added query parameters
	UserAgent    string       `json:"user_agent,omitempty"`
	IPAddress    string       `json:"ip_address"`
	Protocol     string       `json:"protocol,omitempty"` // Added protocol (HTTP/1.1, HTTP/2, etc.)
	Host         string       `json:"host,omitempty"`     // Added host
	Error        string       `json:"error,omitempty"`    // Added error field
	Timestamp    time.Time    `json:"timestamp"`
}

func (l *RequestLog) GetLogType() string {
	return "request"
}

func (l *RequestLog) GetProjectID() string {
	return l.ProjectID
}

type RequestLevel string

const (
	RequestLevelSuccess RequestLevel = "success"
	RequestLevelWarning RequestLevel = "warning"
	RequestLevelError   RequestLevel = "error"
	RequestLevelInfo    RequestLevel = "info"
)

func ValidateRequestLevel(value interface{}) error {
	// Convert the string value to LogLevel
	strValue, ok := value.(string)
	if !ok {
		return fmt.Errorf("invalid request level: %v", value)
	}

	level := RequestLevel(strValue)

	// Check if the level matches any of the defined log levels
	switch level {
	case RequestLevelSuccess, RequestLevelWarning, RequestLevelError, RequestLevelInfo:
		return nil
	default:
		return fmt.Errorf("invalid request level: %v", level)
	}
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
			validation.By(ValidateRequestMethod),
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
	// Determine level based on status code
	var level RequestLevel
	switch {
	case r.StatusCode >= 200 && r.StatusCode < 300:
		level = RequestLevelSuccess
	case r.StatusCode >= 400 && r.StatusCode < 500:
		level = RequestLevelWarning
	case r.StatusCode >= 500:
		level = RequestLevelError
	default: // 1xx and 3xx
		level = RequestLevelInfo
	}

	return &RequestLog{
		ID:           id.String(),
		ProjectID:    r.ProjectID,
		Method:       r.Method,
		Path:         r.Path,
		StatusCode:   r.StatusCode,
		Level:        level,
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

// GetFacets generates facet data from a slice of RequestLogs
func GetRequestFacets(logs []RequestLog) Facets {
	// Initialize facet counters
	levelCounts := make(map[string]int)
	methodCounts := make(map[string]int)
	statusCounts := make(map[int]int)
	durationBuckets := make(map[int64]int)

	var minDuration, maxDuration int64
	var minStatus, maxStatus int
	hasData := false

	// Count occurrences of each value
	for _, log := range logs {
		// Level facet
		levelCounts[string(log.Level)]++

		// Method facet
		methodCounts[log.Method]++

		// Status code facet - round down to nearest hundred
		statusBucket := (log.StatusCode / 100) * 100
		statusCounts[statusBucket]++

		// Track min/max status code
		if !hasData {
			minStatus = log.StatusCode
			maxStatus = log.StatusCode
			minDuration = log.Duration
			maxDuration = log.Duration
			hasData = true
		} else {
			if log.StatusCode < minStatus {
				minStatus = log.StatusCode
			}
			if log.StatusCode > maxStatus {
				maxStatus = log.StatusCode
			}
			if log.Duration < minDuration {
				minDuration = log.Duration
			}
			if log.Duration > maxDuration {
				maxDuration = log.Duration
			}
		}

		// Calculate bucket for duration
		var bucket int64
		switch {
		case log.Duration <= 100:
			bucket = 100
		case log.Duration <= 250:
			bucket = 250
		case log.Duration <= 500:
			bucket = 500
		case log.Duration <= 750:
			bucket = 750
		case log.Duration <= 1000:
			bucket = 1000
		default:
			// For values > 1000, round to nearest 250
			bucket = ((log.Duration + 249) / 250) * 250
		}
		durationBuckets[bucket]++
	}

	// Build facet metadata
	facets := Facets{}

	// Level facet
	if len(levelCounts) > 0 {
		levelRows := make([]FacetRow, 0, len(levelCounts))
		total := 0
		for value, count := range levelCounts {
			levelRows = append(levelRows, FacetRow{
				Value: value,
				Total: count,
			})
			total += count
		}

		facets["level"] = FacetMetadata{
			Rows:  levelRows,
			Total: total,
		}
	}

	// Method facet
	if len(methodCounts) > 0 {
		methodRows := make([]FacetRow, 0, len(methodCounts))
		total := 0
		for value, count := range methodCounts {
			methodRows = append(methodRows, FacetRow{
				Value: value,
				Total: count,
			})
			total += count
		}

		facets["method"] = FacetMetadata{
			Rows:  methodRows,
			Total: total,
		}
	}

	// Status code facet
	if len(statusCounts) > 0 {
		statusRows := make([]FacetRow, 0, len(statusCounts))
		total := 0
		for value, count := range statusCounts {
			statusRows = append(statusRows, FacetRow{
				Value: value,
				Total: count,
			})
			total += count
		}

		facets["status_code"] = FacetMetadata{
			Rows:  statusRows,
			Total: total,
			Min:   minStatus,
			Max:   maxStatus,
		}
	}

	// Duration facet
	if hasData {
		durationRows := make([]FacetRow, 0, len(durationBuckets))
		total := 0
		for value, count := range durationBuckets {
			durationRows = append(durationRows, FacetRow{
				Value: value,
				Total: count,
			})
			total += count
		}

		facets["duration"] = FacetMetadata{
			Rows:  durationRows,
			Total: total,
			Min:   minDuration,
			Max:   maxDuration,
		}
	}

	return facets
}
