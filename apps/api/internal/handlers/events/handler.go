package events

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/queue"
	"gorm.io/gorm"
)

type EventsHandler struct {
	db   *gorm.DB
	pool *pgxpool.Pool
	qs   *queue.QueueService
}

func NewEventsHandler(db *gorm.DB, pool *pgxpool.Pool, qs *queue.QueueService) *EventsHandler {
	return &EventsHandler{
		db:   db,
		pool: pool,
		qs:   qs,
	}
}
