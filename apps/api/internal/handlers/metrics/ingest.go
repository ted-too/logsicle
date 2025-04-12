package metrics

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/server"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

func (h *MetricsHandler) IngestMetric(c fiber.Ctx) error {
	input := new(models.MetricInput)
	if err := c.Bind().JSON(input); err != nil {
		return server.SendError(c, err)
	}

	metric, err := input.ValidateAndCreate()
	if err != nil {
		return server.SendError(c, err, fiber.StatusBadRequest)
	}

	if err := h.queue.EnqueueMetric(c.Context(), metric); err != nil {
		return server.SendError(c, err, fiber.StatusInternalServerError)
	}

	return server.SendResponse(c, nil, fiber.StatusAccepted)
}

type IngestBatchMetricErrorResponse struct {
	Id    string             `json:"id"`
	Input models.MetricInput `json:"input"`
	server.ErrorResponse
}

type IngestBatchMetricData struct {
	Id   string             `json:"id"`
	Data models.MetricInput `json:"data"`
}

type IngestBatchMetricBody struct {
	Data []IngestBatchMetricData `json:"data"`
}

func (h *MetricsHandler) IngestBatchMetric(c fiber.Ctx) error {
	input := new(IngestBatchMetricBody)
	if err := c.Bind().JSON(input); err != nil {
		return server.SendError(c, err)
	}

	processed := 0
	var failed []IngestBatchMetricErrorResponse

	for _, input := range input.Data {
		metric, err := input.Data.ValidateAndCreate()
		if err != nil {
			failed = append(failed, IngestBatchMetricErrorResponse{
				Id:    input.Id,
				Input: input.Data,
				ErrorResponse: server.ErrorResponse{
					Message: err.Error(),
					Code:    fiber.StatusBadRequest,
				},
			})
			continue
		}

		if err := h.queue.EnqueueMetric(c.Context(), metric); err != nil {
			failed = append(failed, IngestBatchMetricErrorResponse{
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
