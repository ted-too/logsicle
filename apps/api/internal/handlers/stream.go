// apps/api/internal/handlers/stream.go
package handlers

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/redis/go-redis/v9"
	"github.com/ted-too/logsicle/internal/storage/models"
	"github.com/ted-too/logsicle/internal/storage/timescale"
	"gorm.io/gorm"
)

type LogEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type StreamHandler struct {
	redis *redis.Client
	db    *gorm.DB
}

func NewStreamHandler(redis *redis.Client, db *gorm.DB) *StreamHandler {
	return &StreamHandler{redis: redis, db: db}
}

func (h *StreamHandler) StreamLogs(c fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("user-id").(string)

	// Verify project access
	var project models.Project
	if err := h.db.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Project not found or access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to verify project access",
		})
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	ctx := c.Context()
	channel := make(chan LogEvent)

	// Start Redis subscription in a goroutine
	go h.subscribeToLogs(ctx, projectID, channel)

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

func (h *StreamHandler) subscribeToLogs(ctx context.Context, projectID string, channel chan LogEvent) {
	pubsub := h.redis.Subscribe(ctx,
		fmt.Sprintf("logs:%s:event", projectID),
		fmt.Sprintf("logs:%s:app", projectID),
		fmt.Sprintf("logs:%s:request", projectID),
		fmt.Sprintf("logs:%s:metric", projectID),
	)
	defer pubsub.Close()

	for {
		msg, err := pubsub.ReceiveMessage(ctx)
		if err != nil {
			return
		}

		logType := getLogTypeFromChannel(msg.Channel)

		// Handle different log types
		var data interface{}
		switch logType {
		case "event":
			var eventLog timescale.EventLog
			if err := json.Unmarshal([]byte(msg.Payload), &eventLog); err != nil {
				log.Error("Error unmarshaling event log: %v", err)
				continue
			}
			data = eventLog
		default:
			// For other types, unmarshal into interface{}
			if err := json.Unmarshal([]byte(msg.Payload), &data); err != nil {
				continue
			}
		}

		channel <- LogEvent{
			Type: logType,
			Data: data,
		}
	}
}

func getLogTypeFromChannel(channel string) string {
	// Extract the last part after the last colon
	// e.g., "logs:123:event" -> "event"
	parts := strings.Split(channel, ":")
	return parts[len(parts)-1]
}
