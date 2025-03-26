package metrics

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/queue"
	"gorm.io/gorm"
)

type MetricsHandler struct {
	db    *gorm.DB
	pool  *pgxpool.Pool
	queue *queue.QueueService
}

func NewMetricsHandler(db *gorm.DB, pool *pgxpool.Pool, qs *queue.QueueService) *MetricsHandler {
	return &MetricsHandler{
		db:    db,
		pool:  pool,
		queue: qs,
	}
}
