package handlers

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/queue"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

type IngestHandler struct {
	qs *queue.QueueService
}

func NewIngestHandler(qs *queue.QueueService) *IngestHandler {
	return &IngestHandler{qs: qs}
}

// IngestEventLog handles event log ingestion
func (h *IngestHandler) IngestEventLog(c fiber.Ctx) error {
	input := new(models.EventLogInput)
	if err := c.Bind().JSON(input); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	channelID, ok := c.Locals("channel_id").(string)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get channel ID",
		})
	}

	log, err := input.ValidateAndCreate(channelID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	if err := h.qs.EnqueueEventLog(c.Context(), log); err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	return c.SendStatus(fiber.StatusAccepted)
}

// IngestAppLog handles application log ingestion
func (h *IngestHandler) IngestAppLog(c fiber.Ctx) error {
	input := new(models.AppLogInput)
	if err := c.Bind().JSON(input); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	log, err := input.ValidateAndCreate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	if err := h.qs.EnqueueAppLog(c.Context(), log); err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	return c.SendStatus(fiber.StatusAccepted)
}

// IngestRequestLog handles request log ingestion
func (h *IngestHandler) IngestRequestLog(c fiber.Ctx) error {
	input := new(models.RequestLogInput)
	if err := c.Bind().JSON(input); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	log, err := input.ValidateAndCreate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	if err := h.qs.EnqueueRequestLog(c.Context(), log); err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	return c.SendStatus(fiber.StatusAccepted)
}

// IngestTrace handles metric ingestion
func (h *IngestHandler) IngestTrace(c fiber.Ctx) error {
	input := new(models.MetricInput)
	if err := c.Bind().JSON(input); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	metric, err := input.ValidateAndCreate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	if err := h.qs.EnqueueMetric(c.Context(), metric); err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	return c.SendStatus(fiber.StatusAccepted)
}
