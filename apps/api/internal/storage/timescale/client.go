package timescale

import (
	"context"
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

// Common query options for all log types
type CommonLogQueryOptions struct {
	Start  int64   `json:"start"` // Unix timestamp in milliseconds
	End    int64   `json:"end"`   // Unix timestamp in milliseconds
	Limit  int     `json:"limit"`
	Page   int     `json:"page"`
	Search *string `json:"search,omitempty"`
}

// Validate implements validation.Validatable
func (q CommonLogQueryOptions) Validate() error {
	return validation.ValidateStruct(&q,
		validation.Field(&q.Start, validation.Required),
		validation.Field(&q.End, validation.Required, validation.Min(q.Start)),
		validation.Field(&q.Limit, validation.Required, validation.Min(1), validation.Max(100)),
		validation.Field(&q.Page, validation.Required, validation.Min(1)),
	)
}

// Helper function to convert Unix timestamp (ms) to time.Time
func UnixMsToTime(ts int64) time.Time {
	return time.Unix(0, ts*int64(time.Millisecond))
}

// Helper function to convert time.Time to Unix timestamp (ms)
func TimeToUnixMs(t time.Time) int64 {
	return t.UnixNano() / int64(time.Millisecond)
}

// Common metrics query options
type CommonMetricsQueryOptions struct {
	Start    int64  `json:"start"` // Unix timestamp in milliseconds
	End      int64  `json:"end"`   // Unix timestamp in milliseconds
	Interval string `json:"interval,omitempty"`
}

// Validate implements validation.Validatable
func (q CommonMetricsQueryOptions) Validate() error {
	validIntervals := []interface{}{"1m", "5m", "15m", "30m", "1h", "6h", "12h", "24h"}
	return validation.ValidateStruct(&q,
		validation.Field(&q.Start, validation.Required),
		validation.Field(&q.End, validation.Required, validation.Min(q.Start)),
		validation.Field(&q.Interval, validation.In(validIntervals...)),
	)
}

type TimeMetric struct {
	Timestamp int64 `json:"timestamp"`
	Count     int   `json:"count"`
}

// Helper function to suggest interval based on time range
func SuggestInterval(start, end int64) string {
	duration := end - start
	hours := float64(duration) / float64(time.Hour.Milliseconds())

	switch {
	case hours <= 2:
		return "1m"
	case hours <= 6:
		return "5m"
	case hours <= 12:
		return "15m"
	case hours <= 24:
		return "30m"
	case hours <= 24*3: // 3 days
		return "1h"
	case hours <= 24*7: // 7 days
		return "6h"
	case hours <= 24*14: // 14 days
		return "12h"
	default:
		return "24h"
	}
}

// ConvertIntervalToPostgresFormat converts our short interval notation to PostgreSQL interval format
// e.g. "1m" -> '1 minute', "5m" -> '5 minutes', "1h" -> '1 hour', etc.
func ConvertIntervalToPostgresFormat(interval string) string {
	if len(interval) < 2 {
		return interval
	}

	// Extract the number and unit
	value := interval[:len(interval)-1]
	unit := interval[len(interval)-1:]

	switch unit {
	case "m":
		if value == "1" {
			return "'" + value + " minute'"
		}
		return "'" + value + " minutes'"
	case "h":
		if value == "1" {
			return "'" + value + " hour'"
		}
		return "'" + value + " hours'"
	case "d":
		if value == "1" {
			return "'" + value + " day'"
		}
		return "'" + value + " days'"
	}

	return interval
}

// // ConvertIntervalToPgtypeInterval converts our short interval notation to PostgreSQL interval format
// // e.g. "1m" -> "1 minute", "5m" -> "5 minutes", "1h" -> "1 hour", etc.
// func ConvertIntervalToPgtypeInterval(interval string) pgtype.Interval {
// 	if len(interval) < 2 {
// 		return pgtype.Interval{
// 			Microseconds: 0,
// 			Days:         0,
// 			Months:       0,
// 			Valid:        false,
// 		}
// 	}

// 	// Extract the number and unit
// 	value := interval[:len(interval)-1]
// 	unit := interval[len(interval)-1:]

// 	// Convert value to int64
// 	val, err := strconv.ParseInt(value, 10, 64)
// 	if err != nil {
// 		return pgtype.Interval{Valid: false}
// 	}

// 	switch unit {
// 	case "m":
// 		return pgtype.Interval{
// 			Microseconds: val * int64(time.Minute) * 1000,
// 			Days:         0,
// 			Months:       0,
// 			Valid:        true,
// 		}
// 	case "h":
// 		return pgtype.Interval{
// 			Microseconds: val * int64(time.Hour) * 1000,
// 			Days:         0,
// 			Months:       0,
// 			Valid:        true,
// 		}
// 	case "d":
// 		return pgtype.Interval{
// 			Microseconds: 0,
// 			Days:         int32(val),
// 			Months:       0,
// 			Valid:        true,
// 		}
// 	}

// 	return pgtype.Interval{Valid: false}
// }

// func ConvertPgtypeIntervalToValue(interval pgtype.Interval) int64 {
// 	if interval.Valid {
// 		// Convert microseconds to milliseconds and add days and months
// 		milliseconds := interval.Microseconds / int64(time.Millisecond)
// 		days := int64(interval.Days) * 24 * 60 * 60 * 1000          // Convert days to milliseconds
// 		months := int64(interval.Months) * 30 * 24 * 60 * 60 * 1000 // Approximate months as 30 days
// 		return milliseconds + days + months
// 	}
// 	return 0
// }

// func ConvertIntervalToValue(interval string) int64 {
// 	pgInterval := ConvertIntervalToPgtypeInterval(interval)
// 	return ConvertPgtypeIntervalToValue(pgInterval)
// }

type PaginationMeta struct {
	TotalRowCount         int  `json:"totalRowCount"`
	TotalFilteredRowCount int  `json:"totalFilteredRowCount"`
	CurrentPage           int  `json:"currentPage"`
	NextPage              *int `json:"nextPage"`
	PrevPage              *int `json:"prevPage"`
}

type TimescaleClient struct {
	Pool *pgxpool.Pool
}

func NewTimescaleClient(ctx context.Context, connString string) (*TimescaleClient, error) {
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, err
	}

	// Optimize for bulk inserts
	config.MaxConns = 20
	config.MinConns = 5

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, err
	}

	return &TimescaleClient{Pool: pool}, nil
}

