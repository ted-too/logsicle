package requests

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

func (h *RequestLogsHandler) IngestRequestLog(c fiber.Ctx) error {
	input := new(models.RequestLogInput)
	if err := c.Bind().JSON(input); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	log, err := input.ValidateAndCreate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	if err := h.queue.EnqueueRequestLog(c.Context(), log); err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	return c.SendStatus(fiber.StatusAccepted)
}
