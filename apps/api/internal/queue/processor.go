// apps/api/internal/queue/processor.go
package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/ted-too/logsicle/internal/storage/timescale"
)

type Processor struct {
	qs              *QueueService
	processedCount  map[string]int64
	errorCount      map[string]int64
	lastProcessTime map[string]time.Time
	mu              sync.RWMutex
}

// processorConfig holds the configuration for each stream processor
type processorConfig[T timescale.LogEntry] struct {
	stream     string
	bulkInsert func(context.Context, []T) error
}

// streamProcessor is a generic processor for a specific type
type streamProcessor[T timescale.LogEntry] struct {
	qs        *QueueService
	cfg       processorConfig[T]
	processor *Processor // Add reference to main processor for metrics
}

func NewProcessor(qs *QueueService) *Processor {
	return &Processor{
		qs:              qs,
		processedCount:  make(map[string]int64),
		errorCount:      make(map[string]int64),
		lastProcessTime: make(map[string]time.Time),
	}
}

func (p *Processor) Start(ctx context.Context) {
	go p.processEventLogs(ctx)
	go p.processAppLogs(ctx)
	go p.processRequestLogs(ctx)
	go p.processMetrics(ctx)
}

// newStreamProcessor creates a new stream processor for a specific type
func newStreamProcessor[T timescale.LogEntry](p *Processor, cfg processorConfig[T]) *streamProcessor[T] {
	return &streamProcessor[T]{
		qs:        p.qs,
		cfg:       cfg,
		processor: p,
	}
}

// process handles the common Redis stream processing logic
func (sp *streamProcessor[T]) process(ctx context.Context) {
	backoff := time.Second
	maxBackoff := time.Minute

	for {
		select {
		case <-ctx.Done():
			return
		default:
			streams, err := sp.qs.Redis.XRead(ctx, &redis.XReadArgs{
				Streams: []string{sp.cfg.stream, "0"},
				Count:   BatchSize,
				Block:   time.Second * 1,
			}).Result()

			if err != nil {
				if err != redis.Nil {
					sp.processor.incrementErrorCount(sp.cfg.stream)
					log.Printf("Error reading from stream %s: %v", sp.cfg.stream, err)
					// Exponential backoff
					time.Sleep(backoff)
					backoff = min(backoff*2, maxBackoff)
				}
				continue
			}
			// Reset backoff on successful read
			backoff = time.Second

			// Process batch with retries
			if err := sp.processBatch(ctx, streams[0].Messages); err != nil {
				sp.processor.incrementErrorCount(sp.cfg.stream)
				log.Printf("Error processing batch for %s: %v", sp.cfg.stream, err)
				continue
			}

			sp.processor.updateInternalMetrics(sp.cfg.stream, len(streams[0].Messages))
		}
	}
}

func (sp *streamProcessor[T]) processWithRecovery(ctx context.Context) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in %s processor: %v", sp.cfg.stream, r)
			// Wait before restarting
			time.Sleep(5 * time.Second)
			go sp.processWithRecovery(ctx)
		}
	}()
	sp.process(ctx)
}

// processBatch handles processing a batch of messages
func (sp *streamProcessor[T]) processBatch(ctx context.Context, messages []redis.XMessage) error {
	var batch []T
	var messageIDs []string

	for _, msg := range messages {
		data := msg.Values["data"].(string)
		var item T
		if err := json.Unmarshal([]byte(data), &item); err != nil {
			log.Printf("Error unmarshaling data from stream %s: %v", sp.cfg.stream, err)
			continue
		}

		batch = append(batch, item)
		messageIDs = append(messageIDs, msg.ID)
	}

	if len(batch) > 0 {
		if err := sp.cfg.bulkInsert(ctx, batch); err != nil {
			return err
		}

		// Publish to Redis for live updates
		for _, item := range batch {
			data, err := json.Marshal(item)
			if err != nil {
				continue
			}

			channel := fmt.Sprintf("logs:%s:%s", item.GetProjectID(), item.GetLogType())
			sp.qs.Redis.Publish(ctx, channel, string(data))
		}

		// Acknowledge processed messages
		sp.qs.Redis.XDel(ctx, sp.cfg.stream, messageIDs...)
	}

	return nil
}

// Metrics methods on the main Processor
func (p *Processor) updateInternalMetrics(stream string, count int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.processedCount[stream] += int64(count)
	p.lastProcessTime[stream] = time.Now()
}

func (p *Processor) incrementErrorCount(stream string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.errorCount[stream]++
}

func (p *Processor) GetInternalMetrics() map[string]interface{} {
	p.mu.RLock()
	defer p.mu.RUnlock()

	return map[string]interface{}{
		"processed_count":   p.processedCount,
		"error_count":       p.errorCount,
		"last_process_time": p.lastProcessTime,
	}
}

// Type-specific processors
func (p *Processor) processEventLogs(ctx context.Context) {
	cfg := processorConfig[*timescale.EventLog]{
		stream:     EventLogStream,
		bulkInsert: p.qs.ts.BulkInsertEventLogs,
	}
	newStreamProcessor(p, cfg).processWithRecovery(ctx)
}

func (p *Processor) processAppLogs(ctx context.Context) {
	cfg := processorConfig[*timescale.AppLog]{
		stream:     AppLogStream,
		bulkInsert: p.qs.ts.BulkInsertAppLogs,
	}
	newStreamProcessor(p, cfg).processWithRecovery(ctx)
}

func (p *Processor) processRequestLogs(ctx context.Context) {
	cfg := processorConfig[*timescale.RequestLog]{
		stream:     RequestLogStream,
		bulkInsert: p.qs.ts.BulkInsertRequestLogs,
	}
	newStreamProcessor(p, cfg).processWithRecovery(ctx)
}

func (p *Processor) processMetrics(ctx context.Context) {
	cfg := processorConfig[*timescale.Metric]{
		stream:     MetricStream,
		bulkInsert: p.qs.ts.BulkInsertMetrics,
	}
	newStreamProcessor(p, cfg).processWithRecovery(ctx)
}

func min(a, b time.Duration) time.Duration {
	if a < b {
		return a
	}
	return b
}
