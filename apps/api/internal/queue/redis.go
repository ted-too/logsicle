package queue

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
	"github.com/ted-too/logsicle/internal/storage/timescale"
)

const (
	EventLogStream   = "event_logs"
	AppLogStream     = "app_logs"
	RequestLogStream = "request_logs"
	MetricStream     = "metrics"
	BatchSize        = 100
	MaxRetries       = 3
)

type QueueService struct {
	Redis *redis.Client
	ts    *timescale.TimescaleClient
}

func NewQueueService(redisURL string, ts *timescale.TimescaleClient) (*QueueService, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	client := redis.NewClient(opt)
	return &QueueService{
		Redis: client,
		ts:    ts,
	}, nil
}

// EnqueueEventLog adds an event log to the queue
func (q *QueueService) EnqueueEventLog(ctx context.Context, log *timescale.EventLog) error {
	return q.enqueue(ctx, EventLogStream, log)
}

// EnqueueAppLog adds an application log to the queue
func (q *QueueService) EnqueueAppLog(ctx context.Context, log *timescale.AppLog) error {
	return q.enqueue(ctx, AppLogStream, log)
}

// EnqueueRequestLog adds a request log to the queue
func (q *QueueService) EnqueueRequestLog(ctx context.Context, log *timescale.RequestLog) error {
	return q.enqueue(ctx, RequestLogStream, log)
}

// EnqueueMetric adds a metric to the queue
func (q *QueueService) EnqueueMetric(ctx context.Context, metric *timescale.Trace) error {
	return q.enqueue(ctx, MetricStream, metric)
}

// Generic enqueue function
func (q *QueueService) enqueue(ctx context.Context, stream string, data interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %w", err)
	}

	return q.Redis.XAdd(ctx, &redis.XAddArgs{
		Stream: stream,
		Values: map[string]interface{}{
			"data": jsonData,
		},
	}).Err()
}

// Close closes all connections
func (q *QueueService) Close() error {
	if err := q.Redis.Close(); err != nil {
		return fmt.Errorf("failed to close redis connection: %w", err)
	}
	q.ts.Close()
	return nil
}
