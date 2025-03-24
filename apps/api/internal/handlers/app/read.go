package app

import (
	"fmt"
	"sort"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

type GetAppLogsQuery struct {
	Start       time.Time `query:"start"`
	End         time.Time `query:"end"`
	Limit       int       `query:"limit"`
	Page        int       `query:"page"`
	Level       *string   `query:"level"`
	ServiceName *string   `query:"serviceName"`
	Environment *string   `query:"environment"`
	Search      *string   `query:"search"`
}

type PaginationMeta struct {
	TotalRowCount         int  `json:"totalRowCount"`
	TotalFilteredRowCount int  `json:"totalFilteredRowCount"`
	CurrentPage           int  `json:"currentPage"`
	NextPage              *int `json:"nextPage"`
	PrevPage              *int `json:"prevPage"`
}

type AppLogResponse struct {
	Data []models.AppLog `json:"data"`
	Meta PaginationMeta  `json:"meta"`
}

// GetLogs returns paginated app logs with filtering
func (h *AppLogsHandler) GetLogs(c fiber.Ctx) error {
	projectID := c.Params("id")

	query := new(GetAppLogsQuery)
	if err := c.Bind().Query(query); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	// Set default limit and page
	if query.Limit == 0 {
		query.Limit = 20
	} else if query.Limit > 100 {
		query.Limit = 100
	}
	if query.Page == 0 {
		query.Page = 1
	}

	// Set default time range
	if query.End.IsZero() {
		query.End = time.Now()
	}
	if query.Start.IsZero() {
		query.Start = query.End.Add(-24 * time.Hour)
	}

	// Calculate offset
	offset := (query.Page - 1) * query.Limit

	// Build base WHERE clause and args for reuse
	baseWhere := `
					WHERE al.project_id = $1
					AND al.timestamp >= $2
					AND al.timestamp <= $3
	`
	baseArgs := []interface{}{projectID, query.Start, query.End}
	argCount := 4

	// Build additional filters
	var additionalFilters string
	if query.Level != nil {
		additionalFilters += fmt.Sprintf(" AND level = $%d", argCount)
		baseArgs = append(baseArgs, *query.Level)
		argCount++
	}
	if query.ServiceName != nil {
		additionalFilters += fmt.Sprintf(" AND service_name = $%d", argCount)
		baseArgs = append(baseArgs, *query.ServiceName)
		argCount++
	}
	if query.Environment != nil {
		additionalFilters += fmt.Sprintf(" AND environment = $%d", argCount)
		baseArgs = append(baseArgs, *query.Environment)
		argCount++
	}
	if query.Search != nil {
		additionalFilters += fmt.Sprintf(`
				AND (
						message_tsv @@ plainto_tsquery($%d)
						OR fields_tsv @@ plainto_tsquery($%d)
						OR message ILIKE $%d
						OR fields::text ILIKE $%d
				)`, argCount, argCount, argCount+1, argCount+1)

		searchTerm := *query.Search
		baseArgs = append(baseArgs,
			searchTerm,                        // for message_tsv and fields_tsv (same parameter)
			fmt.Sprintf("%%%s%%", searchTerm), // for ILIKE
		)
		argCount += 2
	}

	// Get total count (without filters)
	var totalCount int
	totalCountSQL := "SELECT COUNT(*) FROM app_logs al " + baseWhere
	err := h.pool.QueryRow(c.Context(), totalCountSQL, baseArgs[:3]...).Scan(&totalCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get total count",
			"message": err.Error(),
		})
	}

	// Get filtered count
	var filteredCount int
	filteredCountSQL := "SELECT COUNT(*) FROM app_logs al " + baseWhere + additionalFilters
	err = h.pool.QueryRow(c.Context(), filteredCountSQL, baseArgs...).Scan(&filteredCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get filtered count",
			"message": err.Error(),
		})
	}

	// Build the main data query
	dataSQL := `
					SELECT 
							al.id, al.project_id, al.level, al.message,
							al.fields, al.timestamp, al.caller, al.function,
							al.service_name, al.version, al.environment, al.host
					FROM app_logs al
	` + baseWhere + additionalFilters

	// Add pagination
	dataSQL += " ORDER BY al.timestamp DESC LIMIT $" + fmt.Sprint(argCount) + " OFFSET $" + fmt.Sprint(argCount+1)
	baseArgs = append(baseArgs, query.Limit, offset)

	// Execute query
	rows, err := h.pool.Query(c.Context(), dataSQL, baseArgs...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch app logs",
			"message": err.Error(),
		})
	}
	defer rows.Close()

	logs := make([]models.AppLog, 0)
	for rows.Next() {
		var log models.AppLog
		err := rows.Scan(
			&log.ID, &log.ProjectID, &log.Level, &log.Message,
			&log.Fields, &log.Timestamp, &log.Caller, &log.Function,
			&log.ServiceName, &log.Version, &log.Environment, &log.Host,
		)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to scan app logs",
				"message": err.Error(),
			})
		}
		logs = append(logs, log)
	}

	// Calculate pagination metadata
	totalPages := (filteredCount + query.Limit - 1) / query.Limit
	var nextPage *int
	var prevPage *int

	if query.Page < totalPages {
		next := query.Page + 1
		nextPage = &next
	}
	if query.Page > 1 {
		prev := query.Page - 1
		prevPage = &prev
	}

	return c.JSON(AppLogResponse{
		Data: logs,
		Meta: PaginationMeta{
			TotalRowCount:         totalCount,
			TotalFilteredRowCount: filteredCount,
			CurrentPage:           query.Page,
			NextPage:              nextPage,
			PrevPage:              prevPage,
		},
	})
}

