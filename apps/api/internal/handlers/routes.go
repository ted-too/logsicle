package handlers

import (
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/config"
	"github.com/ted-too/logsicle/internal/middleware"
	"github.com/ted-too/logsicle/internal/queue"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, db *gorm.DB, pool *pgxpool.Pool, processor *queue.Processor, queueService *queue.QueueService, cfg *config.Config) {
	// Health check endpoint
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	ingestHandler := NewIngestHandler(queueService)
	v1Ingest := app.Group("/v1/ingest")
	v1Ingest.Use(middleware.APIAuth(db))
	{
		v1Ingest.Post("/event", ingestHandler.IngestEventLog)
		v1Ingest.Post("/app", ingestHandler.IngestAppLog)
		v1Ingest.Post("/request", ingestHandler.IngestRequestLog)
		v1Ingest.Post("/trace", ingestHandler.IngestTrace)
	}

	v1SuperAuthd := app.Group("/v1")
	// TODO: Make super authd middleware
	{
		metricsHandler := NewMetricsHandler(processor)
		v1SuperAuthd.Get("/metrics/queue", metricsHandler.GetQueueMetrics)
	}

	baseHandler := NewBaseHandler(db, pool, cfg)

	log.Printf("[DEBUG] Allowed origins: %s", cfg.GetAllowedOrigins())

	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.GetAllowedOrigins(),
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: true,
	}))

	v1 := app.Group("/v1")
	{
		v1.Get("/auth/sign-in", baseHandler.signIn)
		v1.Get("/auth/sign-out", baseHandler.signOut)
		v1.Get("/auth/callback", baseHandler.callback)
		if cfg.Dev {
			v1.Get("/auth/token-claims", baseHandler.tokenClaims)
		}
	}

	v1Authd := app.Group("/v1")
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

		// Event Channels routes
		channelsHandler := NewChannelsHandler(db)
		v1Authd.Get("/projects/:projectId/events/channels", channelsHandler.GetEventChannels)
		v1Authd.Get("/projects/:projectId/events/channels/:channelId", channelsHandler.GetEventChannel)
		v1Authd.Post("/projects/:projectId/events/channels", channelsHandler.CreateChannel)
		v1Authd.Patch("/projects/:projectId/events/channels/:id", channelsHandler.UpdateChannel)
		v1Authd.Delete("/projects/:projectId/events/channels/:id", channelsHandler.DeleteChannel)

		// Generic read endpoints
		readHandler := NewReadHandler(db, pool)
		v1Authd.Delete("/projects/:projectId/:type/:id", readHandler.DeleteLog)

		v1Authd.Get("/projects/:projectId/events", readHandler.GetEventLogs)
		v1Authd.Get("/projects/:projectId/events/metrics", readHandler.GetEventMetrics)

		v1Authd.Get("/projects/:projectId/app", readHandler.GetAppLogs)
		v1Authd.Get("/projects/:projectId/app/metrics", readHandler.GetAppLogMetrics)
		// v1Authd.Get("/projects/:projectId/app/metrics", readHandler.Get)
	}

	app.Use(func(c fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Not found",
		})
	})
}
