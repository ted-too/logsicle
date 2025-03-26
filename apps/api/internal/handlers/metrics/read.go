package metrics

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

// GetMetrics returns a list of metrics for a project
func (h *MetricsHandler) GetMetrics(c fiber.Ctx) error {
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
	options := timescale.CommonLogQueryOptions{
		Start:  startUnix,
		End:    endUnix,
		Limit:  int(limitInt),
		Page:   int(pageInt),
		Search: nil,
	}

	if search != "" {
		options.Search = &search
	}

	if err := options.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": err.Error(),
		})
	}

	// Get the metrics from TimescaleDB
	metrics, pagination, err := getMetrics(c.Context(), h.pool, projectID, options)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get metrics",
		})
	}

	return c.JSON(fiber.Map{
		"metrics":    metrics,
		"pagination": pagination,
	})
}

// GetMetricStats returns statistics for metrics
func (h *MetricsHandler) GetMetricStats(c fiber.Ctx) error {
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

	// Get metrics stats
	stats, err := getMetricStats(c.Context(), h.pool, projectID, options)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get metric statistics",
		})
	}

	return c.JSON(fiber.Map{
		"stats":    stats,
		"interval": interval,
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

// getMetrics queries TimescaleDB for metrics
func getMetrics(ctx context.Context, pool *pgxpool.Pool, projectID string, options timescale.CommonLogQueryOptions) ([]*models.Metric, *timescale.PaginationMeta, error) {
	offset := (options.Page - 1) * options.Limit

	// Build the query
	query := `
		SELECT 
			id, project_id, name, description, unit, type,
			value, timestamp,
			is_monotonic,
			bounds, bucket_counts, count, sum,
			quantile_values,
			service_name, service_version,
			attributes, resource_attributes,
			aggregation_temporality
		FROM metrics
		WHERE project_id = $1
		AND timestamp BETWEEN $2 AND $3
	`

	// Add search clause if search is provided
	args := []interface{}{projectID, timescale.UnixMsToTime(options.Start), timescale.UnixMsToTime(options.End)}
	if options.Search != nil && *options.Search != "" {
		query += `
			AND (
				name ILIKE $4 OR
				description ILIKE $4 OR
				service_name ILIKE $4
			)
		`
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
		FROM metrics
		WHERE project_id = $1
		AND timestamp BETWEEN $2 AND $3
	`
	countArgs := []interface{}{projectID, timescale.UnixMsToTime(options.Start), timescale.UnixMsToTime(options.End)}

	if options.Search != nil && *options.Search != "" {
		countQuery += `
			AND (
				name ILIKE $4 OR
				description ILIKE $4 OR
				service_name ILIKE $4
			)
		`
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

	var metrics []*models.Metric
	for rows.Next() {
		m := &models.Metric{}
		err := rows.Scan(
			&m.ID, &m.ProjectID, &m.Name, &m.Description, &m.Unit, &m.Type,
			&m.Value, &m.Timestamp,
			&m.IsMonotonic,
			&m.Bounds, &m.BucketCounts, &m.Count, &m.Sum,
			&m.QuantileValues,
			&m.ServiceName, &m.ServiceVersion,
			&m.Attributes, &m.ResourceAttributes,
			&m.AggregationTemporality,
		)
		if err != nil {
			return nil, nil, err
		}
		metrics = append(metrics, m)
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

	return metrics, pagination, nil
}

// getMetricStats gets time-based statistics for metrics
func getMetricStats(ctx context.Context, pool *pgxpool.Pool, projectID string, options timescale.CommonMetricsQueryOptions) ([]timescale.TimeMetric, error) {
	pgInterval := timescale.ConvertIntervalToPostgresFormat(options.Interval)

	query := `
		SELECT 
			time_bucket(%s, timestamp) AS bucket,
			COUNT(*) AS count
		FROM metrics
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
