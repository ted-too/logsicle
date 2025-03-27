package auth

import (
	"database/sql"
	"strings"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/ted-too/logsicle/internal/crypto"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
)

// AcceptInvitationRequest represents the request to accept an invitation for an existing user
type AcceptInvitationRequest struct {
	Token string `json:"token"`
}

func (r AcceptInvitationRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Token, validation.Required),
	)
}

// AcceptInvitationWithRegistrationRequest represents the request to accept an invitation with registration
type AcceptInvitationWithRegistrationRequest struct {
	Token    string `json:"token"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

func (r AcceptInvitationWithRegistrationRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Token, validation.Required),
		validation.Field(&r.Name, validation.Required),
		validation.Field(&r.Password, validation.Required, validation.Length(8, 0)),
	)
}

// AcceptInvitation accepts an invitation for an existing authenticated user
func (h *AuthHandler) AcceptInvitation(c fiber.Ctx) error {
	user := c.Locals("user").(*models.User)
	userSession := c.Locals("session").(storage.Session)

	var input AcceptInvitationRequest
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

	// Start a transaction
	tx := h.db.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to start transaction",
			"message": tx.Error.Error(),
		})
	}

	// Find the invitation
	var invitation models.Invitation
	if err := tx.
		Preload("Organization").
		Where("token = ? AND status = ?", input.Token, models.InvitationPending).
		First(&invitation).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "Invitation not found",
			"message": "The invitation token is invalid or has been used",
		})
	}

	// Check if the invitation has expired
	if invitation.ExpiresAt.Before(time.Now()) {
		invitation.Status = models.InvitationExpired
		tx.Save(&invitation)
		tx.Rollback()

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invitation expired",
			"message": "This invitation has expired",
		})
	}

	// Verify that the invitation email matches the authenticated user's email
	if strings.ToLower(invitation.Email) != strings.ToLower(user.Email) {
		tx.Rollback()
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Email mismatch",
			"message": "The invitation was sent to a different email address",
		})
	}

	// Check if the user is already a member of the organization
	var existingMembership models.TeamMembership
	if err := tx.Where("organization_id = ? AND user_id = ?",
		invitation.OrganizationID, user.ID).First(&existingMembership).Error; err == nil {
		tx.Rollback()
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":   "Already a member",
			"message": "You are already a member of this organization",
		})
	}

	// Create team membership for the user
	membership := models.TeamMembership{
		OrganizationID: invitation.OrganizationID,
		UserID:         user.ID,
		Role:           invitation.Role,
		JoinedAt:       time.Now(),
		InvitedByID:    sql.NullString{String: invitation.InvitedByID, Valid: true},
	}

	if err := tx.Create(&membership).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create membership",
			"message": err.Error(),
		})
	}

	// Update invitation status
	invitation.Status = models.InvitationAccepted
	if err := tx.Save(&invitation).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to update invitation",
			"message": err.Error(),
		})
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to commit transaction",
			"message": err.Error(),
		})
	}

	// Update the session with the new active organization if not already set
	if userSession.ActiveOrganization == "" {
		userSession.ActiveOrganization = invitation.OrganizationID
		sess := session.FromContext(c)
		sess.Set(storage.SessionDataKey, userSession)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":      "Successfully joined the organization",
		"organization": invitation.Organization,
	})
}

// AcceptInvitationWithRegistration accepts an invitation for a new user (with registration)
func (h *AuthHandler) AcceptInvitationWithRegistration(c fiber.Ctx) error {
	var input AcceptInvitationWithRegistrationRequest
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

	// Start a transaction
	tx := h.db.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to start transaction",
			"message": tx.Error.Error(),
		})
	}

	// Find the invitation
	var invitation models.Invitation
	if err := tx.
		Preload("Organization").
		Where("token = ? AND status = ?", input.Token, models.InvitationPending).
		First(&invitation).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "Invitation not found",
			"message": "The invitation token is invalid or has been used",
		})
	}

	// Check if the invitation has expired
	if invitation.ExpiresAt.Before(time.Now()) {
		invitation.Status = models.InvitationExpired
		tx.Save(&invitation)
		tx.Rollback()

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invitation expired",
			"message": "This invitation has expired",
		})
	}

	// Check if a user with the invitation email already exists
	var existingUser models.User
	if err := tx.Where("email = ?", invitation.Email).First(&existingUser).Error; err == nil {
		tx.Rollback()
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":   "User already exists",
			"message": "A user with this email already exists. Please log in and accept the invitation.",
		})
	}

	// Hash password using Argon2
	hashedPassword, err := crypto.HashPassword(input.Password, crypto.DefaultParams)
	if err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to hash password",
			"message": err.Error(),
		})
	}

	// Create the new user
	user := models.User{
		Name:          input.Name,
		Email:         invitation.Email,
		EmailVerified: true, // Since they used the invitation link, we can trust the email
		LastLoginAt:   time.Now(),
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create user",
			"message": err.Error(),
		})
	}

	// Create password account
	account := models.Account{
		UserID:     user.ID,
		ProviderID: "password",
		Password:   hashedPassword,
	}

	if err := tx.Create(&account).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create account",
			"message": err.Error(),
		})
	}

	// Create team membership
	membership := models.TeamMembership{
		OrganizationID: invitation.OrganizationID,
		UserID:         user.ID,
		Role:           invitation.Role,
		JoinedAt:       time.Now(),
		InvitedByID:    sql.NullString{String: invitation.InvitedByID, Valid: true},
	}

	if err := tx.Create(&membership).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create membership",
			"message": err.Error(),
		})
	}

	// Update invitation status
	invitation.Status = models.InvitationAccepted
	if err := tx.Save(&invitation).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to update invitation",
			"message": err.Error(),
		})
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to commit transaction",
			"message": err.Error(),
		})
	}

	// Create session for the new user
	sess := session.FromContext(c)
	userSession := &storage.Session{
		UserID:             user.ID,
		IPAddress:          c.IP(),
		UserAgent:          c.Get("User-Agent"),
		ExpiresAt:          time.Now().Add(24 * time.Hour),
		ActiveOrganization: invitation.OrganizationID,
	}
	sess.Set(storage.SessionDataKey, userSession)

	return c.Status(fiber.StatusOK).JSON(UserSession{
		User:    user,
		Session: *userSession,
	})
}
