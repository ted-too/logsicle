package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/gofiber/storage/redis/v3"
	"github.com/ted-too/logsicle/internal/config"
	"github.com/ted-too/logsicle/internal/handlers"
	"github.com/ted-too/logsicle/internal/queue"
	"github.com/ted-too/logsicle/internal/server"
	database "github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/timescale"
)

func main() {
	ctx := context.Background()

	// Load configuration
	cfg, err := config.LoadConfig("config.toml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	log.SetLevel(log.LevelDebug)

	// Initialize Fiber app
	app := fiber.New()

	app.Use(recoverer.New())

	// Initialize GORM database (for user management)
	db, err := database.New(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	redisStorage := redis.New(redis.Config{
		URL: cfg.Storage.RedisSessionURL,
	})

	app.Use(session.New(session.Config{
		Storage:        redisStorage,
		KeyLookup:      "cookie:session_id",
		CookieSecure:   !cfg.Dev, // For HTTPS
		CookieHTTPOnly: true,
	}))

	// Initialize TimescaleDB client
	ts, err := timescale.NewTimescaleClient(ctx, cfg.Storage.Dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer ts.Close()

	// Initialize Queue Service
	queueService, err := queue.NewQueueService(cfg.Storage.RedisQueueURL, ts)
	if err != nil {
		log.Fatalf("Failed to initialize queue service: %v", err)
	}
	defer queueService.Close()

	// Create processor with metrics
	processor := queue.NewProcessor(queueService)

	// Create a context with cancellation for graceful shutdown
	processorCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Start processor
	processor.Start(processorCtx)

	// Setup routes
	handlers.SetupRoutes(app, db, ts.Pool, processor, queueService, cfg)

	// Initialize server with graceful shutdown
	s := server.NewServer(app, cfg)

	// Handle graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-quit
		log.Info("Shutting down gracefully...")
		cancel() // Stop processors
		if err := s.Shutdown(); err != nil {
			log.Error("Error during shutdown: %v", err)
		}
	}()

	// Start server
	if err := s.Start(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
