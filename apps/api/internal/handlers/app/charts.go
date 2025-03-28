package app

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/timescale"
)

type GetMetricsQuery struct {
	timescale.CommonMetricsQueryOptions
	Filter
}

// Validate implements validation.Validatable
func (q *GetMetricsQuery) Validate() error {
	if err := q.CommonMetricsQueryOptions.Validate(); err != nil {
		return err
	}

	// Process levels before validation
	q.Level = q.Filter.ProcessLevels()

	return q.Filter.Validate()
}

// TimeChartDataPoint represents a single point in the timeline chart
type TimeChartDataPoint struct {
	Timestamp int64          `json:"timestamp"`
	Levels    map[string]int `json:"-"` // Used internally for building the response
}

// MarshalJSON implements a custom JSON marshaler that flattens the levels map
func (t TimeChartDataPoint) MarshalJSON() ([]byte, error) {
	// Create a new map that includes the timestamp and all levels
	result := make(map[string]interface{})
	result["timestamp"] = t.Timestamp

	// Add each level count to the result
	for level, count := range t.Levels {
		result[level] = count
	}

	return json.Marshal(result)
}

// GetTimelineChart returns metrics about app logs over time
func (h *AppLogsHandler) GetTimelineChart(c fiber.Ctx) error {
	projectID := c.Params("id")

	query := new(GetMetricsQuery)
	if err := c.Bind().Query(query); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	query.SetDefaults()

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
	if len(query.Level) > 0 {
		placeholders := make([]string, len(query.Level))
		for i := range query.Level {
			placeholders[i] = fmt.Sprintf("$%d", paramCount)
			baseParams = append(baseParams, query.Level[i])
			paramCount++
		}
		filterClause += fmt.Sprintf(" AND level IN (%s)", strings.Join(placeholders, ", "))
	}

	// Get counts by time and level
	timeLevelSql := fmt.Sprintf(`
		SELECT 
			time_bucket($%d, timestamp) AS bucket,
			level,
			COUNT(*) AS count
		FROM app_logs
	`, paramCount) + baseWhere + filterClause + `
		GROUP BY bucket, level
		ORDER BY bucket ASC, level
	`
	baseParams = append(baseParams, timescale.ConvertIntervalToPostgresFormat(query.Interval))

	timeRows, err := h.pool.Query(c.Context(), timeLevelSql, baseParams...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch time-level metrics",
			"message": err.Error(),
		})
	}
	defer timeRows.Close()

	// Map to store data points by timestamp
	timeChartMap := make(map[int64]*TimeChartDataPoint)

	for timeRows.Next() {
		var bucket time.Time
		var level string
		var count int
		if err := timeRows.Scan(&bucket, &level, &count); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to scan time-level metrics",
				"message": err.Error(),
			})
		}

		timestamp := bucket.UnixMilli()

		// Create a new data point if it doesn't exist
		if _, exists := timeChartMap[timestamp]; !exists {
			timeChartMap[timestamp] = &TimeChartDataPoint{
				Timestamp: timestamp,
				Levels:    make(map[string]int),
			}
		}

		// Add the level count to the data point
		timeChartMap[timestamp].Levels[level] = count
	}

	// Convert the map to a sorted array
	var timelineChart []TimeChartDataPoint
	for _, dataPoint := range timeChartMap {
		timelineChart = append(timelineChart, *dataPoint)
	}

	// Sort by timestamp
	sort.Slice(timelineChart, func(i, j int) bool {
		return timelineChart[i].Timestamp < timelineChart[j].Timestamp
	})

	return c.JSON(timelineChart)
}
