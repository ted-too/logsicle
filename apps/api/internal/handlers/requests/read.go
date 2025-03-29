package requests

import (
	"fmt"
	"strings"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/timescale"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

type Filter struct {
	Method      []string `json:"method,omitempty" query:"method"`
	StatusCode  []int    `json:"status_code,omitempty" query:"status_code"`
	PathPattern *string  `json:"path_pattern,omitempty" query:"path_pattern"`
	Host        *string  `json:"host,omitempty" query:"host"`
	Level       []string `json:"level,omitempty" query:"level"`
}

func (f Filter) ProcessLevels() []string {
	var levels []string
	if len(f.Level) > 0 {
		for _, level := range f.Level {
			split := strings.Split(level, ",")
			for _, s := range split {
				if trimmed := strings.TrimSpace(s); trimmed != "" {
					levels = append(levels, trimmed)
				}
			}
		}
	}
	return levels
}

func (f Filter) ProcessMethods() []string {
	var methods []string
	if len(f.Method) > 0 {
		for _, method := range f.Method {
			split := strings.Split(method, ",")
			for _, s := range split {
				if trimmed := strings.TrimSpace(s); trimmed != "" {
					methods = append(methods, trimmed)
				}
			}
		}
	}
	return methods
}

func (f Filter) ProcessStatusCodes() []int {
	var codes []int
	if len(f.StatusCode) >= 1 {
		if len(f.StatusCode) >= 2 {
			codes = []int{f.StatusCode[0], f.StatusCode[1]}
		} else {
			codes = []int{f.StatusCode[0], 599}
		}
	}
	return codes
}

func (f Filter) Validate() error {
	levels := f.ProcessLevels()
	for _, level := range levels {
		if err := models.ValidateRequestLevel(level); err != nil {
			return err
		}
	}

	methods := f.ProcessMethods()
	for _, method := range methods {
		if err := models.ValidateRequestMethod(method); err != nil {
			return err
		}
	}

	if len(f.StatusCode) >= 2 {
		if f.StatusCode[0] < 100 || f.StatusCode[0] > 599 || f.StatusCode[1] < 100 || f.StatusCode[1] > 599 {
			return validation.NewError("validation_status_code", "status code must be between 100 and 599")
		}
	}

	return validation.ValidateStruct(&f,
		validation.Field(&f.PathPattern),
		validation.Field(&f.Host),
	)
}

type GetRequestLogsQuery struct {
	timescale.CommonLogQueryOptions
	Filter
}

// Validate implements validation.Validatable
func (q *GetRequestLogsQuery) Validate() error {
	if err := q.CommonLogQueryOptions.Validate(); err != nil {
		return err
	}

	// Process methods and levels before validation
	q.Method = q.Filter.ProcessMethods()
	q.Level = q.Filter.ProcessLevels()
	q.StatusCode = q.Filter.ProcessStatusCodes()

	return q.Filter.Validate()
}

// SetDefaults sets default values for query parameters
func (q *GetRequestLogsQuery) SetDefaults() {
	if q.Limit == 0 {
		q.Limit = 20
	} else if q.Limit > 100 {
		q.Limit = 100
	}
	if q.Page == 0 {
		q.Page = 1
	}
	if q.End == 0 {
		q.End = time.Now().UnixMilli()
	}
	if q.Start == 0 {
		q.Start = q.End - 24*time.Hour.Milliseconds()
	}
}

type RequestLogResponse struct {
	Data   []models.RequestLog      `json:"data"`
	Meta   timescale.PaginationMeta `json:"meta"`
	Facets models.Facets            `json:"facets"`
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

	query.SetDefaults()

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
	if len(query.Method) > 0 {
		placeholders := make([]string, len(query.Method))
		for i := range query.Method {
			placeholders[i] = fmt.Sprintf("$%d", paramCount)
			baseParams = append(baseParams, query.Method[i])
			paramCount++
		}
		whereClause += fmt.Sprintf(" AND rl.method IN (%s)", strings.Join(placeholders, ", "))
	}
	if len(query.Level) > 0 {
		placeholders := make([]string, len(query.Level))
		for i := range query.Level {
			placeholders[i] = fmt.Sprintf("$%d", paramCount)
			baseParams = append(baseParams, query.Level[i])
			paramCount++
		}
		whereClause += fmt.Sprintf(" AND rl.level IN (%s)", strings.Join(placeholders, ", "))
	}

	if len(query.StatusCode) >= 2 {
		whereClause += fmt.Sprintf(" AND rl.status_code BETWEEN $%d AND $%d", paramCount, paramCount+1)
		baseParams = append(baseParams, query.StatusCode[0], query.StatusCode[1])
		paramCount += 2
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
			rl.level, rl.duration, rl.request_body, rl.response_body, rl.headers, 
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
			&log.Level, &log.Duration, &log.RequestBody, &log.ResponseBody, &log.Headers,
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
		Facets: models.GetRequestFacets(logs),
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
