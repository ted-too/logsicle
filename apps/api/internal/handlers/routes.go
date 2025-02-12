package handlers

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/config"
	"github.com/ted-too/logsicle/internal/middleware"
	"github.com/ted-too/logsicle/internal/queue"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, db *gorm.DB, pool *pgxpool.Pool, queueService *queue.QueueService, cfg *config.Config) {
	// Health check endpoint
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	ingestHandler := NewIngestHandler(queueService)
	v1Ingest := app.Group("/api/v1/ingest")
	v1Ingest.Use(middleware.APIAuth(db))
	{
		v1Ingest.Post("/event", ingestHandler.IngestEventLog)
		v1Ingest.Post("/app", ingestHandler.IngestAppLog)
		v1Ingest.Post("/request", ingestHandler.IngestRequestLog)
		v1Ingest.Post("/trace", ingestHandler.IngestTrace)
	}

	baseHandler := NewBaseHandler(db, cfg)

	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.Cors.AllowedOrigins,
		AllowHeaders: []string{"Origin", "Content-Type", "Accept"},
	}))

	v1 := app.Group("/api/v1")
	{
		v1.Get("/auth/sign-in", baseHandler.signIn)
		v1.Get("/auth/sign-out", baseHandler.signOut)
		v1.Get("/auth/callback", baseHandler.callback)
		if cfg.Dev {
			v1.Get("/auth/token-claims", baseHandler.tokenClaims)
		}
	}

	v1Authd := app.Group("/api/v1")
	v1Authd.Use(middleware.AuthMiddleware(cfg, db))
	{
		v1Authd.Get("/me", baseHandler.getUserHandler)
		v1Authd.Patch("/me", baseHandler.updateUserHandler)

		// Project routes
		v1Authd.Post("/projects", baseHandler.createProject)
		v1Authd.Get("/projects", baseHandler.listProjects)
		v1Authd.Patch("/projects/:id", baseHandler.updateProject)
		v1Authd.Get("/projects/:id", baseHandler.getProject)
		v1Authd.Delete("/projects/:id", baseHandler.deleteProject)

		// API Key routes
		v1Authd.Post("/projects/:id/api-keys", baseHandler.createAPIKey)
		v1Authd.Get("/projects/:id/api-keys", baseHandler.listAPIKeys)
		v1Authd.Delete("/projects/:id/api-keys/:keyId", baseHandler.deleteAPIKey)

	}

	{
		// Stream updates endpoint
		streamHandler := NewStreamHandler(queueService.Redis, db)
		v1.Get("/stream/:projectId", streamHandler.StreamLogs)

		// Channels routes
		channelsHandler := NewChannelsHandler(db)
		v1Authd.Post("/projects/:projectId/channels/:type", channelsHandler.CreateChannel)
		v1Authd.Patch("/projects/:projectId/channels/:type/:id", channelsHandler.UpdateChannel)
		v1Authd.Delete("/projects/:projectId/channels/:type/:id", channelsHandler.DeleteChannel)
		v1Authd.Get("/projects/:projectId/channels/events", channelsHandler.GetEventChannels)
		v1Authd.Get("/projects/:projectId/channels/events/:channelId", channelsHandler.GetEventChannel)

		// Generic read endpoints
		readHandler := NewReadHandler(db, pool)
		v1Authd.Delete("/projects/:projectId/resource/:type/:id", readHandler.DeleteLog)

		v1Authd.Get("/projects/:projectId/events", readHandler.GetEventLogs)
		v1Authd.Get("/projects/:projectId/events/metrics", readHandler.GetEventMetrics)

		v1Authd.Get("/projects/:projectId/app", readHandler.GetAppLogs)
		// v1Authd.Get("/projects/:projectId/app/metrics", readHandler.Get)
	}

	app.Use(func(c fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Not found",
		})
	})
}
