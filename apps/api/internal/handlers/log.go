package handlers

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage/models"
)

func (g *BaseHandler) validateAPIKey(c fiber.Ctx) (*models.ApiKey, error) {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return nil, fmt.Errorf("no authorization header")
	}

	// Extract token from Bearer header
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return nil, fmt.Errorf("invalid authorization header format")
	}
	token := parts[1]

	// Validate API key against database
	var apiKey models.ApiKey
	if err := g.DB.WithContext(c.Context()).Model(models.ApiKey{}).Where(models.ApiKey{Key: token}).First(&apiKey).Error; err != nil {
		return nil, fmt.Errorf("invalid API key")
	}

	return &apiKey, nil
}
