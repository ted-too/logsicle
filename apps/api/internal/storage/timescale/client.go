package timescale

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

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
