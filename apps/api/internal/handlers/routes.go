package handlers

import (
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/config"
	"github.com/ted-too/logsicle/internal/middleware"
	"github.com/ted-too/logsicle/internal/queue"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, db *gorm.DB, queueService *queue.QueueService, cfg *config.Config) {
	// Health check endpoint
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	baseHandler := NewBaseHandler(db, cfg)

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

	ingestHandler := NewIngestHandler(queueService)
	v1Ingest := app.Group("/api/v1/ingest")
	v1Ingest.Use(middleware.APIAuth(db))
	{
		v1Ingest.Post("/event", ingestHandler.IngestEventLog)
		v1Ingest.Post("/app", ingestHandler.IngestAppLog)
		v1Ingest.Post("/request", ingestHandler.IngestRequestLog)
		v1Ingest.Post("/metric", ingestHandler.IngestMetric)
	}

	app.Use(func(c fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Not found",
		})
	})
}
