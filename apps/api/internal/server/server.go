package server

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/config"
)

type Server struct {
	App    *fiber.App
	Config *config.Config
}

func NewServer(app *fiber.App, cfg *config.Config) *Server {
	return &Server{
		App:    app,
		Config: cfg,
	}
}

func (s *Server) Start() error {
	return s.App.Listen(":" + s.Config.Port)
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown() error {
	// You can configure the shutdown timeout in your config if needed
	timeout := 5 * time.Second
	if s.Config.ShutdownTimeout != "" {
		var err error
		timeout, err = time.ParseDuration(s.Config.ShutdownTimeout)
		if err != nil {
			return fmt.Errorf("invalid shutdown timeout: %w", err)
		}
	}

	// Create a context with timeout for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	return s.App.ShutdownWithContext(ctx)
}
