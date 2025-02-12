package handlers

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/models"
	"github.com/ted-too/logsicle/internal/storage/timescale"
	"gorm.io/gorm"
)

type GetAppLogsQuery struct {
	ChannelID   *string   `query:"channelId"`
	Before      time.Time `query:"before"`
	Limit       int       `query:"limit"`
	Level       *string   `query:"level"`
	ServiceName *string   `query:"serviceName"`
	Environment *string   `query:"environment"`
	Search      *string   `query:"search"` // For searching in message
}

type PaginatedAppLogs struct {
	Data          []timescale.AppLog `json:"data"`
	TotalCount    int64              `json:"totalCount"`
	FilteredCount int64              `json:"filteredCount"`
	HasNext       bool               `json:"hasNext"`
	HasPrev       bool               `json:"hasPrev"`
}

func (h *ReadHandler) GetAppLogs(c fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("user-id").(string)

	// Verify project access using GORM
	var project models.Project
	if err := h.db.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Project not found or access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to verify project access",
		})
	}

	query := new(GetAppLogsQuery)
	if err := c.Bind().Query(query); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	// Set default limit
	if query.Limit == 0 {
		query.Limit = 20
	} else if query.Limit > 100 {
		query.Limit = 100
	}

	// Set default before time
	if query.Before.IsZero() {
		query.Before = time.Now()
	}

	// Get total count with basic filters
	countSQL := `
			SELECT COUNT(*)
			FROM app_logs
			WHERE project_id = $1
			AND ($2::text IS NULL OR channel_id = $2)
	`
	var totalCount int64
	err := h.pool.QueryRow(c.Context(), countSQL, projectID, query.ChannelID).Scan(&totalCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get total count",
		})
	}

	// Build the filtered count query
	filteredCountSQL := `
			SELECT COUNT(*)
			FROM app_logs
			WHERE project_id = $1
			AND ($2::text IS NULL OR channel_id = $2)
	`
	args := []interface{}{projectID, query.ChannelID}
	argCount := 3

	// Add optional filters
	if query.Level != nil {
		filteredCountSQL += fmt.Sprintf(" AND level = $%d", argCount)
		args = append(args, *query.Level)
		argCount++
	}

	if query.ServiceName != nil {
		filteredCountSQL += fmt.Sprintf(" AND service_name = $%d", argCount)
		args = append(args, *query.ServiceName)
		argCount++
	}

	if query.Environment != nil {
		filteredCountSQL += fmt.Sprintf(" AND environment = $%d", argCount)
		args = append(args, *query.Environment)
		argCount++
	}

	if query.Search != nil {
		filteredCountSQL += fmt.Sprintf(" AND message ILIKE $%d", argCount)
		args = append(args, fmt.Sprintf("%%%s%%", *query.Search))
		argCount++
	}

	var filteredCount int64
	err = h.pool.QueryRow(c.Context(), filteredCountSQL, args...).Scan(&filteredCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get filtered count",
		})
	}

	// Build the main data query
	dataSQL := `
			SELECT 
					al.id, al.project_id, al.channel_id, al.level, al.message,
					al.fields, al.timestamp, al.caller, al.function,
					al.service_name, al.version, al.environment, al.host,
					alc.name as channel_name, alc.color as channel_color
			FROM app_logs al
			LEFT JOIN app_log_channels alc ON al.channel_id = alc.id
			WHERE al.project_id = $1
			AND ($2::text IS NULL OR al.channel_id = $2)
			AND al.timestamp < $3
	`
	args = []interface{}{projectID, query.ChannelID, query.Before}
	argCount = 4

	// Add optional filters
	if query.Level != nil {
		dataSQL += fmt.Sprintf(" AND al.level = $%d", argCount)
		args = append(args, *query.Level)
		argCount++
	}

	if query.ServiceName != nil {
		dataSQL += fmt.Sprintf(" AND al.service_name = $%d", argCount)
		args = append(args, *query.ServiceName)
		argCount++
	}

	if query.Environment != nil {
		dataSQL += fmt.Sprintf(" AND al.environment = $%d", argCount)
		args = append(args, *query.Environment)
		argCount++
	}

	if query.Search != nil {
		dataSQL += fmt.Sprintf(" AND al.message ILIKE $%d", argCount)
		args = append(args, fmt.Sprintf("%%%s%%", *query.Search))
		argCount++
	}

	dataSQL += " ORDER BY al.timestamp DESC LIMIT $" + fmt.Sprint(argCount)
	args = append(args, query.Limit)

	// Execute query
	rows, err := h.pool.Query(c.Context(), dataSQL, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch app logs",
		})
	}
	defer rows.Close()

	logs := make([]timescale.AppLog, 0)
	for rows.Next() {
		var log timescale.AppLog
		var channelName, channelColor sql.NullString
		err := rows.Scan(
			&log.ID, &log.ProjectID, &log.ChannelID, &log.Level, &log.Message,
			&log.Fields, &log.Timestamp, &log.Caller, &log.Function,
			&log.ServiceName, &log.Version, &log.Environment, &log.Host,
			&channelName, &channelColor,
		)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to scan app logs",
			})
		}

		// Channels disabled for now
		// // Only set channel relation if we have channel data
		// if log.ChannelID.Valid {
		// 	var colorPtr *string
		// 	if channelColor.Valid {
		// 		colorPtr = &channelColor.String
		// 	}

		// 	log.Channel = &timescale.ChannelRelation{
		// 		Name:  channelName.String,
		// 		Color: colorPtr,
		// 	}
		// }

		logs = append(logs, log)
	}

	// Calculate if there are previous/next pages
	hasNext := len(logs) == query.Limit
	hasPrev := query.Before.Before(time.Now())

	return c.JSON(PaginatedAppLogs{
		Data:          logs,
		TotalCount:    totalCount,
		FilteredCount: filteredCount,
		HasNext:       hasNext,
		HasPrev:       hasPrev,
	})
}
