package teams

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/go-ozzo/ozzo-validation/v4/is"
	"github.com/gofiber/fiber/v3"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
)

// CreateInvitationRequest represents the request body for creating an invitation
type CreateInvitationRequest struct {
	Email string      `json:"email"`
	Role  models.Role `json:"role"`
}

func (r CreateInvitationRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Email, validation.Required, is.Email),
		validation.Field(&r.Role, validation.Required, validation.In(
			models.RoleAdmin,
			models.RoleMember,
		)),
	)
}

// CreateInvitation creates a new invitation for a user to join an organization
func (h *TeamsHandler) CreateInvitation(c fiber.Ctx) error {
	userSession := c.Locals("session").(storage.Session)

	// Check if active organization is set
	if userSession.ActiveOrganization == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "No active organization",
			"message": "You must have an active organization to create an invitation",
		})
	}

	var organization models.Organization
	if err := h.db.First(&organization, "id = ?", userSession.ActiveOrganization).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to load organization",
			"message": err.Error(),
		})
	}

	var input CreateInvitationRequest
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

	// Check if the user is already a member of the organization
	var existingMembership models.TeamMembership
	err := h.db.Where("organization_id = ? AND user_id IN (SELECT id FROM users WHERE email = ?)",
		userSession.ActiveOrganization, input.Email).First(&existingMembership).Error
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":   "User is already a member",
			"message": "This user is already a member of the organization",
		})
	}

	// Check if there's a pending invitation for this email
	var existingInvitation models.Invitation
	err = h.db.Where("organization_id = ? AND email = ? AND status = ?",
		userSession.ActiveOrganization, input.Email, models.InvitationPending).First(&existingInvitation).Error
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":   "Invitation already exists",
			"message": "There is already a pending invitation for this email",
		})
	}

	// Create the invitation
	invitation := models.Invitation{
		Email:          input.Email,
		OrganizationID: userSession.ActiveOrganization,
		Role:           input.Role,
		Status:         models.InvitationPending,
		ExpiresAt:      time.Now().Add(7 * 24 * time.Hour), // 7 days
		InvitedByID:    userSession.UserID,
	}

	if err := h.db.Create(&invitation).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create invitation",
			"message": err.Error(),
		})
	}

	// TODO: Send invitation email with the token link

	return c.Status(fiber.StatusCreated).JSON(invitation)
}

// ListInvitations lists all invitations for the current organization
func (h *TeamsHandler) ListInvitations(c fiber.Ctx) error {
	userSession := c.Locals("session").(storage.Session)

	// Check if active organization is set
	if userSession.ActiveOrganization == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "No active organization",
			"message": "You must have an active organization to list invitations",
		})
	}

	var invitations []models.Invitation
	if err := h.db.
		Preload("InvitedBy").
		Preload("Organization").
		Where("organization_id = ?", userSession.ActiveOrganization).
		Find(&invitations).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to load invitations",
			"message": err.Error(),
		})
	}

	return c.JSON(invitations)
}

// ResendInvitation resends an invitation email
func (h *TeamsHandler) ResendInvitation(c fiber.Ctx) error {
	userSession := c.Locals("session").(storage.Session)
	invitationID := c.Params("id")

	// Find the invitation
	var invitation models.Invitation
	if err := h.db.
		Where("id = ? AND organization_id = ?", invitationID, userSession.ActiveOrganization).
		First(&invitation).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "Invitation not found",
			"message": "The specified invitation does not exist",
		})
	}

	// Check if the invitation is still pending
	if invitation.Status != models.InvitationPending {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid invitation status",
			"message": "Only pending invitations can be resent",
		})
	}

	// Check if the invitation has expired and update if needed
	if invitation.ExpiresAt.Before(time.Now()) {
		invitation.ExpiresAt = time.Now().Add(7 * 24 * time.Hour) // 7 days
		if err := h.db.Save(&invitation).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to update invitation",
				"message": err.Error(),
			})
		}
	}

	// TODO: Send invitation email with the token link

	return c.JSON(invitation)
}

// CancelInvitation cancels a pending invitation
func (h *TeamsHandler) CancelInvitation(c fiber.Ctx) error {
	userSession := c.Locals("session").(storage.Session)
	invitationID := c.Params("id")

	// Find the invitation
	var invitation models.Invitation
	if err := h.db.
		Where("id = ? AND organization_id = ?", invitationID, userSession.ActiveOrganization).
		First(&invitation).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "Invitation not found",
			"message": "The specified invitation does not exist",
		})
	}

	// Delete the invitation
	if err := h.db.Delete(&invitation).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to delete invitation",
			"message": err.Error(),
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ValidateInvitation checks if an invitation token is valid and returns invitation details
func (h *TeamsHandler) ValidateInvitation(c fiber.Ctx) error {
	token := c.Params("token")

	// Find the invitation by token
	var invitation models.Invitation
	if err := h.db.
		Preload("Organization").
		Preload("InvitedBy").
		Where("token = ?", token).
		First(&invitation).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "Invalid invitation",
			"message": "The invitation token is invalid or has been used",
		})
	}

	// Check if the invitation has expired
	if invitation.ExpiresAt.Before(time.Now()) {
		invitation.Status = models.InvitationExpired
		h.db.Save(&invitation) // Non-critical error, just try to update status

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invitation expired",
			"message": "This invitation has expired",
		})
	}

	// Check if the invitation has already been accepted or rejected
	if invitation.Status != models.InvitationPending {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid invitation status",
			"message": "This invitation has already been " + string(invitation.Status),
		})
	}

	return c.JSON(invitation)
}
