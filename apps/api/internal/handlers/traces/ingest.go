package traces

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/server"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

func (h *TracesHandler) IngestTrace(c fiber.Ctx) error {
	input := new(models.TraceInput)
	if err := c.Bind().JSON(input); err != nil {
		return server.SendError(c, err)
	}

	trace, err := input.ValidateAndCreate()
	if err != nil {
		return server.SendError(c, err, fiber.StatusBadRequest)
	}

	if err := h.queue.EnqueueTrace(c.Context(), trace); err != nil {
		return server.SendError(c, err, fiber.StatusInternalServerError)
	}

	return server.SendResponse(c, nil, fiber.StatusAccepted)
}

type IngestBatchTraceErrorResponse struct {
	Input models.TraceInput `json:"input"`
	server.ErrorResponse
}

func (h *TracesHandler) IngestBatchTrace(c fiber.Ctx) error {
	var inputs []models.TraceInput
	if err := c.Bind().JSON(&inputs); err != nil {
		return server.SendError(c, err)
	}

	processed := 0
	var failed []IngestBatchTraceErrorResponse

	for _, input := range inputs {
		trace, err := input.ValidateAndCreate()
		if err != nil {
			failed = append(failed, IngestBatchTraceErrorResponse{
				Input: input,
				ErrorResponse: server.ErrorResponse{
					Message: err.Error(),
					Code:    fiber.StatusBadRequest,
				},
			})
			continue
		}

		if err := h.queue.EnqueueTrace(c.Context(), trace); err != nil {
			failed = append(failed, IngestBatchTraceErrorResponse{
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
