package requests

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

type LogEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// StreamLogs streams request logs for a project in real-time
func (h *RequestLogsHandler) StreamLogs(c fiber.Ctx) error {
	projectID := c.Params("id")

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	ctx := c.Context()
	channel := make(chan LogEvent)

	// Start Redis subscription in a goroutine
	go h.subscribeToRequestLogs(ctx, projectID, channel)

	c.SendStreamWriter(func(w *bufio.Writer) {
		for {
			select {
			case event := <-channel:
				jsonData, err := json.Marshal(event)
				if err != nil {
					continue
				}
				fmt.Fprintf(w, "data: %s\n\n", jsonData)
				w.Flush()
			case <-ctx.Done():
				return
			}
		}
	})

	return nil
}

func (h *RequestLogsHandler) subscribeToRequestLogs(ctx context.Context, projectID string, channel chan LogEvent) {
	// Subscribe only to request logs channel
	requestChannel := fmt.Sprintf("logs:%s:request", projectID)
	pubsub := h.queue.Redis.Subscribe(ctx, requestChannel)
	defer pubsub.Close()

	for {
		msg, err := pubsub.ReceiveMessage(ctx)
		if err != nil {
			return
		}

		var requestLog models.RequestLog
		if err := json.Unmarshal([]byte(msg.Payload), &requestLog); err != nil {
			log.Error("Error unmarshaling request log: %v", err)
			continue
		}

		channel <- LogEvent{
			Type: "request",
			Data: requestLog,
		}
	}
}
