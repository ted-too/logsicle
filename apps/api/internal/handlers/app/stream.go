package app

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

// StreamAppLogs streams app logs for a project in real-time
func (h *AppLogsHandler) StreamAppLogs(c fiber.Ctx) error {
	projectID := c.Params("id")

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	ctx := c.Context()
	channel := make(chan models.AppLog)

	// Start Redis subscription in a goroutine
	go h.subscribeToAppLogs(ctx, projectID, channel)

	c.SendStreamWriter(func(w *bufio.Writer) {
		for {
			select {
			case appLog := <-channel:
				jsonData, err := json.Marshal(appLog)
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

func (h *AppLogsHandler) subscribeToAppLogs(ctx context.Context, projectID string, channel chan models.AppLog) {
	// Subscribe only to app logs channel
	appChannel := fmt.Sprintf("logs:%s:app", projectID)
	pubsub := h.queue.Redis.Subscribe(ctx, appChannel)
	defer pubsub.Close()

	for {
		msg, err := pubsub.ReceiveMessage(ctx)
		if err != nil {
			return
		}

		var appLog models.AppLog
		if err := json.Unmarshal([]byte(msg.Payload), &appLog); err != nil {
			log.Error("Error unmarshaling app log: %v", err)
			continue
		}

		channel <- appLog
	}
}
