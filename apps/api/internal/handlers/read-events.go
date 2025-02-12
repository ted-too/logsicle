package handlers

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/storage/models"
	"github.com/ted-too/logsicle/internal/storage/timescale"
	"gorm.io/gorm"
)

type ReadHandler struct {
	db   *gorm.DB      // For auth/project verification
	pool *pgxpool.Pool // For efficient data reading
}

func NewReadHandler(db *gorm.DB, pool *pgxpool.Pool) *ReadHandler {
	return &ReadHandler{db: db, pool: pool}
}

type GetEventLogsQuery struct {
	ChannelID *string   `query:"channelId"`
	Before    time.Time `query:"before"`
	Limit     int       `query:"limit"`
	Name      *string   `query:"name"`
	Tags      []string  `query:"tags"`
}

type PaginatedEventLogs struct {
	Data          []timescale.EventLog `json:"data"`
	TotalCount    int64                `json:"totalCount"`
	FilteredCount int64                `json:"filteredCount"`
	HasNext       bool                 `json:"hasNext"`
	HasPrev       bool                 `json:"hasPrev"`
}

func (h *ReadHandler) GetEventLogs(c fiber.Ctx) error {
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

	query := new(GetEventLogsQuery)
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

	// First, get total count with channel filter only
	countSQL := `
        SELECT COUNT(*)
        FROM event_logs
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

	// Build the filtered count query with all filters
	filteredCountSQL := `
	 SELECT COUNT(*)
	 FROM event_logs
	 WHERE project_id = $1
	 AND ($2::text IS NULL OR channel_id = $2)
`
	args := []interface{}{projectID, query.ChannelID}
	argCount := 3

	// Add optional name filter
	if query.Name != nil {
		filteredCountSQL += fmt.Sprintf(" AND name ILIKE $%d", argCount)
		args = append(args, fmt.Sprintf("%%%s%%", *query.Name))
		argCount++
	}

	// Add optional tags filter
	if len(query.Tags) > 0 {
		filteredCountSQL += fmt.Sprintf(" AND tags ?| $%d", argCount)
		args = append(args, query.Tags)
		argCount++
	}

	var filteredCount int64
	err = h.pool.QueryRow(c.Context(), filteredCountSQL, args...).Scan(&filteredCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get filtered count",
		})
	}

	// Build the data query
	dataSQL := `
				SELECT 
						el.id, el.project_id, el.channel_id, el.name, el.description,
						el.metadata, el.tags, el.timestamp,
						ec.name as channel_name, ec.color as channel_color
				FROM event_logs el
				LEFT JOIN event_channels ec ON el.channel_id = ec.id
				WHERE el.project_id = $1
				AND ($2::text IS NULL OR el.channel_id = $2)
				AND el.timestamp < $3
    `
	args = []interface{}{projectID, query.ChannelID, query.Before}
	argCount = 4

	// Add optional name filter (if provided)
	if query.Name != nil {
		dataSQL += fmt.Sprintf(" AND el.name ILIKE $%d", argCount)
		args = append(args, fmt.Sprintf("%%%s%%", *query.Name))
		argCount++
	}

	// Add optional tags filter (if provided)
	if len(query.Tags) > 0 {
		dataSQL += fmt.Sprintf(" AND tags ?| $%d", argCount)
		args = append(args, query.Tags)
		argCount++
	}

	dataSQL += " ORDER BY timestamp DESC LIMIT $" + fmt.Sprint(argCount)
	args = append(args, query.Limit)

	// Execute query
	rows, err := h.pool.Query(c.Context(), dataSQL, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch event logs",
			"message": err.Error(),
		})
	}
	defer rows.Close()

	logs := make([]timescale.EventLog, 0)
	for rows.Next() {
		var log timescale.EventLog
		var channelName, channelColor sql.NullString
		err := rows.Scan(
			&log.ID, &log.ProjectID, &log.ChannelID, &log.Name,
			&log.Description, &log.Metadata, &log.Tags, &log.Timestamp,
			&channelName, &channelColor,
		)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to scan event logs",
			})
		}

		// Only set channel relation if we have channel data
		if log.ChannelID.Valid {
			var colorPtr *string
			if channelColor.Valid {
				colorPtr = &channelColor.String
			}

			log.Channel = &timescale.ChannelRelation{
				Name:  channelName.String,
				Color: colorPtr,
			}
		}

		logs = append(logs, log)
	}

	// Calculate if there are previous/next pages
	hasNext := len(logs) == query.Limit
	hasPrev := query.Before.Before(time.Now()) // If before is not now, there are previous records

	return c.JSON(PaginatedEventLogs{
		Data:          logs,
		TotalCount:    totalCount,
		FilteredCount: filteredCount,
		HasNext:       hasNext,
		HasPrev:       hasPrev,
	})
}

type TimeRange string

const (
	Last24Hours TimeRange = "24h"
	Last7Days   TimeRange = "7d"
	Last30Days  TimeRange = "30d"
)

type GetEventMetricsQuery struct {
	ChannelID *string   `query:"channelId"`
	Range     TimeRange `query:"range"`
	Name      *string   `query:"name"`
}

func (h *ReadHandler) GetEventMetrics(c fiber.Ctx) error {
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

	query := new(GetEventMetricsQuery)
	if err := c.Bind().Query(query); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	// Set default range
	if query.Range == "" {
		query.Range = Last24Hours
	}

	// Calculate time bucket and range
	var interval string
	var startTime time.Time
	now := time.Now()

	switch query.Range {
	case Last24Hours:
		interval = "1 hour"
		startTime = now.Add(-24 * time.Hour)
	case Last7Days:
		interval = "1 day"
		startTime = now.Add(-7 * 24 * time.Hour)
	case Last30Days:
		interval = "1 day"
		startTime = now.Add(-30 * 24 * time.Hour)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid time range",
		})
	}

	sql := `
		SELECT 
			time_bucket($1, timestamp) AS bucket,
			COUNT(*) as count
		FROM event_logs
		WHERE project_id = $2
		AND timestamp >= $3
		AND timestamp <= $4
	`
	args := []interface{}{interval, projectID, startTime, now}
	argCount := 5

	// Add optional filters
	if query.ChannelID != nil {
		sql += fmt.Sprintf(" AND channel_id = $%d", argCount)
		args = append(args, *query.ChannelID)
		argCount++
	}
	if query.Name != nil {
		sql += fmt.Sprintf(" AND name ILIKE $%d", argCount)
		args = append(args, fmt.Sprintf("%%%s%%", *query.Name)) // Add wildcards for partial matching
		argCount++
	}

	sql += " GROUP BY bucket ORDER BY bucket"

	// Execute query
	rows, err := h.pool.Query(c.Context(), sql, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch event metrics",
		})
	}
	defer rows.Close()

	var metrics []struct {
		Bucket time.Time `json:"bucket"`
		Count  int       `json:"count"`
	}

	for rows.Next() {
		var metric struct {
			Bucket time.Time `json:"bucket"`
			Count  int       `json:"count"`
		}
		if err := rows.Scan(&metric.Bucket, &metric.Count); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to scan metrics",
			})
		}
		metrics = append(metrics, metric)
	}

	return c.JSON(metrics)
}
