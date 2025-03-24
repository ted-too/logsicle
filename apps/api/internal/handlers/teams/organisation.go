package teams

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/gosimple/slug"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
)

func (h *TeamsHandler) ListOrganizationMembers(c fiber.Ctx) error {
	userSession := c.Locals("session").(storage.Session)

	var members []models.TeamMembership
	if err := h.db.
		Preload("User").
		Where("organization_id = ?", userSession.ActiveOrganization).
		Find(&members).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to load organization members",
			"message": err.Error(),
		})
	}

	return c.JSON(members)
}

// ListUserOrganizationMemberships returns all organizations that the user is a member of
func (h *TeamsHandler) ListUserOrganizationMemberships(c fiber.Ctx) error {
	userSession := c.Locals("session").(storage.Session)

	var memberships []models.TeamMembership
	if err := h.db.
		Preload("Organization").
		Where("user_id = ?", userSession.UserID).
		Find(&memberships).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to load organizations",
			"message": err.Error(),
		})
	}

	return c.JSON(memberships)
}

type CreateOrganizationRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (r CreateOrganizationRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Name, validation.Required, validation.Length(1, 100)),
		validation.Field(&r.Description, validation.Length(0, 500)),
	)
}

// CreateOrganization creates a new organization and sets it as active in the session
func (h *TeamsHandler) CreateOrganization(c fiber.Ctx) error {
	session := c.Locals("session").(storage.Session)

	var input CreateOrganizationRequest
	if err := c.Bind().Body(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
	}

	if err := input.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": err.Error(),
		})
	}

	// Create the organization
	organization := models.Organization{
		Name:        input.Name,
		Slug:        slug.Make(input.Name),
		Description: input.Description,
		CreatedBy:   session.UserID,
	}

	// Start a transaction
	tx := h.db.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to start transaction",
		})
	}

	// Create the organization
	if err := tx.Create(&organization).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create organization",
		})
	}

	// Create team membership for the creator as admin
	membership := models.TeamMembership{
		OrganizationID: organization.ID,
		UserID:         session.UserID,
		Role:           models.RoleAdmin,
		JoinedAt:       time.Now(),
	}

	if err := tx.Create(&membership).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create team membership",
		})
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to commit transaction",
		})
	}

	// Update the session with the new active organization
	session.ActiveOrganization = organization.ID
	if err := h.db.Save(session).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update session",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(organization)
}

// DeleteOrganization deletes an organization and all its associated data
func (h *TeamsHandler) DeleteOrganization(c fiber.Ctx) error {
	userSession := c.Locals("session").(storage.Session)
	orgID := c.Params("id")

	// Start a transaction
	tx := h.db.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to start transaction",
			"message": "Could not start database transaction",
		})
	}

	// Delete team memberships
	if err := tx.Where("organization_id = ?", orgID).Delete(&models.TeamMembership{}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to delete team memberships",
			"message": err.Error(),
		})
	}

	// Delete projects associated with the organization
	if err := tx.Where("organization_id = ?", orgID).Delete(&models.Project{}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to delete projects",
			"message": err.Error(),
		})
	}

	// Delete the organization
	result := tx.Where("id = ?", orgID).Delete(&models.Organization{})
	if result.Error != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to delete organization",
			"message": result.Error.Error(),
		})
	}

	if result.RowsAffected == 0 {
		tx.Rollback()
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "Organization not found",
			"message": "The specified organization does not exist",
		})
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to commit transaction",
			"message": err.Error(),
		})
	}

	// If this was the active organization, clear it and try to set another one
	if userSession.ActiveOrganization == orgID {
		// Find another organization for this user
		var membership models.TeamMembership
		if err := h.db.Where("user_id = ? AND organization_id != ?", userSession.UserID, orgID).First(&membership).Error; err != nil {
			// No other org found, just clear active org
			userSession.ActiveOrganization = ""
		} else {
			// Set the found org as active
			userSession.ActiveOrganization = membership.OrganizationID
		}

		sess := session.FromContext(c)
		sess.Set(storage.SessionDataKey, userSession)
	}

	return c.SendStatus(fiber.StatusNoContent)
}
