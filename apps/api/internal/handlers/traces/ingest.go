package traces

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

func (h *TracesHandler) IngestTrace(c fiber.Ctx) error {
	input := new(models.TraceInput)
	if err := c.Bind().JSON(input); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	trace, err := input.ValidateAndCreate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	if err := h.queue.EnqueueTrace(c.Context(), trace); err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	return c.SendStatus(fiber.StatusAccepted)
}
