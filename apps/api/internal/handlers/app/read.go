package app

import (
	"fmt"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/timescale"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

type Filter struct {
	Level       []string `json:"level,omitempty" query:"level"`
	ServiceName *string  `json:"service_name,omitempty" query:"serviceName"`
	Environment *string  `json:"environment,omitempty" query:"environment"`
}

// ProcessLevels splits comma-separated levels and returns the processed slice
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

func (f Filter) Validate() error {
	// Process and validate each level
	levels := f.ProcessLevels()
	for _, level := range levels {
		if err := models.ValidateLogLevel(level); err != nil {
			return err
		}
	}

	return validation.ValidateStruct(&f,
		validation.Field(&f.ServiceName),
		validation.Field(&f.Environment),
	)
}

type GetAppLogsQuery struct {
	timescale.CommonLogQueryOptions
	Filter
}

// Validate implements validation.Validatable
func (q *GetAppLogsQuery) Validate() error {
	if err := q.CommonLogQueryOptions.Validate(); err != nil {
		return err
	}

	// Process levels before validation
	q.Level = q.Filter.ProcessLevels()

	return q.Filter.Validate()
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
	if len(query.Level) > 0 {
		placeholders := make([]string, len(query.Level))
		for i := range query.Level {
			placeholders[i] = fmt.Sprintf("$%d", paramCount)
			baseParams = append(baseParams, query.Level[i])
			paramCount++
		}
		whereClause += fmt.Sprintf(" AND al.level IN (%s)", strings.Join(placeholders, ", "))
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
