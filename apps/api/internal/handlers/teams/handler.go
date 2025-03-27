package teams

import (
	"gorm.io/gorm"
)

type TeamsHandler struct {
	db *gorm.DB
}

func NewTeamsHandler(db *gorm.DB) *TeamsHandler {
	return &TeamsHandler{
		db: db,
	}
}
