package handlers

import (
	"github.com/ted-too/logsicle/internal/config"
	"gorm.io/gorm"
)

type BaseHandler struct {
	DB     *gorm.DB
	Config *config.Config
}

func NewBaseHandler(db *gorm.DB, cfg *config.Config) *BaseHandler {
	return &BaseHandler{DB: db, Config: cfg}
}
