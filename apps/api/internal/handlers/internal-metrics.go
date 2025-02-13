package handlers

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/queue"
)

type MetricsHandler struct {
	processor *queue.Processor
}

func NewMetricsHandler(processor *queue.Processor) *MetricsHandler {
	return &MetricsHandler{processor: processor}
}

func (h *MetricsHandler) GetQueueMetrics(c fiber.Ctx) error {
	metrics := h.processor.GetInternalMetrics()
	return c.JSON(metrics)
}
