package traces

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/queue"
	"gorm.io/gorm"
)

type TracesHandler struct {
	db    *gorm.DB
	pool  *pgxpool.Pool
	queue *queue.QueueService
}

func NewTracesHandler(db *gorm.DB, pool *pgxpool.Pool, qs *queue.QueueService) *TracesHandler {
	return &TracesHandler{
		db:    db,
		pool:  pool,
		queue: qs,
	}
}
