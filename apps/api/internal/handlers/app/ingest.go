package app

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/server"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

func (h *AppLogsHandler) IngestLog(c fiber.Ctx) error {
	input := new(models.AppLogInput)
	if err := c.Bind().JSON(input); err != nil {
		return server.SendError(c, err)
	}

	log, err := input.ValidateAndCreate()
	if err != nil {
		return server.SendError(c, err, fiber.StatusBadRequest)
	}

	if err := h.queue.EnqueueAppLog(c.Context(), log); err != nil {
		return server.SendError(c, err, fiber.StatusInternalServerError)
	}

	return server.SendResponse(c, nil, fiber.StatusAccepted)
}

type IngestBatchAppLogErrorResponse struct {
	Input models.AppLogInput `json:"input"`
	server.ErrorResponse
}

func (h *AppLogsHandler) IngestBatchLog(c fiber.Ctx) error {
	var inputs []models.AppLogInput
	if err := c.Bind().JSON(&inputs); err != nil {
		return server.SendError(c, err)
	}

	processed := 0
	var failed []IngestBatchAppLogErrorResponse

	for _, input := range inputs {
		log, err := input.ValidateAndCreate()
		if err != nil {
			failed = append(failed, IngestBatchAppLogErrorResponse{
				Input: input,
				ErrorResponse: server.ErrorResponse{
					Message: err.Error(),
					Code:    fiber.StatusBadRequest,
				},
			})
			continue
		}

		if err := h.queue.EnqueueAppLog(c.Context(), log); err != nil {
			failed = append(failed, IngestBatchAppLogErrorResponse{
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
