package requests

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/server"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

func (h *RequestLogsHandler) IngestRequestLog(c fiber.Ctx) error {
	input := new(models.RequestLogInput)
	if err := c.Bind().JSON(input); err != nil {
		return server.SendError(c, err)
	}

	log, err := input.ValidateAndCreate()
	if err != nil {
		return server.SendError(c, err, fiber.StatusBadRequest)
	}

	if err := h.queue.EnqueueRequestLog(c.Context(), log); err != nil {
		return server.SendError(c, err, fiber.StatusInternalServerError)
	}

	return server.SendResponse(c, nil, fiber.StatusAccepted)
}

type IngestBatchRequestLogErrorResponse struct {
	Id    string                 `json:"id"`
	Input models.RequestLogInput `json:"input"`
	server.ErrorResponse
}

type IngestBatchRequestLogData struct {
	Id   string                 `json:"id"`
	Data models.RequestLogInput `json:"data"`
}

type IngestBatchRequestLogBody struct {
	Data []IngestBatchRequestLogData `json:"data"`
}

func (h *RequestLogsHandler) IngestBatchRequestLog(c fiber.Ctx) error {
	input := new(IngestBatchRequestLogBody)
	if err := c.Bind().JSON(input); err != nil {
		return server.SendError(c, err)
	}

	processed := 0
	var failed []IngestBatchRequestLogErrorResponse

	for _, input := range input.Data {
		log, err := input.Data.ValidateAndCreate()
		if err != nil {
			failed = append(failed, IngestBatchRequestLogErrorResponse{
				Id:    input.Id,
				Input: input.Data,
				ErrorResponse: server.ErrorResponse{
					Message: err.Error(),
					Code:    fiber.StatusBadRequest,
				},
			})
			continue
		}

		if err := h.queue.EnqueueRequestLog(c.Context(), log); err != nil {
			failed = append(failed, IngestBatchRequestLogErrorResponse{
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
