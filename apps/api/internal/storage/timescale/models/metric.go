package models

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation"
	"github.com/sumup/typeid"
)

type MetricID = typeid.Sortable[MetricPrefix]
type MetricPrefix struct{}

func (MetricPrefix) Prefix() string { return "met" }

// MetricType represents the type of metric
type MetricType string

const (
	MetricTypeGauge                MetricType = "GAUGE"
	MetricTypeSum                  MetricType = "SUM"
	MetricTypeHistogram            MetricType = "HISTOGRAM"
	MetricTypeExponentialHistogram MetricType = "EXPONENTIAL_HISTOGRAM"
	MetricTypeSummary              MetricType = "SUMMARY"
)

// AggregationTemporality represents how the metric aggregates over time
type AggregationTemporality string

const (
	AggregationTemporalityUnspecified AggregationTemporality = "UNSPECIFIED"
	AggregationTemporalityDelta       AggregationTemporality = "DELTA"
	AggregationTemporalityCumulative  AggregationTemporality = "CUMULATIVE"
)

// Metric represents an OpenTelemetry metric
type Metric struct {
	ID          string     `json:"id"`
	ProjectID   string     `json:"project_id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Unit        string     `json:"unit"`
	Type        MetricType `json:"type"`

	// Common fields
	Value     float64   `json:"value"`
	Timestamp time.Time `json:"timestamp"`

	// For Sum metrics
	IsMonotonic bool `json:"is_monotonic,omitempty"`

	// For Histogram metrics
	Bounds       []float64 `json:"bounds,omitempty"`
	BucketCounts []uint64  `json:"bucket_counts,omitempty"`
	Count        uint64    `json:"count,omitempty"`
	Sum          float64   `json:"sum,omitempty"`

	// For Summary metrics
	QuantileValues JSONB `json:"quantile_values,omitempty"`

	// Context
	ServiceName    string `json:"service_name"`
	ServiceVersion string `json:"service_version,omitempty"`

	// Additional attributes
	Attributes         JSONB `json:"attributes,omitempty"`
	ResourceAttributes JSONB `json:"resource_attributes,omitempty"`

	// Aggregation
	AggregationTemporality AggregationTemporality `json:"aggregation_temporality"`
}

func (m *Metric) GetLogType() string {
	return "metric"
}

func (m *Metric) GetProjectID() string {
	return m.ProjectID
}

// MetricInput validation struct
type MetricInput struct {
	ProjectID   string `json:"project_id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Unit        string `json:"unit,omitempty"`
	Type        string `json:"type"`

	// Value fields
	Value          float64            `json:"value,omitempty"`
	IsMonotonic    bool               `json:"is_monotonic,omitempty"`
	Bounds         []float64          `json:"bounds,omitempty"`
	BucketCounts   []uint64           `json:"bucket_counts,omitempty"`
	Count          uint64             `json:"count,omitempty"`
	Sum            float64            `json:"sum,omitempty"`
	QuantileValues map[string]float64 `json:"quantile_values,omitempty"`

	// Context
	ServiceName    string `json:"service_name"`
	ServiceVersion string `json:"service_version,omitempty"`

	// Additional attributes
	Attributes         map[string]any `json:"attributes,omitempty"`
	ResourceAttributes map[string]any `json:"resource_attributes,omitempty"`

	AggregationTemporality string `json:"aggregation_temporality"`
}

// TODO: Allow timestamp to be part of input

func (m MetricInput) ValidateAndCreate() (*Metric, error) {
	if err := validation.ValidateStruct(&m,
		validation.Field(&m.ProjectID, validation.Required),
		validation.Field(&m.Name, validation.Required, validation.Length(1, 255)),
		validation.Field(&m.Type,
			validation.Required,
			validation.In(string(MetricTypeGauge),
				string(MetricTypeSum),
				string(MetricTypeHistogram),
				string(MetricTypeExponentialHistogram),
				string(MetricTypeSummary)),
		),
		validation.Field(&m.ServiceName, validation.Required),
		validation.Field(&m.AggregationTemporality,
			validation.In(string(AggregationTemporalityUnspecified),
				string(AggregationTemporalityDelta),
				string(AggregationTemporalityCumulative)),
		),
	); err != nil {
		return nil, err
	}

	id, err := typeid.New[MetricID]()
	if err != nil {
		return nil, err
	}

	return &Metric{
		ID:                     id.String(),
		ProjectID:              m.ProjectID,
		Name:                   m.Name,
		Description:            m.Description,
		Unit:                   m.Unit,
		Type:                   MetricType(m.Type),
		Value:                  m.Value,
		IsMonotonic:            m.IsMonotonic,
		Bounds:                 m.Bounds,
		BucketCounts:           m.BucketCounts,
		Count:                  m.Count,
		Sum:                    m.Sum,
		QuantileValues:         ConvertToJSONB(m.QuantileValues),
		ServiceName:            m.ServiceName,
		ServiceVersion:         m.ServiceVersion,
		Attributes:             ConvertToJSONB(m.Attributes),
		ResourceAttributes:     ConvertToJSONB(m.ResourceAttributes),
		AggregationTemporality: AggregationTemporality(m.AggregationTemporality),
		Timestamp:              time.Now(),
	}, nil
}
