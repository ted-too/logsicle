package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v3"
)

func (h *ReadHandler) DeleteLog(c fiber.Ctx) error {
	projectID := c.Params("projectId")
	logType := c.Params("type")
	logID := c.Params("id")
	userID := c.Locals("user-id").(string)

	// Verify project access
	_, err := verifyDashboardProjectAccess(h.db, c, projectID, userID)
	if err != nil {
		return err
	}

	// Use pgx for deletion based on log type
	var sql string
	switch logType {
	case "event":
		sql = "DELETE FROM event_logs WHERE id = $1 AND project_id = $2"
	case "app":
		sql = "DELETE FROM app_logs WHERE id = $1 AND project_id = $2"
	case "request":
		sql = "DELETE FROM request_logs WHERE id = $1 AND project_id = $2"
	case "trace":
		sql = "DELETE FROM metrics WHERE id = $1 AND project_id = $2"
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid log type",
			"error":   fmt.Sprintf("Log type '%s' is not supported", logType),
		})
	}

	// Execute deletion
	result, err := h.pool.Exec(c.Context(), sql, logID, projectID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to delete log",
			"error":   err.Error(),
		})
	}

	// Check if any row was affected
	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Log not found",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
