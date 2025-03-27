package teams

import (
	"log"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

// ProjectInput represents the input for creating or updating a project
type ProjectInput struct {
	Name             string   `json:"name"`
	LogRetentionDays int      `json:"log_retention_days"`
	AllowedOrigins   []string `json:"allowed_origins"`
}

func (p ProjectInput) Validate() error {
	return validation.ValidateStruct(&p,
		validation.Field(&p.Name, validation.Required, validation.Length(1, 255)),
		validation.Field(&p.LogRetentionDays, validation.Min(1), validation.Max(90)),
		validation.Field(&p.AllowedOrigins, validation.Each(validation.Length(1, 255))),
	)
}

// ListProjects returns all projects in the active organization
func (h *TeamsHandler) ListProjects(c fiber.Ctx) error {
	// Active organization is already verified by middleware
	session := c.Locals("session").(storage.Session)
	orgID := session.ActiveOrganization

	var projects []models.Project
	if err := h.db.Preload("APIKeys").Where("organization_id = ?", orgID).Find(&projects).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch projects",
		})
	}

	return c.JSON(projects)
}

// CreateProject creates a new project in the active organization
func (h *TeamsHandler) CreateProject(c fiber.Ctx) error {
	// Active organization is already verified by middleware
	session := c.Locals("session").(storage.Session)
	orgID := session.ActiveOrganization

	log.Printf("Creating project for org %s", orgID)

	var input ProjectInput
	if err := c.Bind().Body(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := input.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": err.Error(),
		})
	}

	project := models.Project{
		Name:             input.Name,
		OrganizationID:   orgID,
		LogRetentionDays: input.LogRetentionDays,
		AllowedOrigins:   input.AllowedOrigins,
		CreatedByID:      session.UserID,
	}

	if err := h.db.Create(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create project",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(project)
}

// GetProject returns a specific project
func (h *TeamsHandler) GetProject(c fiber.Ctx) error {
	// Active organization is already verified by middleware
	session := c.Locals("session").(storage.Session)
	orgID := session.ActiveOrganization
	projectID := c.Params("id")

	var project models.Project
	if err := h.db.Where("id = ? AND organization_id = ?", projectID, orgID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Project not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch project",
		})
	}

	return c.JSON(project)
}

// UpdateProject updates a project
func (h *TeamsHandler) UpdateProject(c fiber.Ctx) error {
	// Active organization is already verified by middleware
	session := c.Locals("session").(storage.Session)
	orgID := session.ActiveOrganization
	projectID := c.Params("id")

	var input ProjectInput
	if err := c.Bind().Body(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := input.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": err.Error(),
		})
	}

	var project models.Project
	if err := h.db.Where("id = ? AND organization_id = ?", projectID, orgID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Project not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch project",
		})
	}

	project.Name = input.Name

	if err := h.db.Save(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update project",
		})
	}

	return c.JSON(project)
}

// DeleteProject deletes a project
func (h *TeamsHandler) DeleteProject(c fiber.Ctx) error {
	// Active organization is already verified by middleware
	session := c.Locals("session").(storage.Session)
	orgID := session.ActiveOrganization
	projectID := c.Params("id")

	result := h.db.Where("id = ? AND organization_id = ?", projectID, orgID).Delete(&models.Project{})
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete project",
		})
	}

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Project not found",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
