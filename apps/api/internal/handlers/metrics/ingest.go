package metrics

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

func (h *MetricsHandler) IngestMetric(c fiber.Ctx) error {
	input := new(models.MetricInput)
	if err := c.Bind().JSON(input); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	metric, err := input.ValidateAndCreate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	if err := h.queue.EnqueueMetric(c.Context(), metric); err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	return c.SendStatus(fiber.StatusAccepted)
}
