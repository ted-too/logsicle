package events

import (
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/timescale"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

type GetEventLogsQuery struct {
	timescale.CommonLogQueryOptions
	ChannelSlug *string  `json:"channel_slug,omitempty" query:"channelSlug"`
	Name        *string  `json:"name,omitempty" query:"name"`
	Tags        []string `json:"tags,omitempty" query:"tags"`
}

// Validate implements validation.Validatable
func (q GetEventLogsQuery) Validate() error {
	if err := q.CommonLogQueryOptions.Validate(); err != nil {
		return err
	}

	return validation.ValidateStruct(&q,
		validation.Field(&q.ChannelSlug),
		validation.Field(&q.Name),
		validation.Field(&q.Tags),
	)
}

type EventLogsResponse struct {
	Data []models.EventLog        `json:"data"`
	Meta timescale.PaginationMeta `json:"meta"`
}

func (h *EventsHandler) GetEventLogs(c fiber.Ctx) error {
	projectID := c.Params("id")

	query := new(GetEventLogsQuery)
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
		FROM event_logs el
		LEFT JOIN event_channels ec ON el.channel_id = ec.id
		WHERE el.project_id = $1
		  AND el.timestamp >= $2
		  AND el.timestamp <= $3
	`
	baseParams := []interface{}{
		projectID,
		timescale.UnixMsToTime(query.Start),
		timescale.UnixMsToTime(query.End),
	}
	paramCount := 4

	// Apply additional filters
	whereClause := ""
	if query.ChannelSlug != nil {
		whereClause += fmt.Sprintf(" AND ec.slug = $%d", paramCount)
		baseParams = append(baseParams, *query.ChannelSlug)
		paramCount++
	}
	if query.Name != nil {
		whereClause += fmt.Sprintf(" AND el.name ILIKE $%d", paramCount)
		baseParams = append(baseParams, fmt.Sprintf("%%%s%%", *query.Name)) // Add wildcards for partial matching
		paramCount++
	}
	if len(query.Tags) > 0 {
		whereClause += fmt.Sprintf(" AND el.tags ?| $%d", paramCount)
		baseParams = append(baseParams, query.Tags)
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
			el.id, el.project_id, el.channel_id, el.name, 
			el.description, el.metadata, el.tags, el.timestamp,
			ec.name as channel_name, ec.color as channel_color, ec.slug as channel_slug
	` + baseQuery + whereClause + `
		ORDER BY el.timestamp DESC
		LIMIT $` + fmt.Sprint(paramCount) + ` OFFSET $` + fmt.Sprint(paramCount+1)

	baseParams = append(baseParams, query.Limit, offset)

	rows, err := h.pool.Query(c.Context(), dataSQL, baseParams...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch event logs",
			"message": err.Error(),
		})
	}
	defer rows.Close()

	// Process results
	logs := make([]models.EventLog, 0)
	for rows.Next() {
		var log models.EventLog
		var channelName, channelColor, channelSlug *string

		err := rows.Scan(
			&log.ID, &log.ProjectID, &log.ChannelID, &log.Name,
			&log.Description, &log.Metadata, &log.Tags, &log.Timestamp,
			&channelName, &channelColor, &channelSlug,
		)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to scan event logs",
				"message": err.Error(),
			})
		}

		// Set channel information if available
		if log.ChannelID.Valid && channelName != nil {
			log.Channel = &models.ChannelRelation{
				Name:  *channelName,
				Color: channelColor,
				Slug:  channelSlug,
			}
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

	return c.JSON(EventLogsResponse{
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

type GetEventMetricsQuery struct {
	timescale.CommonMetricsQueryOptions
	ChannelSlug *string `json:"channel_slug,omitempty" query:"channelSlug"`
	Name        *string `json:"name,omitempty" query:"name"`
}

// Validate implements validation.Validatable
func (q GetEventMetricsQuery) Validate() error {
	if err := q.CommonMetricsQueryOptions.Validate(); err != nil {
		return err
	}

	return validation.ValidateStruct(&q,
		validation.Field(&q.ChannelSlug),
		validation.Field(&q.Name),
	)
}

// Define structs that match the TypeScript interface
type EventMetricsResponse struct {
	Total     int                    `json:"total"`
	ByTime    []timescale.TimeMetric `json:"by_time"`
	ByChannel []ChannelMetric        `json:"by_channel"`
}

type ChannelMetric struct {
	ChannelSlug string `json:"channel_slug"`
	ChannelName string `json:"channel_name"`
	Count       int    `json:"count"`
}

func (h *EventsHandler) GetMetrics(c fiber.Ctx) error {
	projectID := c.Params("id")

	query := new(GetEventMetricsQuery)
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
	if query.ChannelSlug != nil {
		filterClause += fmt.Sprintf(" AND ec.slug = $%d", paramCount)
		baseParams = append(baseParams, *query.ChannelSlug)
		paramCount++
	}
	if query.Name != nil {
		filterClause += fmt.Sprintf(" AND name ILIKE $%d", paramCount)
		baseParams = append(baseParams, fmt.Sprintf("%%%s%%", *query.Name)) // Add wildcards for partial matching
		paramCount++
	}

	// 1. Get total count
	totalSql := `SELECT COUNT(*) 
		FROM event_logs
		LEFT JOIN event_channels ec ON event_logs.channel_id = ec.id
	` + baseWhere + filterClause

	var totalCount int
	err := h.pool.QueryRow(c.Context(), totalSql, baseParams...).Scan(&totalCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get total count",
			"message": err.Error(),
		})
	}

	// Create response object
	response := EventMetricsResponse{
		Total:     totalCount,
		ByChannel: []ChannelMetric{},
		ByTime:    []timescale.TimeMetric{},
	}

	// 2. Get metrics by channel
	channelSQL := `
		SELECT 
			ec.slug as channel_slug,
			ec.name as channel_name,
			COUNT(*) as count
		FROM event_logs
		LEFT JOIN event_channels ec ON event_logs.channel_id = ec.id
	` + baseWhere + filterClause + `
		GROUP BY channel_slug, channel_name
		ORDER BY count DESC
	`

	channelRows, err := h.pool.Query(c.Context(), channelSQL, baseParams...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch channel metrics",
			"message": err.Error(),
		})
	}
	defer channelRows.Close()

	for channelRows.Next() {
		var channelSlug, channelName *string
		var count int

		if err := channelRows.Scan(&channelSlug, &channelName, &count); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to scan channel metrics",
				"message": err.Error(),
			})
		}

		// Only add to response if we have valid channel info
		if channelSlug != nil && channelName != nil {
			response.ByChannel = append(response.ByChannel, ChannelMetric{
				ChannelSlug: *channelSlug,
				ChannelName: *channelName,
				Count:       count,
			})
		}
	}

	// 3. Get metrics by time with correct parameter numbering
	timeSql := fmt.Sprintf(`
		SELECT 
			time_bucket($%d, timestamp) AS bucket,
			COUNT(*) AS count
		FROM event_logs
		LEFT JOIN event_channels ec ON event_logs.channel_id = ec.id
	`, paramCount) + baseWhere + filterClause + `
		GROUP BY bucket
		ORDER BY bucket ASC
	`

	// Add the interval parameter last
	baseParams = append(baseParams, timescale.ConvertIntervalToPostgresFormat(query.Interval))

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

func (h *EventsHandler) DeleteEvent(c fiber.Ctx) error {
	projectID := c.Params("id")
	eventID := c.Params("eventId")

	sql := "DELETE FROM event_logs WHERE id = $1 AND project_id = $2"

	result, err := h.pool.Exec(c.Context(), sql, eventID, projectID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to delete event log",
			"error":   err.Error(),
		})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Event log not found",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
