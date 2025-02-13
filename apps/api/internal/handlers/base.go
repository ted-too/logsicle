package handlers

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/config"
	"gorm.io/gorm"
)

type BaseHandler struct {
	db     *gorm.DB
	pool   *pgxpool.Pool
	Config *config.Config
}

func NewBaseHandler(db *gorm.DB, pool *pgxpool.Pool, cfg *config.Config) *BaseHandler {
	return &BaseHandler{db: db, pool: pool, Config: cfg}
}
