package app

import (
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/timescale"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

type GetAppLogsQuery struct {
	timescale.CommonLogQueryOptions
	Level       *string `json:"level,omitempty" query:"level"`
	ServiceName *string `json:"service_name,omitempty" query:"serviceName"`
	Environment *string `json:"environment,omitempty" query:"environment"`
}

// Validate implements validation.Validatable
func (q GetAppLogsQuery) Validate() error {
	if err := q.CommonLogQueryOptions.Validate(); err != nil {
		return err
	}

	validLevels := []interface{}{"debug", "info", "warn", "error"}
	return validation.ValidateStruct(&q,
		validation.Field(&q.Level, validation.In(validLevels...)),
		validation.Field(&q.ServiceName),
		validation.Field(&q.Environment),
	)
}

type AppLogResponse struct {
	Data []models.AppLog          `json:"data"`
	Meta timescale.PaginationMeta `json:"meta"`
}

// GetLogs returns paginated app logs with filtering
func (h *AppLogsHandler) GetAppLogs(c fiber.Ctx) error {
	projectID := c.Params("id")

	query := new(GetAppLogsQuery)
	if err := c.Bind().Query(query); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid query parameters",
			"message": err.Error(),
		})
	}

	// Set defaults
	if query.Limit == 0 {
		query.Limit = 20
	} else if query.Limit > 100 {
		query.Limit = 100
	}
	if query.Page == 0 {
		query.Page = 1
	}
	if query.End == 0 {
		query.End = time.Now().UnixMilli()
	}
	if query.Start == 0 {
		query.Start = query.End - 24*time.Hour.Milliseconds()
	}

	if err := query.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Query parameters validation failed",
			"message": err.Error(),
		})
	}

	// Calculate offset for pagination
	offset := (query.Page - 1) * query.Limit

	// Base query and parameters
	baseQuery := `
		FROM app_logs al
		WHERE al.project_id = $1
		  AND al.timestamp >= $2
		  AND al.timestamp <= $3
	`
	baseParams := []interface{}{
		projectID,
		timescale.UnixMsToTime(query.Start),
		timescale.UnixMsToTime(query.End),
	}
	paramCount := 4

	// Apply additional filters
	whereClause := ""
	if query.Level != nil {
		whereClause += fmt.Sprintf(" AND al.level = $%d", paramCount)
		baseParams = append(baseParams, *query.Level)
		paramCount++
	}
	if query.ServiceName != nil {
		whereClause += fmt.Sprintf(" AND al.service_name = $%d", paramCount)
		baseParams = append(baseParams, *query.ServiceName)
		paramCount++
	}
	if query.Environment != nil {
		whereClause += fmt.Sprintf(" AND al.environment = $%d", paramCount)
		baseParams = append(baseParams, *query.Environment)
		paramCount++
	}
	if query.Search != nil {
		whereClause += fmt.Sprintf(`
			AND (
				al.message_tsv @@ plainto_tsquery($%d)
				OR al.fields_tsv @@ plainto_tsquery($%d)
				OR al.message ILIKE $%d
				OR al.fields::text ILIKE $%d
			)`, paramCount, paramCount, paramCount+1, paramCount+1)

		searchTerm := *query.Search
		baseParams = append(baseParams,
			searchTerm,                        // for message_tsv and fields_tsv (same parameter)
			fmt.Sprintf("%%%s%%", searchTerm), // for ILIKE
		)
		paramCount += 2
	}

	// Get total count of all logs for this project in time range
	totalCountSQL := "SELECT COUNT(*) " + baseQuery
	var totalCount int
	err := h.pool.QueryRow(c.Context(), totalCountSQL, baseParams[:3]...).Scan(&totalCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get total count",
			"message": err.Error(),
		})
	}

	// Get filtered count
	filteredCountSQL := "SELECT COUNT(*) " + baseQuery + whereClause
	var filteredCount int
	err = h.pool.QueryRow(c.Context(), filteredCountSQL, baseParams...).Scan(&filteredCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get filtered count",
			"message": err.Error(),
		})
	}

	// Query for the logs with pagination
	dataSQL := `
		SELECT 
			al.id, al.project_id, al.level, al.message,
			al.fields, al.timestamp, al.caller, al.function,
			al.service_name, al.version, al.environment, al.host
	` + baseQuery + whereClause + `
		ORDER BY al.timestamp DESC
		LIMIT $` + fmt.Sprint(paramCount) + ` OFFSET $` + fmt.Sprint(paramCount+1)

	baseParams = append(baseParams, query.Limit, offset)

	rows, err := h.pool.Query(c.Context(), dataSQL, baseParams...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch app logs",
			"message": err.Error(),
		})
	}
	defer rows.Close()

	// Process results
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
		Meta: timescale.PaginationMeta{
			TotalRowCount:         totalCount,
			TotalFilteredRowCount: filteredCount,
			CurrentPage:           query.Page,
			NextPage:              nextPage,
			PrevPage:              prevPage,
		},
	})
}

type GetMetricsQuery struct {
	timescale.CommonMetricsQueryOptions
	Level       *string `json:"level,omitempty" query:"level"`
	ServiceName *string `json:"service_name,omitempty" query:"serviceName"`
	Environment *string `json:"environment,omitempty" query:"environment"`
}

// Validate implements validation.Validatable
func (q GetMetricsQuery) Validate() error {
	if err := q.CommonMetricsQueryOptions.Validate(); err != nil {
		return err
	}

	validLevels := []interface{}{"debug", "info", "warn", "error"}
	return validation.ValidateStruct(&q,
		validation.Field(&q.Level, validation.In(validLevels...)),
		validation.Field(&q.ServiceName),
		validation.Field(&q.Environment),
	)
}

