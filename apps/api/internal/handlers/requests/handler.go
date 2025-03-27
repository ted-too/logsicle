package requests

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/queue"
	"gorm.io/gorm"
)

type RequestLogsHandler struct {
	db    *gorm.DB
	pool  *pgxpool.Pool
	queue *queue.QueueService
}

func NewRequestLogsHandler(db *gorm.DB, pool *pgxpool.Pool, queue *queue.QueueService) *RequestLogsHandler {
	return &RequestLogsHandler{
		db:    db,
		pool:  pool,
		queue: queue,
	}
}
