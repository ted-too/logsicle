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
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
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
	if _, err := verifyDashboardProjectAccess(h.db, c, projectID, userID); err != nil {
		return err
	}

	// Get log types from query params
	logTypes := c.Query("types", "") // Default empty string if not provided

	// Convert comma-separated string to slice of types
	var selectedTypes []string
	if logTypes != "" {
		selectedTypes = strings.Split(logTypes, ",")
		// Validate log types
		validTypes := map[string]bool{"event": true, "app": true, "request": true, "metric": true}
		for _, t := range selectedTypes {
			if !validTypes[t] {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": fmt.Sprintf("Invalid log type: %s", t),
				})
			}
		}
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	ctx := c.Context()
	channel := make(chan LogEvent)

	// Start Redis subscription in a goroutine
	go h.subscribeToLogs(ctx, projectID, selectedTypes, channel)

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

func (h *StreamHandler) subscribeToLogs(ctx context.Context, projectID string, selectedTypes []string, channel chan LogEvent) {
	// If no types specified, subscribe to all
	subscribeTypes := []string{"event", "app", "request", "metric"}
	if len(selectedTypes) > 0 {
		subscribeTypes = selectedTypes
	}

	// Build channels to subscribe to
	channels := make([]string, len(subscribeTypes))
	for i, logType := range subscribeTypes {
		channels[i] = fmt.Sprintf("logs:%s:%s", projectID, logType)
	}

	pubsub := h.redis.Subscribe(ctx, channels...)
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
			var eventLog models.EventLog
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
