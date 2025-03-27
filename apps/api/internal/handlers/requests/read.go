package requests

import (
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/timescale"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

type GetRequestLogsQuery struct {
	timescale.CommonLogQueryOptions
	Method      *string `json:"method,omitempty" query:"method"`
	StatusCode  *int    `json:"status_code,omitempty" query:"statusCode"`
	PathPattern *string `json:"path_pattern,omitempty" query:"pathPattern"`
	Host        *string `json:"host,omitempty" query:"host"`
}

// Validate implements validation.Validatable
func (q GetRequestLogsQuery) Validate() error {
	if err := q.CommonLogQueryOptions.Validate(); err != nil {
		return err
	}

	validMethods := []interface{}{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "TRACE", "CONNECT"}
	return validation.ValidateStruct(&q,
		validation.Field(&q.Method, validation.In(validMethods...)),
		validation.Field(&q.StatusCode, validation.Min(100), validation.Max(599)),
		validation.Field(&q.PathPattern),
		validation.Field(&q.Host),
	)
}

type RequestLogResponse struct {
	Data []models.RequestLog      `json:"data"`
	Meta timescale.PaginationMeta `json:"meta"`
}

// GetRequestLogs returns paginated request logs with filtering
func (h *RequestLogsHandler) GetRequestLogs(c fiber.Ctx) error {
	projectID := c.Params("id")

	query := new(GetRequestLogsQuery)
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
		FROM request_logs rl
		WHERE rl.project_id = $1
		  AND rl.timestamp >= $2
		  AND rl.timestamp <= $3
	`
	baseParams := []interface{}{
		projectID,
		timescale.UnixMsToTime(query.Start),
		timescale.UnixMsToTime(query.End),
	}
	paramCount := 4

	// Apply additional filters
	whereClause := ""
	if query.Method != nil {
		whereClause += fmt.Sprintf(" AND rl.method = $%d", paramCount)
		baseParams = append(baseParams, *query.Method)
		paramCount++
	}
	if query.StatusCode != nil {
		whereClause += fmt.Sprintf(" AND rl.status_code = $%d", paramCount)
		baseParams = append(baseParams, *query.StatusCode)
		paramCount++
	}
	if query.PathPattern != nil {
		whereClause += fmt.Sprintf(" AND rl.path LIKE $%d", paramCount)
		baseParams = append(baseParams, fmt.Sprintf("%%%s%%", *query.PathPattern))
		paramCount++
	}
	if query.Host != nil {
		whereClause += fmt.Sprintf(" AND rl.host = $%d", paramCount)
		baseParams = append(baseParams, *query.Host)
		paramCount++
	}
	if query.Search != nil {
		whereClause += fmt.Sprintf(`
			AND (
				rl.path ILIKE $%d
				OR rl.host ILIKE $%d
				OR rl.error ILIKE $%d
				OR rl.request_body::text ILIKE $%d
				OR rl.response_body::text ILIKE $%d
			)`, paramCount, paramCount, paramCount, paramCount, paramCount)

		searchTerm := fmt.Sprintf("%%%s%%", *query.Search)
		baseParams = append(baseParams, searchTerm)
		paramCount++
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
			rl.id, rl.project_id, rl.method, rl.path, rl.status_code,
			rl.duration, rl.request_body, rl.response_body, rl.headers, 
			rl.query_params, rl.user_agent, rl.ip_address, rl.protocol, 
			rl.host, rl.error, rl.timestamp
	` + baseQuery + whereClause + `
		ORDER BY rl.timestamp DESC
		LIMIT $` + fmt.Sprint(paramCount) + ` OFFSET $` + fmt.Sprint(paramCount+1)

	baseParams = append(baseParams, query.Limit, offset)

	rows, err := h.pool.Query(c.Context(), dataSQL, baseParams...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch request logs",
			"message": err.Error(),
		})
	}
	defer rows.Close()

	// Process results
	logs := make([]models.RequestLog, 0)
	for rows.Next() {
		var log models.RequestLog
		err := rows.Scan(
			&log.ID, &log.ProjectID, &log.Method, &log.Path, &log.StatusCode,
			&log.Duration, &log.RequestBody, &log.ResponseBody, &log.Headers,
			&log.QueryParams, &log.UserAgent, &log.IPAddress, &log.Protocol,
			&log.Host, &log.Error, &log.Timestamp,
		)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to scan request logs",
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

	return c.JSON(RequestLogResponse{
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
	Method     *string `json:"method,omitempty" query:"method"`
	StatusCode *int    `json:"status_code,omitempty" query:"statusCode"`
	Host       *string `json:"host,omitempty" query:"host"`
}

// Validate implements validation.Validatable
func (q GetMetricsQuery) Validate() error {
	if err := q.CommonMetricsQueryOptions.Validate(); err != nil {
		return err
	}

	validMethods := []interface{}{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "TRACE", "CONNECT"}
	return validation.ValidateStruct(&q,
		validation.Field(&q.Method, validation.In(validMethods...)),
		validation.Field(&q.StatusCode, validation.Min(100), validation.Max(599)),
		validation.Field(&q.Host),
	)
}

// Define structs for metrics response
type RequestLogMetricsResponse struct {
	Total        int                    `json:"total"`
	ByMethod     []MethodMetric         `json:"by_method"`
	ByStatusCode []StatusCodeMetric     `json:"by_status_code"`
	ByHost       []HostMetric           `json:"by_host"`
	ByTime       []timescale.TimeMetric `json:"by_time"`
}

type MethodMetric struct {
	Method string `json:"method"`
	Count  int    `json:"count"`
}

type StatusCodeMetric struct {
	StatusCode int `json:"status_code"`
	Count      int `json:"count"`
}

type HostMetric struct {
	Host  string `json:"host"`
	Count int    `json:"count"`
}

// GetMetrics returns metrics for request logs
func (h *RequestLogsHandler) GetMetrics(c fiber.Ctx) error {
	projectID := c.Params("id")

	query := new(GetMetricsQuery)
	if err := c.Bind().Query(query); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid query parameters",
			"message": err.Error(),
		})
	}

	// Set defaults
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

	// Base query parameters
	baseParams := []interface{}{
		projectID,
		timescale.UnixMsToTime(query.Start),
		timescale.UnixMsToTime(query.End),
	}

	// Base where conditions
	baseWhere := `
		project_id = $1
		AND timestamp >= $2
		AND timestamp <= $3
	`
	paramCount := 4

	// Additional filters
	filters := ""
	if query.Method != nil {
		filters += fmt.Sprintf(" AND method = $%d", paramCount)
		baseParams = append(baseParams, *query.Method)
		paramCount++
	}
	if query.StatusCode != nil {
		filters += fmt.Sprintf(" AND status_code = $%d", paramCount)
		baseParams = append(baseParams, *query.StatusCode)
		paramCount++
	}
	if query.Host != nil {
		filters += fmt.Sprintf(" AND host = $%d", paramCount)
		baseParams = append(baseParams, *query.Host)
		paramCount++
	}

	// Get total count
	totalSQL := fmt.Sprintf("SELECT COUNT(*) FROM request_logs WHERE %s", baseWhere+filters)
	var total int
	err := h.pool.QueryRow(c.Context(), totalSQL, baseParams...).Scan(&total)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get total count",
			"message": err.Error(),
		})
	}

	// Get counts by method
	byMethodSQL := fmt.Sprintf(`
		SELECT method, COUNT(*) 
		FROM request_logs 
		WHERE %s 
		GROUP BY method 
		ORDER BY COUNT(*) DESC 
		LIMIT 10
	`, baseWhere+filters)

	methodRows, err := h.pool.Query(c.Context(), byMethodSQL, baseParams...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get method metrics",
			"message": err.Error(),
		})
	}
	defer methodRows.Close()

	byMethod := make([]MethodMetric, 0)
	for methodRows.Next() {
		var metric MethodMetric
		if err := methodRows.Scan(&metric.Method, &metric.Count); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to scan method metrics",
				"message": err.Error(),
			})
		}
		byMethod = append(byMethod, metric)
	}

	// Get counts by status code
	byStatusCodeSQL := fmt.Sprintf(`
		SELECT status_code, COUNT(*) 
		FROM request_logs 
		WHERE %s 
		GROUP BY status_code 
		ORDER BY COUNT(*) DESC 
		LIMIT 10
	`, baseWhere+filters)

	statusRows, err := h.pool.Query(c.Context(), byStatusCodeSQL, baseParams...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get status code metrics",
			"message": err.Error(),
		})
	}
	defer statusRows.Close()

	byStatusCode := make([]StatusCodeMetric, 0)
	for statusRows.Next() {
		var metric StatusCodeMetric
		if err := statusRows.Scan(&metric.StatusCode, &metric.Count); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to scan status code metrics",
				"message": err.Error(),
			})
		}
		byStatusCode = append(byStatusCode, metric)
	}

	// Get counts by host
	byHostSQL := fmt.Sprintf(`
		SELECT host, COUNT(*) 
		FROM request_logs 
		WHERE %s 
		GROUP BY host 
		ORDER BY COUNT(*) DESC 
		LIMIT 10
	`, baseWhere+filters)

	hostRows, err := h.pool.Query(c.Context(), byHostSQL, baseParams...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get host metrics",
			"message": err.Error(),
		})
	}
	defer hostRows.Close()

	byHost := make([]HostMetric, 0)
	for hostRows.Next() {
		var metric HostMetric
		if err := hostRows.Scan(&metric.Host, &metric.Count); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to scan host metrics",
				"message": err.Error(),
			})
		}
		byHost = append(byHost, metric)
	}

	// Get time series data
	timeMetricsSQL := fmt.Sprintf(`
		SELECT 
			time_bucket($%d, timestamp) AS bucket,
			COUNT(*) AS count
		FROM request_logs
		WHERE %s
		GROUP BY bucket
		ORDER BY bucket ASC
	`, paramCount, baseWhere+filters)

	baseParams = append(baseParams, timescale.ConvertIntervalToPostgresFormat(query.Interval))

	timeRows, err := h.pool.Query(c.Context(), timeMetricsSQL, baseParams...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get time metrics",
			"message": err.Error(),
		})
	}
	defer timeRows.Close()

	byTime := make([]timescale.TimeMetric, 0)
	for timeRows.Next() {
		var bucket time.Time
		var count int
		if err := timeRows.Scan(&bucket, &count); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to scan time metrics",
				"message": err.Error(),
			})
		}

		byTime = append(byTime, timescale.TimeMetric{
			Timestamp: bucket.UnixMilli(),
			Count:     count,
		})
	}

	return c.JSON(RequestLogMetricsResponse{
		Total:        total,
		ByMethod:     byMethod,
		ByStatusCode: byStatusCode,
		ByHost:       byHost,
		ByTime:       byTime,
	})
}

// DeleteRequestLog deletes a specific request log
func (h *RequestLogsHandler) DeleteRequestLog(c fiber.Ctx) error {
	projectID := c.Params("id")
	logID := c.Params("logId")

	// Check if the log exists and belongs to the project
	var exists bool
	checkSQL := "SELECT EXISTS(SELECT 1 FROM request_logs WHERE id = $1 AND project_id = $2)"
	err := h.pool.QueryRow(c.Context(), checkSQL, logID, projectID).Scan(&exists)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to check log existence",
			"message": err.Error(),
		})
	}

	if !exists {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "Log not found",
			"message": "The specified log does not exist or does not belong to the project",
		})
	}

	// Delete the log
	deleteSQL := "DELETE FROM request_logs WHERE id = $1 AND project_id = $2"
	_, err = h.pool.Exec(c.Context(), deleteSQL, logID, projectID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to delete log",
			"message": err.Error(),
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
