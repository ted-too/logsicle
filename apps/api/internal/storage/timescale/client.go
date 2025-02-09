package timescale

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
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

// BulkInsertEventLogs inserts multiple event logs in a single transaction
func (c *TimescaleClient) BulkInsertEventLogs(ctx context.Context, logs []*EventLog) error {
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

// BulkInsertAppLogs inserts multiple application logs in a single transaction
func (c *TimescaleClient) BulkInsertAppLogs(ctx context.Context, logs []*AppLog) error {
	batch := &pgx.Batch{}

	for _, log := range logs {
		batch.Queue(`
			INSERT INTO app_logs (
				id, project_id, channel_id, level, message,
				metadata, stack_trace, service_name, timestamp
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			log.ID, log.ProjectID, log.ChannelID, log.Level, log.Message,
			log.Metadata, log.StackTrace, log.ServiceName, log.Timestamp,
		)
	}

	return c.executeBatch(ctx, batch)
}

// BulkInsertRequestLogs inserts multiple request logs in a single transaction
func (c *TimescaleClient) BulkInsertRequestLogs(ctx context.Context, logs []*RequestLog) error {
	batch := &pgx.Batch{}

	for _, log := range logs {
		batch.Queue(`
			INSERT INTO request_logs (
				id, project_id, channel_id, method, path,
				status_code, duration, request_body, response_body,
				user_agent, ip_address, timestamp
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
			log.ID, log.ProjectID, log.ChannelID, log.Method, log.Path,
			log.StatusCode, log.Duration, log.RequestBody, log.ResponseBody,
			log.UserAgent, log.IPAddress, log.Timestamp,
		)
	}

	return c.executeBatch(ctx, batch)
}

// BulkInsertMetrics inserts multiple metrics in a single transaction
func (c *TimescaleClient) BulkInsertMetrics(ctx context.Context, metrics []*Trace) error {
	batch := &pgx.Batch{}

	for _, metric := range metrics {
		batch.Queue(`
			INSERT INTO metrics (
				id, project_id, name, value, labels, timestamp
			) VALUES ($1, $2, $3, $4, $5, $6)`,
			metric.ID, metric.ProjectID, metric.Name, metric.Value,
			metric.Labels, metric.Timestamp,
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
