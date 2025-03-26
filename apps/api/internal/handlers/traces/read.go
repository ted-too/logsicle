package traces

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/storage/timescale"
	"github.com/ted-too/logsicle/internal/storage/timescale/models"
)

// GetTraces returns a list of traces for a project
func (h *TracesHandler) GetTraces(c fiber.Ctx) error {
	projectID := c.Params("id")
	if projectID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Project ID is required",
		})
	}

	// Check if user can access this project
	userID := c.Locals("user_id").(string)
	orgID := c.Locals("org_id").(string)
	if !canUserAccessProject(h.db, userID, orgID, projectID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Forbidden",
		})
	}

	// Parse query parameters
	start := c.Query("start", fmt.Sprintf("%d", time.Now().Add(-24*time.Hour).UnixMilli()))
	end := c.Query("end", fmt.Sprintf("%d", time.Now().UnixMilli()))
	limit := c.Query("limit", "100")
	page := c.Query("page", "1")
	search := c.Query("search")
	traceID := c.Query("trace_id")

	// Convert to int64
	startUnix, err := parseInt64(start)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid start time",
		})
	}

	endUnix, err := parseInt64(end)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid end time",
		})
	}

	limitInt, err := parseInt64(limit)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid limit",
		})
	}

	pageInt, err := parseInt64(page)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid page",
		})
	}

	// Set up query options
	options := traceQueryOptions{
		CommonLogQueryOptions: timescale.CommonLogQueryOptions{
			Start:  startUnix,
			End:    endUnix,
			Limit:  int(limitInt),
			Page:   int(pageInt),
			Search: nil,
		},
		TraceID: traceID,
	}

	if search != "" {
		options.Search = &search
	}

	if err := options.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": err.Error(),
		})
	}

	// Get the traces from TimescaleDB
	traces, pagination, err := getTraces(c.Context(), h.pool, projectID, options)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get traces",
		})
	}

	return c.JSON(fiber.Map{
		"traces":     traces,
		"pagination": pagination,
	})
}

// GetTraceStats returns statistics for traces
func (h *TracesHandler) GetTraceStats(c fiber.Ctx) error {
	projectID := c.Params("id")
	if projectID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Project ID is required",
		})
	}

	// Check if user can access this project
	userID := c.Locals("user_id").(string)
	orgID := c.Locals("org_id").(string)
	if !canUserAccessProject(h.db, userID, orgID, projectID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Forbidden",
		})
	}

	// Parse query parameters
	start := c.Query("start", fmt.Sprintf("%d", time.Now().Add(-24*time.Hour).UnixMilli()))
	end := c.Query("end", fmt.Sprintf("%d", time.Now().UnixMilli()))
	interval := c.Query("interval", "")

	// Convert to int64
	startUnix, err := parseInt64(start)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid start time",
		})
	}

	endUnix, err := parseInt64(end)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid end time",
		})
	}

	// If no interval is provided, suggest one based on time range
	if interval == "" {
		interval = timescale.SuggestInterval(startUnix, endUnix)
	}

	// Set up metrics query options
	options := timescale.CommonMetricsQueryOptions{
		Start:    startUnix,
		End:      endUnix,
		Interval: interval,
	}

	if err := options.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": err.Error(),
		})
	}

	// Get trace stats
	stats, err := getTraceStats(c.Context(), h.pool, projectID, options)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get trace statistics",
		})
	}

	return c.JSON(fiber.Map{
		"stats":    stats,
		"interval": interval,
	})
}

// GetTraceTimeline returns a timeline of a specific trace
func (h *TracesHandler) GetTraceTimeline(c fiber.Ctx) error {
	projectID := c.Params("id")
	traceID := c.Params("traceId")

	if projectID == "" || traceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Project ID and Trace ID are required",
		})
	}

	// Check if user can access this project
	userID := c.Locals("user_id").(string)
	orgID := c.Locals("org_id").(string)
	if !canUserAccessProject(h.db, userID, orgID, projectID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Forbidden",
		})
	}

	// Get all spans for this trace
	spans, err := getTraceSpans(c.Context(), h.pool, projectID, traceID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get trace timeline",
		})
	}

	return c.JSON(fiber.Map{
		"spans": spans,
	})
}

// Helper function to check if a user can access a project
func canUserAccessProject(db interface{}, userID, orgID, projectID string) bool {
	// In a real implementation, query the database to check if the user has access
	// This is a placeholder - implement according to your auth system
	return true
}

// Helper function to parse int64
func parseInt64(s string) (int64, error) {
	var i int64
	_, err := fmt.Sscanf(s, "%d", &i)
	return i, err
}

// traceQueryOptions extends CommonLogQueryOptions with trace-specific options
type traceQueryOptions struct {
	timescale.CommonLogQueryOptions
	TraceID string
}

