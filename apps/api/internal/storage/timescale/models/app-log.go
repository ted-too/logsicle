package models

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation"
	"github.com/sumup/typeid"
)

// Application logs (debug, info, error logs)

type AppLogID = typeid.Sortable[AppLogPrefix]
type AppLogPrefix struct{}

func (AppLogPrefix) Prefix() string { return "app" }

type LogLevel string

const (
	LogLevelDebug   LogLevel = "debug"
	LogLevelInfo    LogLevel = "info"
	LogLevelWarning LogLevel = "warning"
	LogLevelError   LogLevel = "error"
	LogLevelFatal   LogLevel = "fatal"
)

func ValidateLogLevel(value interface{}) error {
	// Convert the string value to LogLevel
	strValue, ok := value.(string)
	if !ok {
		return fmt.Errorf("invalid log level: %v", value)
	}

	level := LogLevel(strValue)

	// Check if the level matches any of the defined log levels
	switch level {
	case LogLevelDebug, LogLevelInfo, LogLevelWarning, LogLevelError, LogLevelFatal:
		return nil
	default:
		return fmt.Errorf("invalid log level: %v", level)
	}
}

type AppLog struct {
	ID        string `json:"id"`
	ProjectID string `json:"project_id"`

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

func (l *AppLog) GetLogType() string {
	return "app"
}

func (l *AppLog) GetProjectID() string {
	return l.ProjectID
}

func (l AppLog) MarshalJSON() ([]byte, error) {
	type Alias AppLog // Prevent recursive MarshalJSON calls

	clean := struct {
		*Alias
		Caller      *string `json:"caller"`
		Function    *string `json:"function"`
		Version     *string `json:"version"`
		Environment *string `json:"environment"`
		Host        *string `json:"host"`
	}{
		Alias: (*Alias)(&l),
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

type AppLogInput struct {
	ProjectID   string         `json:"project_id"`
	Level       string         `json:"level"`
	Message     string         `json:"message"`
	Fields      map[string]any `json:"fields,omitempty"`
	Caller      *string        `json:"caller,omitempty"`
	Function    *string        `json:"function,omitempty"`
	ServiceName string         `json:"service_name"`
	Version     string         `json:"version,omitempty"`
	Timestamp   interface{}    `json:"timestamp,omitempty"`
	Environment string         `json:"environment,omitempty"`
	Host        string         `json:"host,omitempty"`
}

func (a AppLogInput) ValidateAndCreate() (*AppLog, error) {
	if err := validation.ValidateStruct(&a,
		validation.Field(&a.ProjectID,
			validation.Required,
		),
		validation.Field(&a.Level,
			validation.Required,
			validation.By(ValidateLogLevel),
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
		fieldsJSON = ConvertToJSONB(a.Fields)
	} else {
		fieldsJSON = JSONB(`{}`)
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

	timestamp, err := ParseTimestamp(a.Timestamp)
	if err != nil {
		return nil, err
	}

	return &AppLog{
		ID:          id.String(),
		ProjectID:   a.ProjectID,
		Level:       LogLevel(a.Level),
		Message:     a.Message,
		Fields:      fieldsJSON,
		Caller:      caller,
		Function:    function,
		ServiceName: a.ServiceName,
		Version:     version,
		Environment: environment,
		Host:        host,
		Timestamp:   timestamp,
	}, nil
}

// GetAppFacets generates facet data from a slice of AppLogs
func GetAppFacets(logs []AppLog) Facets {
	// Initialize facet counters
	levelCounts := make(map[string]int)
	serviceNameCounts := make(map[string]int)
	environmentCounts := make(map[string]int)
	hostCounts := make(map[string]int)

	// Count occurrences of each value
	for _, log := range logs {
		// Level facet
		levelCounts[string(log.Level)]++

		// Service name facet
		serviceNameCounts[log.ServiceName]++

		// Environment facet
		if log.Environment.Valid {
			environmentCounts[log.Environment.String]++
		}

		// Host facet
		if log.Host.Valid {
			hostCounts[log.Host.String]++
		}
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

	// Service name facet
	if len(serviceNameCounts) > 0 {
		serviceRows := make([]FacetRow, 0, len(serviceNameCounts))
		total := 0
		for value, count := range serviceNameCounts {
			serviceRows = append(serviceRows, FacetRow{
				Value: value,
				Total: count,
			})
			total += count
		}

		facets["service_name"] = FacetMetadata{
			Rows:  serviceRows,
			Total: total,
		}
	}

	// Environment facet
	if len(environmentCounts) > 0 {
		envRows := make([]FacetRow, 0, len(environmentCounts))
		total := 0
		for value, count := range environmentCounts {
			envRows = append(envRows, FacetRow{
				Value: value,
				Total: count,
			})
			total += count
		}

		facets["environment"] = FacetMetadata{
			Rows:  envRows,
			Total: total,
		}
	}

	// Host facet
	if len(hostCounts) > 0 {
		hostRows := make([]FacetRow, 0, len(hostCounts))
		total := 0
		for value, count := range hostCounts {
			hostRows = append(hostRows, FacetRow{
				Value: value,
				Total: count,
			})
			total += count
		}

		facets["host"] = FacetMetadata{
			Rows:  hostRows,
			Total: total,
		}
	}

	return facets
}
