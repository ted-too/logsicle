package handlers

import (
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ted-too/logsicle/internal/config"
	appHandler "github.com/ted-too/logsicle/internal/handlers/app"
	authHandler "github.com/ted-too/logsicle/internal/handlers/auth"
	"github.com/ted-too/logsicle/internal/handlers/events"
	metricsHandler "github.com/ted-too/logsicle/internal/handlers/metrics"
	requestsHandler "github.com/ted-too/logsicle/internal/handlers/requests"
	"github.com/ted-too/logsicle/internal/handlers/teams"
	tracesHandler "github.com/ted-too/logsicle/internal/handlers/traces"
	"github.com/ted-too/logsicle/internal/middleware"
	"github.com/ted-too/logsicle/internal/queue"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, db *gorm.DB, pool *pgxpool.Pool, processor *queue.Processor, queueService *queue.QueueService, cfg *config.Config) {
	authHandler := authHandler.NewAuthHandler(db)
	teamsHandler := teams.NewTeamsHandler(db)
	eventsHandler := events.NewEventsHandler(db, pool, queueService)
	appHandler := appHandler.NewAppLogsHandler(db, pool, queueService)
	requestsHandler := requestsHandler.NewRequestLogsHandler(db, pool, queueService)
	metricsHandler := metricsHandler.NewMetricsHandler(db, pool, queueService)
	tracesHandler := tracesHandler.NewTracesHandler(db, pool, queueService)

	// Health check endpoint
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Ingest routes
	v1Ingest := app.Group("/v1/ingest", middleware.APIAuth(db))
	{
		v1Ingest.Post("/event", eventsHandler.IngestEvent)
		v1Ingest.Post("/app", appHandler.IngestLog)
		v1Ingest.Post("/request", requestsHandler.IngestRequestLog)
		v1Ingest.Post("/metric", metricsHandler.IngestMetric)
		v1Ingest.Post("/trace", tracesHandler.IngestTrace)
	}

	// FIXME: Make super authd middleware
	v1SuperAuthd := app.Group("/v1")
	{
		internalMetricsHandler := NewMetricsHandler(processor)
		v1SuperAuthd.Get("/metrics/queue", internalMetricsHandler.GetQueueMetrics)
	}

	log.Printf("[DEBUG] Allowed origins: %s", cfg.GetAllowedOrigins())

	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.GetAllowedOrigins(),
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: true,
	}))

	// Auth routes
	v1 := app.Group("/v1")
	{
		auth := v1.Group("/auth")
		auth.Post("/sign-up", authHandler.Register)
		auth.Post("/sign-in", authHandler.Login)
		auth.Post("/sign-out", authHandler.Logout)
	}

	// Protected routes
	v1Authd := v1.Group("", middleware.AuthMiddleware(db))
	{
		// User routes
		v1Authd.Get("/me", authHandler.Me)
		v1Authd.Patch("/me", authHandler.UpdateUser)

		// Organization routes
		v1Authd.Post("/organizations", teamsHandler.CreateOrganization)
		v1Authd.Get("/organizations", teamsHandler.ListUserOrganizationMemberships)
		v1Authd.Get("/organizations/members", teamsHandler.ListOrganizationMembers)
		v1Authd.Delete("/organizations/:id", teamsHandler.DeleteOrganization, middleware.RequireRole(models.RoleAdmin, models.RoleOwner))
		v1Authd.Post("/organizations/:id/activate", authHandler.SetActiveOrganization)

		// Project routes (requires active organization)
		projects := v1Authd.Group("/projects", middleware.RequireActiveOrganization(db))
		{
			projectsManagement := projects.Group("", middleware.RequireRole(models.RoleAdmin, models.RoleOwner))
			projectsManagement.Post("", teamsHandler.CreateProject)
			projects.Get("", teamsHandler.ListProjects)
			projects.Get("/:id", teamsHandler.GetProject)
			projectsManagement.Patch("/:id", teamsHandler.UpdateProject)
			projectsManagement.Delete("/:id", teamsHandler.DeleteProject)

			// API Key routes
			projectsManagement.Post("/:id/api-keys", authHandler.CreateAPIKey)
			projectsManagement.Get("/:id/api-keys", authHandler.ListAPIKeys)
			projectsManagement.Delete("/:id/api-keys/:keyId", authHandler.DeleteAPIKey)

			// Events routes
			projects.Get("/:id/events", eventsHandler.GetEventLogs)
			projects.Delete("/:id/events/:eventId", eventsHandler.DeleteEvent, middleware.RequireRole(models.RoleAdmin, models.RoleOwner))
			projects.Get("/:id/events/stream", eventsHandler.StreamEvents)
			projects.Get("/:id/events/metrics", eventsHandler.GetMetrics)
			projects.Get("/:id/events/channels", eventsHandler.GetEventChannels)
			projects.Get("/:id/events/channels/:channelId", eventsHandler.GetEventChannel)
			projectsManagement.Post("/:id/events/channels", eventsHandler.CreateChannel)
			projectsManagement.Patch("/:id/events/channels/:channelId", eventsHandler.UpdateChannel)
			projectsManagement.Delete("/:id/events/channels/:channelId", eventsHandler.DeleteChannel)

			// App logs routes
			projects.Get("/:id/app", appHandler.GetAppLogs)
			projects.Delete("/:id/app/:logId", appHandler.DeleteAppLog, middleware.RequireRole(models.RoleAdmin, models.RoleOwner))
			projects.Get("/:id/app/metrics", appHandler.GetMetrics)

			// Request logs routes
			projects.Get("/:id/request", requestsHandler.GetRequestLogs)
			projects.Delete("/:id/request/:logId", requestsHandler.DeleteRequestLog, middleware.RequireRole(models.RoleAdmin, models.RoleOwner))
			projects.Get("/:id/request/metrics", requestsHandler.GetMetrics)
			projects.Get("/:id/request/stream", requestsHandler.StreamLogs)

			// Metrics routes
			projects.Get("/:id/metrics", metricsHandler.GetMetrics)
			projects.Get("/:id/metrics/stats", metricsHandler.GetMetricStats)

			// Traces routes
			projects.Get("/:id/traces", tracesHandler.GetTraces)
			projects.Get("/:id/traces/stats", tracesHandler.GetTraceStats)
			projects.Get("/:id/traces/:traceId", tracesHandler.GetTraceTimeline)
		}
	}

	// 404 handler
	app.Use(func(c fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Not found",
		})
	})
}
