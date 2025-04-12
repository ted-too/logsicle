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
	Id    string            `json:"id"`
	Input models.TraceInput `json:"input"`
	server.ErrorResponse
}

type IngestBatchTraceData struct {
	Id   string            `json:"id"`
	Data models.TraceInput `json:"data"`
}

type IngestBatchTraceBody struct {
	Data []IngestBatchTraceData `json:"data"`
}

func (h *TracesHandler) IngestBatchTrace(c fiber.Ctx) error {
	input := new(IngestBatchTraceBody)
	if err := c.Bind().JSON(input); err != nil {
		return server.SendError(c, err)
	}

	processed := 0
	var failed []IngestBatchTraceErrorResponse

	for _, input := range input.Data {
		trace, err := input.Data.ValidateAndCreate()
		if err != nil {
			failed = append(failed, IngestBatchTraceErrorResponse{
				Id:    input.Id,
				Input: input.Data,
				ErrorResponse: server.ErrorResponse{
					Message: err.Error(),
					Code:    fiber.StatusBadRequest,
				},
			})
			continue
		}

		if err := h.queue.EnqueueTrace(c.Context(), trace); err != nil {
			failed = append(failed, IngestBatchTraceErrorResponse{
				Id:    input.Id,
				Input: input.Data,
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
