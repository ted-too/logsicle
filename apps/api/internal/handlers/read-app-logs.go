package handlers

import (
	"database/sql"
	"fmt"
	"sort"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/models"
	"github.com/ted-too/logsicle/internal/storage/timescale"
	"gorm.io/gorm"
)

type GetAppLogsQuery struct {
	ChannelID   *string   `query:"channelId"`
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
	Data []timescale.AppLog `json:"data"`
	Meta PaginationMeta     `json:"meta"`
}

func verifyDashboardProjectAccess(db *gorm.DB, ctx fiber.Ctx, projectID, userID string) (*models.Project, error) {
	var project models.Project
	if err := db.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fiber.NewError(fiber.StatusNotFound, "Project not found or access denied")
		}
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to verify project access")
	}
	return &project, nil
}

func (h *ReadHandler) GetAppLogs(c fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("user-id").(string)

	// Verify project access
	if _, err := verifyDashboardProjectAccess(h.db, c, projectID, userID); err != nil {
		return err
	}

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
			AND ($2::text IS NULL OR al.channel_id = $2)
			AND al.timestamp >= $3
			AND al.timestamp <= $4
	`
	baseArgs := []interface{}{projectID, query.ChannelID, query.Start, query.End}
	argCount := 5

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
		additionalFilters += fmt.Sprintf(" AND message ILIKE $%d", argCount)
		baseArgs = append(baseArgs, fmt.Sprintf("%%%s%%", *query.Search))
		argCount++
	}

	// Get total count (without filters)
	var totalCount int
	totalCountSQL := "SELECT COUNT(*) FROM app_logs al " + baseWhere
	err := h.pool.QueryRow(c.Context(), totalCountSQL, baseArgs[:4]...).Scan(&totalCount)
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
					al.id, al.project_id, al.channel_id, al.level, al.message,
					al.fields, al.timestamp, al.caller, al.function,
					al.service_name, al.version, al.environment, al.host,
					alc.name as channel_name, alc.color as channel_color
			FROM app_logs al
			LEFT JOIN app_log_channels alc ON al.channel_id = alc.id
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

type GetAppLogMetricsQuery struct {
	ChannelID   *string   `query:"channelId"`
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

// FIXME: add appropriate validation for the interval parameter to prevent potential SQL injection

func (h *ReadHandler) GetAppLogMetrics(c fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("user-id").(string)

	// Verify project access using GORM
	if _, err := verifyDashboardProjectAccess(h.db, c, projectID, userID); err != nil {
		return err
	}

	query := new(GetAppLogMetricsQuery)
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
		query.Interval = "1 hour"
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
			AND ($5::text IS NULL OR channel_id = $5)
	`
	args := []interface{}{
		query.Interval,
		projectID,
		query.Start,
		query.End,
		query.ChannelID,
	}
	argCount := 6

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
		metricsSQL += fmt.Sprintf(" AND message ILIKE $%d", argCount)
		args = append(args, fmt.Sprintf("%%%s%%", *query.Search))
		argCount++
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
