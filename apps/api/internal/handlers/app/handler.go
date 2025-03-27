package app

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/queue"
	"gorm.io/gorm"
)

type AppLogsHandler struct {
	db    *gorm.DB
	pool  *pgxpool.Pool
	queue *queue.QueueService
}

func NewAppLogsHandler(db *gorm.DB, pool *pgxpool.Pool, queue *queue.QueueService) *AppLogsHandler {
	return &AppLogsHandler{
		db:    db,
		pool:  pool,
		queue: queue,
	}
}