// getTraces queries TimescaleDB for traces
func getTraces(ctx context.Context, pool *pgxpool.Pool, projectID string, options traceQueryOptions) ([]*models.Trace, *timescale.PaginationMeta, error) {
	offset := (options.Page - 1) * options.Limit

	// Build the query
	query := `
		SELECT 
			id, trace_id, parent_id, project_id,
			name, kind, start_time, end_time,
			duration_ms, status, status_message,
			service_name, service_version,
			attributes, events, links,
			resource_attributes, timestamp
		FROM traces
		WHERE project_id = $1
		AND timestamp BETWEEN $2 AND $3
	`

	// Add trace ID filter if provided
	args := []interface{}{projectID, timescale.UnixMsToTime(options.Start), timescale.UnixMsToTime(options.End)}
	if options.TraceID != "" {
		query += ` AND trace_id = $4`
		args = append(args, options.TraceID)
	}

	// Add search clause if search is provided
	if options.Search != nil && *options.Search != "" {
		paramIndex := len(args) + 1
		query += fmt.Sprintf(`
			AND (
				name ILIKE $%d OR
				service_name ILIKE $%d
			)
		`, paramIndex, paramIndex)
		args = append(args, "%"+*options.Search+"%")
	}

	// Add order by and pagination
	query += `
		ORDER BY timestamp DESC
		LIMIT $%d OFFSET $%d
	`
	args = append(args, options.Limit, offset)
	query = fmt.Sprintf(query, len(args)-1, len(args))

	// Count total rows
	var totalRows int
	countQuery := `
		SELECT COUNT(*)
		FROM traces
		WHERE project_id = $1
		AND timestamp BETWEEN $2 AND $3
	`
	countArgs := []interface{}{projectID, timescale.UnixMsToTime(options.Start), timescale.UnixMsToTime(options.End)}

	if options.TraceID != "" {
		countQuery += ` AND trace_id = $4`
		countArgs = append(countArgs, options.TraceID)
	}

	if options.Search != nil && *options.Search != "" {
		paramIndex := len(countArgs) + 1
		countQuery += fmt.Sprintf(`
			AND (
				name ILIKE $%d OR
				service_name ILIKE $%d
			)
		`, paramIndex, paramIndex)
		countArgs = append(countArgs, "%"+*options.Search+"%")
	}

	if err := pool.QueryRow(ctx, countQuery, countArgs...).Scan(&totalRows); err != nil {
		return nil, nil, err
	}

	// Execute the main query
	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var traces []*models.Trace
	for rows.Next() {
		t := &models.Trace{}
		err := rows.Scan(
			&t.ID, &t.TraceID, &t.ParentID, &t.ProjectID,
			&t.Name, &t.Kind, &t.StartTime, &t.EndTime,
			&t.DurationMs, &t.Status, &t.StatusMsg,
			&t.ServiceName, &t.ServiceVersion,
			&t.Attributes, &t.Events, &t.Links,
			&t.ResourceAttributes, &t.Timestamp,
		)
		if err != nil {
			return nil, nil, err
		}
		traces = append(traces, t)
	}

	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	// Calculate pagination metadata
	nextPage := options.Page + 1
	if offset+options.Limit >= totalRows {
		nextPage = 0
	}

	prevPage := options.Page - 1
	if options.Page <= 1 {
		prevPage = 0
	}

	pagination := &timescale.PaginationMeta{
		TotalRowCount:         totalRows,
		TotalFilteredRowCount: totalRows, // Assuming filter is applied in the count query
		CurrentPage:           options.Page,
		NextPage:              nil,
		PrevPage:              nil,
	}

	if nextPage > 0 {
		pagination.NextPage = &nextPage
	}

	if prevPage > 0 {
		pagination.PrevPage = &prevPage
	}

	return traces, pagination, nil
}

// getTraceStats gets time-based statistics for traces
func getTraceStats(ctx context.Context, pool *pgxpool.Pool, projectID string, options timescale.CommonMetricsQueryOptions) ([]timescale.TimeMetric, error) {
	pgInterval := timescale.ConvertIntervalToPostgresFormat(options.Interval)

	query := `
		SELECT 
			time_bucket(%s, timestamp) AS bucket,
			COUNT(*) AS count
		FROM traces
		WHERE project_id = $1
		AND timestamp BETWEEN $2 AND $3
		GROUP BY bucket
		ORDER BY bucket
	`
	query = fmt.Sprintf(query, pgInterval)

	rows, err := pool.Query(
		ctx,
		query,
		projectID,
		timescale.UnixMsToTime(options.Start),
		timescale.UnixMsToTime(options.End),
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return []timescale.TimeMetric{}, nil
		}
		return nil, err
	}
	defer rows.Close()

	var stats []timescale.TimeMetric
	for rows.Next() {
		var bucket time.Time
		var count int
		if err := rows.Scan(&bucket, &count); err != nil {
			return nil, err
		}

		stats = append(stats, timescale.TimeMetric{
			Timestamp: timescale.TimeToUnixMs(bucket),
			Count:     count,
		})
	}

	return stats, nil
}

// getTraceSpans gets all spans for a specific trace ID
func getTraceSpans(ctx context.Context, pool *pgxpool.Pool, projectID string, traceID string) ([]*models.Trace, error) {
	query := `
		SELECT 
			id, trace_id, parent_id, project_id,
			name, kind, start_time, end_time,
			duration_ms, status, status_message,
			service_name, service_version,
			attributes, events, links,
			resource_attributes, timestamp
		FROM traces
		WHERE project_id = $1
		AND trace_id = $2
		ORDER BY start_time
	`

	rows, err := pool.Query(ctx, query, projectID, traceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var spans []*models.Trace
	for rows.Next() {
		t := &models.Trace{}
		err := rows.Scan(
			&t.ID, &t.TraceID, &t.ParentID, &t.ProjectID,
			&t.Name, &t.Kind, &t.StartTime, &t.EndTime,
			&t.DurationMs, &t.Status, &t.StatusMsg,
			&t.ServiceName, &t.ServiceVersion,
			&t.Attributes, &t.Events, &t.Links,
			&t.ResourceAttributes, &t.Timestamp,
		)
		if err != nil {
			return nil, err
		}
		spans = append(spans, t)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return spans, nil
}