// Define structs that match the TypeScript interface
type AppLogMetricsResponse struct {
	Total         int                    `json:"total"`
	ByLevel       []LevelMetric          `json:"by_level"`
	ByService     []ServiceMetric        `json:"by_service"`
	ByEnvironment []EnvironmentMetric    `json:"by_environment"`
	ByTime        []timescale.TimeMetric `json:"by_time"`
}

type LevelMetric struct {
	Level string `json:"level"`
	Count int    `json:"count"`
}

type ServiceMetric struct {
	Service string `json:"service"`
	Count   int    `json:"count"`
}

type EnvironmentMetric struct {
	Environment string `json:"environment"`
	Count       int    `json:"count"`
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

	// Set defaults
	if query.End == 0 {
		query.End = time.Now().UnixMilli()
	}
	if query.Start == 0 {
		query.Start = query.End - 24*time.Hour.Milliseconds()
	}
	if query.Interval == "" {
		query.Interval = timescale.SuggestInterval(query.Start, query.End)
	}

	if err := query.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Query parameters validation failed",
			"message": err.Error(),
		})
	}

	// Base query parameters and WHERE clause
	baseWhere := `
		WHERE project_id = $1
		AND timestamp >= $2
		AND timestamp <= $3
	`
	baseParams := []interface{}{
		projectID,
		timescale.UnixMsToTime(query.Start),
		timescale.UnixMsToTime(query.End),
	}
	paramCount := 4

	// Add optional filters
	filterClause := ""
	if query.ServiceName != nil {
		filterClause += fmt.Sprintf(" AND service_name = $%d", paramCount)
		baseParams = append(baseParams, *query.ServiceName)
		paramCount++
	}
	if query.Environment != nil {
		filterClause += fmt.Sprintf(" AND environment = $%d", paramCount)
		baseParams = append(baseParams, *query.Environment)
		paramCount++
	}
	if query.Level != nil {
		filterClause += fmt.Sprintf(" AND level = $%d", paramCount)
		baseParams = append(baseParams, *query.Level)
		paramCount++
	}

	// 1. Get total count
	totalSql := "SELECT COUNT(*) FROM app_logs " + baseWhere + filterClause
	var totalCount int
	err := h.pool.QueryRow(c.Context(), totalSql, baseParams...).Scan(&totalCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get total count",
			"message": err.Error(),
		})
	}

	// Create response object
	response := AppLogMetricsResponse{
		Total:         totalCount,
		ByLevel:       []LevelMetric{},
		ByService:     []ServiceMetric{},
		ByEnvironment: []EnvironmentMetric{},
		ByTime:        []timescale.TimeMetric{},
	}

	// Use a more efficient approach: get metrics by level, service, and environment in a single query
	categoryMetricsSQL := `
		SELECT 
			'level' as category,
			level as category_value,
			COUNT(*) as count
		FROM app_logs
		` + baseWhere + filterClause + `
		GROUP BY level
		
		UNION ALL
		
		SELECT 
			'service' as category,
			service_name as category_value,
			COUNT(*) as count
		FROM app_logs
		` + baseWhere + filterClause + `
		GROUP BY service_name
		
		UNION ALL
		
		SELECT 
			'environment' as category,
			environment as category_value,
			COUNT(*) as count
		FROM app_logs
		` + baseWhere + filterClause + `
		AND environment IS NOT NULL
		GROUP BY environment
		
		ORDER BY category, count DESC
	`

	categoryRows, err := h.pool.Query(c.Context(), categoryMetricsSQL, baseParams...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch category metrics",
			"message": err.Error(),
		})
	}
	defer categoryRows.Close()

	// Process the category metrics
	for categoryRows.Next() {
		var category, categoryValue string
		var count int

		if err := categoryRows.Scan(&category, &categoryValue, &count); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to scan category metrics",
				"message": err.Error(),
			})
		}

		switch category {
		case "level":
			response.ByLevel = append(response.ByLevel, LevelMetric{
				Level: categoryValue,
				Count: count,
			})
		case "service":
			response.ByService = append(response.ByService, ServiceMetric{
				Service: categoryValue,
				Count:   count,
			})
		case "environment":
			response.ByEnvironment = append(response.ByEnvironment, EnvironmentMetric{
				Environment: categoryValue,
				Count:       count,
			})
		}
	}

	// 5. Get metrics by time
	timeSql := fmt.Sprintf(`
		SELECT 
			time_bucket($%d, timestamp) AS bucket,
			COUNT(*) AS count
		FROM app_logs
	`, paramCount) + baseWhere + filterClause + `
		GROUP BY bucket
		ORDER BY bucket ASC
	`
	baseParams = append(baseParams, timescale.ConvertIntervalToPostgresFormat(query.Interval))

	fmt.Println(timeSql)

	timeRows, err := h.pool.Query(c.Context(), timeSql, baseParams...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch time metrics",
			"message": err.Error(),
		})
	}
	defer timeRows.Close()

	for timeRows.Next() {
		var bucket time.Time
		var count int
		if err := timeRows.Scan(&bucket, &count); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to scan time metrics",
				"message": err.Error(),
			})
		}

		response.ByTime = append(response.ByTime, timescale.TimeMetric{
			Timestamp: bucket.UnixMilli(),
			Count:     count,
		})
	}

	return c.JSON(response)
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