func (c *TimescaleClient) BulkInsertEventLogs(ctx context.Context, logs []*models.EventLog) error {
	batch := &pgx.Batch{}

	for _, log := range logs {
		batch.Queue(`
			INSERT INTO event_logs (
				id, project_id, channel_id, name, description, 
				metadata, tags, timestamp
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			log.ID, log.ProjectID, log.ChannelID, log.Name, log.Description,
			log.Metadata, log.Tags, log.Timestamp,
		)
	}

	return c.executeBatch(ctx, batch)
}

func (c *TimescaleClient) BulkInsertAppLogs(ctx context.Context, logs []*models.AppLog) error {
	batch := &pgx.Batch{}

	for _, log := range logs {
		batch.Queue(`
			INSERT INTO app_logs (
				id, project_id, level, message,
				fields, timestamp, caller, function,
				service_name, version, environment, host
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
			log.ID, log.ProjectID, log.Level, log.Message,
			log.Fields, log.Timestamp, log.Caller, log.Function,
			log.ServiceName, log.Version, log.Environment, log.Host,
		)
	}

	return c.executeBatch(ctx, batch)
}

func (c *TimescaleClient) BulkInsertRequestLogs(ctx context.Context, logs []*models.RequestLog) error {
	batch := &pgx.Batch{}

	for _, log := range logs {
		batch.Queue(`
					INSERT INTO request_logs (
							id, project_id, method, path,
							status_code, duration, request_body, response_body,
							headers, query_params, user_agent, ip_address,
							protocol, host, error, timestamp
					) VALUES (
							$1, $2, $3, $4, $5, $6, $7, $8,
							$9, $10, $11, $12, $13, $14, $15, $16
					)`,
			log.ID,
			log.ProjectID,
			log.Method,
			log.Path,
			log.StatusCode,
			log.Duration,
			log.RequestBody,
			log.ResponseBody,
			log.Headers,
			log.QueryParams,
			log.UserAgent,
			log.IPAddress,
			log.Protocol,
			log.Host,
			log.Error,
			log.Timestamp,
		)
	}

	return c.executeBatch(ctx, batch)
}

func (c *TimescaleClient) BulkInsertMetrics(ctx context.Context, metrics []*models.Metric) error {
	batch := &pgx.Batch{}

	for _, metric := range metrics {
		batch.Queue(`
				INSERT INTO metrics (
						id, project_id, name, description, unit, type,
						value, timestamp,
						is_monotonic,
						bounds, bucket_counts, count, sum,
						quantile_values,
						service_name, service_version,
						attributes, resource_attributes,
						aggregation_temporality
				) VALUES (
						$1, $2, $3, $4, $5, $6,
						$7, $8,
						$9,
						$10, $11, $12, $13,
						$14,
						$15, $16,
						$17, $18,
						$19
				)`,
			metric.ID,
			metric.ProjectID,
			metric.Name,
			metric.Description,
			metric.Unit,
			metric.Type,
			metric.Value,
			metric.Timestamp,
			metric.IsMonotonic,
			metric.Bounds,
			metric.BucketCounts,
			metric.Count,
			metric.Sum,
			metric.QuantileValues,
			metric.ServiceName,
			metric.ServiceVersion,
			metric.Attributes,
			metric.ResourceAttributes,
			metric.AggregationTemporality,
		)
	}

	return c.executeBatch(ctx, batch)
}

func (c *TimescaleClient) BulkInsertTraces(ctx context.Context, traces []*models.Trace) error {
	batch := &pgx.Batch{}

	for _, trace := range traces {
		batch.Queue(`
				INSERT INTO traces (
						id, trace_id, parent_id, project_id,
						name, kind, start_time, end_time,
						duration_ms, status, status_message,
						service_name, service_version,
						attributes, events, links,
						resource_attributes, timestamp
				) VALUES (
						$1, $2, $3, $4,
						$5, $6, $7, $8,
						$9, $10, $11,
						$12, $13,
						$14, $15, $16,
						$17, $18
				)`,
			trace.ID,
			trace.TraceID,
			trace.ParentID,
			trace.ProjectID,
			trace.Name,
			trace.Kind,
			trace.StartTime,
			trace.EndTime,
			trace.DurationMs,
			trace.Status,
			trace.StatusMsg,
			trace.ServiceName,
			trace.ServiceVersion,
			trace.Attributes,
			trace.Events,
			trace.Links,
			trace.ResourceAttributes,
			trace.Timestamp,
		)
	}

	return c.executeBatch(ctx, batch)
}

// executeBatch is a helper function to execute a batch and handle the results
func (c *TimescaleClient) executeBatch(ctx context.Context, batch *pgx.Batch) error {
	br := c.Pool.SendBatch(ctx, batch)
	defer br.Close()

	// Execute each command in the batch and check for errors
	for i := 0; i < batch.Len(); i++ {
		_, err := br.Exec()
		if err != nil {
			return fmt.Errorf("batch execution failed at index %d: %w", i, err)
		}
	}

	return br.Close()
}

// Close closes the database connection pool
func (c *TimescaleClient) Close() {
	c.Pool.Close()
}
