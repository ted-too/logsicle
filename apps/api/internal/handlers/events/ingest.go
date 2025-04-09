package events

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/server"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

func (h *EventsHandler) IngestEvent(c fiber.Ctx) error {
	input := new(models.EventLogInput)
	if err := c.Bind().JSON(input); err != nil {
		return server.SendError(c, err)
	}

	channelID, ok := c.Locals("channel_id").(string)
	if !ok {
		return server.SendError(c, fiber.NewError(fiber.StatusInternalServerError, "Failed to get channel ID"))
	}

	log, err := input.ValidateAndCreate(channelID)
	if err != nil {
		return server.SendError(c, err, fiber.StatusBadRequest)
	}

	if err := h.qs.EnqueueEventLog(c.Context(), log); err != nil {
		return server.SendError(c, err, fiber.StatusInternalServerError)
	}

	return server.SendResponse(c, nil, fiber.StatusAccepted)
}

type IngestBatchEventErrorResponse struct {
	Input models.EventLogInput `json:"input"`
	server.ErrorResponse
}

func (h *EventsHandler) IngestBatchEvent(c fiber.Ctx) error {
	var inputs []models.EventLogInput
	if err := c.Bind().JSON(&inputs); err != nil {
		return server.SendError(c, err)
	}

	channelID, ok := c.Locals("channel_id").(string)
	if !ok {
		return server.SendError(c, fiber.NewError(fiber.StatusInternalServerError, "Failed to get channel ID"))
	}

	processed := 0
	var failed []IngestBatchEventErrorResponse

	for _, input := range inputs {
		log, err := input.ValidateAndCreate(channelID)
		if err != nil {
			failed = append(failed, IngestBatchEventErrorResponse{
				Input: input,
				ErrorResponse: server.ErrorResponse{
					Message: err.Error(),
					Code:    fiber.StatusBadRequest,
				},
			})
			continue
		}

		if err := h.qs.EnqueueEventLog(c.Context(), log); err != nil {
			failed = append(failed, IngestBatchEventErrorResponse{
				Input: input,
				ErrorResponse: server.ErrorResponse{
					Message: err.Error(),
					Code:    fiber.StatusInternalServerError,
				},
			})
			continue
		}

		processed++
	}

	return server.SendResponse(c, fiber.Map{
		"processed": processed,
		"failed":    failed,
	}, fiber.StatusAccepted)
}