type GetMetricsQuery struct {
	Start       time.Time `query:"start"`
	End         time.Time `query:"end"`
	Interval    string    `query:"interval"` // e.g., '1 hour', '30 minutes', '1 day'
	ServiceName *string   `query:"serviceName"`
	Environment *string   `query:"environment"`
	Search      *string   `query:"search"`
}

type LogLevelMetric struct {
	Timestamp time.Time        `json:"timestamp"`
	Counts    map[string]int64 `json:"counts"` // Map of level -> count
}

// Helper function to suggest appropriate interval based on time range
func suggestInterval(start, end time.Time) string {
	duration := end.Sub(start)

	switch {
	case duration <= 2*time.Hour:
		return "1 minute"
	case duration <= 6*time.Hour:
		return "5 minutes"
	case duration <= 24*time.Hour:
		return "15 minutes"
	case duration <= 7*24*time.Hour:
		return "1 hour"
	case duration <= 30*24*time.Hour:
		return "6 hours"
	default:
		return "1 day"
	}
}

// GetMetrics returns metrics about app logs over time
func (h *AppLogsHandler) GetMetrics(c fiber.Ctx) error {
	projectID := c.Params("id")

	query := new(GetMetricsQuery)
	if err := c.Bind().Query(query); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	// Set default times if not provided
	if query.End.IsZero() {
		query.End = time.Now()
	}
	if query.Start.IsZero() {
		query.Start = query.End.Add(-24 * time.Hour) // Default to last 24 hours
	}

	// Set default interval if not provided
	if query.Interval == "" {
		query.Interval = suggestInterval(query.Start, query.End)
	}

	// Build the metrics query
	metricsSQL := `
					SELECT 
									time_bucket($1, timestamp) AS bucket,
									level,
									COUNT(*) as count
					FROM app_logs
					WHERE project_id = $2
					AND timestamp >= $3
					AND timestamp <= $4
	`
	args := []interface{}{
		query.Interval,
		projectID,
		query.Start,
		query.End,
	}
	argCount := 5

	// Add optional filters
	if query.ServiceName != nil {
		metricsSQL += fmt.Sprintf(" AND service_name = $%d", argCount)
		args = append(args, *query.ServiceName)
		argCount++
	}

	if query.Environment != nil {
		metricsSQL += fmt.Sprintf(" AND environment = $%d", argCount)
		args = append(args, *query.Environment)
		argCount++
	}

	if query.Search != nil {
		metricsSQL += fmt.Sprintf(`
					AND (
							message_tsv @@ plainto_tsquery($%d)
							OR fields_tsv @@ plainto_tsquery($%d)
							OR message ILIKE $%d
							OR fields::text ILIKE $%d
					)`, argCount, argCount, argCount+1, argCount+1)

		searchTerm := *query.Search
		args = append(args,
			searchTerm,                        // for message_tsv and fields_tsv (same parameter)
			fmt.Sprintf("%%%s%%", searchTerm), // for ILIKE
		)
		argCount += 2
	}

	metricsSQL += " GROUP BY bucket, level ORDER BY bucket ASC"

	// Execute query
	rows, err := h.pool.Query(c.Context(), metricsSQL, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch metrics",
			"message": err.Error(),
		})
	}
	defer rows.Close()

	// Create a map to store metrics by timestamp
	metricsByTime := make(map[time.Time]*LogLevelMetric)

	// Scan results
	for rows.Next() {
		var bucket time.Time
		var level string
		var count int64

		if err := rows.Scan(&bucket, &level, &count); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to scan metrics",
				"message": err.Error(),
			})
		}

		// Get or create metric for this timestamp
		metric, exists := metricsByTime[bucket]
		if !exists {
			metric = &LogLevelMetric{
				Timestamp: bucket,
				Counts:    make(map[string]int64),
			}
			metricsByTime[bucket] = metric
		}

		metric.Counts[level] = count
	}

	// Convert map to sorted slice
	metrics := make([]LogLevelMetric, 0, len(metricsByTime))
	for _, metric := range metricsByTime {
		metrics = append(metrics, *metric)
	}

	// Sort metrics by timestamp
	sort.Slice(metrics, func(i, j int) bool {
		return metrics[i].Timestamp.Before(metrics[j].Timestamp)
	})

	return c.JSON(metrics)
}

func (h *AppLogsHandler) DeleteAppLog(c fiber.Ctx) error {
	projectID := c.Params("id")
	logID := c.Params("logId")

	sql := "DELETE FROM app_logs WHERE id = $1 AND project_id = $2"

	result, err := h.pool.Exec(c.Context(), sql, logID, projectID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to delete app log",
			"error":   err.Error(),
		})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "App log not found",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
