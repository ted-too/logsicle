package handlers

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/queue"
	"github.com/ted-too/logsicle/internal/storage/timescale"
)

type IngestHandler struct {
	qs *queue.QueueService
}

func NewIngestHandler(qs *queue.QueueService) *IngestHandler {
	return &IngestHandler{qs: qs}
}

// IngestEventLog handles event log ingestion
func (h *IngestHandler) IngestEventLog(c fiber.Ctx) error {
	log := new(timescale.EventLog)
	if err := c.Bind().JSON(log); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
	}

	if err := h.qs.EnqueueEventLog(c.Context(), log); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to enqueue event log",
		})
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"message": "Event log accepted",
		"id":      log.ID,
	})
}

// IngestAppLog handles application log ingestion
func (h *IngestHandler) IngestAppLog(c fiber.Ctx) error {
	log := new(timescale.AppLog)
	if err := c.Bind().JSON(log); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
	}

	if err := h.qs.EnqueueAppLog(c.Context(), log); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to enqueue application log",
		})
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"message": "Application log accepted",
		"id":      log.ID,
	})
}

// IngestRequestLog handles request log ingestion
func (h *IngestHandler) IngestRequestLog(c fiber.Ctx) error {
	log := new(timescale.RequestLog)
	if err := c.Bind().JSON(log); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
	}

	if err := h.qs.EnqueueRequestLog(c.Context(), log); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to enqueue request log",
		})
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"message": "Request log accepted",
		"id":      log.ID,
	})
}

// IngestMetric handles metric ingestion
func (h *IngestHandler) IngestMetric(c fiber.Ctx) error {
	metric := new(timescale.Metric)
	if err := c.Bind().JSON(metric); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
	}

	if err := h.qs.EnqueueMetric(c.Context(), metric); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to enqueue metric",
		})
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"message": "Metric accepted",
		"id":      metric.ID,
	})
}
