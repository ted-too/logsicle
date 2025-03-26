package auth

import (
	"log"
	"strings"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/go-ozzo/ozzo-validation/v4/is"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/crypto"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (r RegisterRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Name, validation.Required),
		validation.Field(&r.Email, validation.Required, is.Email),
		validation.Field(&r.Password, validation.Required, validation.Length(8, 0)),
	)
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (r LoginRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Email, validation.Required, is.Email),
		validation.Field(&r.Password, validation.Required),
	)
}

// Register handles user registration
func (h *AuthHandler) Register(c fiber.Ctx) error {
	var req RegisterRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
	}

	if err := req.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": err.Error(),
		})
	}

	req.Email = strings.ToLower(req.Email)

	// Check if user exists
	var existingUser models.User
	if err := h.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":   "Email already registered",
			"message": "A user with this email already exists",
		})
	}

	// Hash password using Argon2
	hashedPassword, err := crypto.HashPassword(req.Password, crypto.DefaultParams)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to hash password",
			"message": err.Error(),
		})
	}

	userID, err := typeid.New[models.UserID]()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to generate user ID",
			"message": err.Error(),
		})
	}

	user := models.User{
		BaseModel:   storage.BaseModel{ID: userID.String()},
		Name:        req.Name,
		Email:       req.Email,
		LastLoginAt: time.Now(),
	}

	// Create user and account in transaction
	err = h.db.Transaction(func(tx *gorm.DB) error {

		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		account := models.Account{
			ProviderID: "password",
			Password:   hashedPassword,
		}

		account.UserID = user.BaseModel.ID
		if err := tx.Create(&account).Error; err != nil {
			return err
		}

		defaultOrg := models.Organization{
			Name:        user.Name + "'s Organization",
			Description: "Default organization",
			CreatedByID: user.ID,
		}

		if err := tx.Create(&defaultOrg).Error; err != nil {
			return err
		}

		membership := models.TeamMembership{
			OrganizationID: defaultOrg.ID,
			UserID:         user.ID,
			Role:           models.RoleOwner,
			JoinedAt:       time.Now(),
		}

		if err := tx.Create(&membership).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create user",
			"message": err.Error(),
		})
	}

	if err := h.db.Preload("Organizations").First(&user, "id = ?", user.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch created user",
			"message": err.Error(),
		})
	}

	sess := session.FromContext(c)

	// Create session for the newly registered user
	userSession := &storage.Session{
		UserID:             user.ID,
		IPAddress:          c.IP(),
		UserAgent:          c.Get("User-Agent"),
		ExpiresAt:          time.Now().Add(24 * time.Hour),
		ActiveOrganization: user.Organizations[0].ID,
	}

	sess.Set(storage.SessionDataKey, userSession)

	return c.Status(fiber.StatusCreated).JSON(user)
}

// Login handles user login
func (h *AuthHandler) Login(c fiber.Ctx) error {
	var req LoginRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
	}

	if err := req.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": err.Error(),
		})
	}

	req.Email = strings.ToLower(req.Email)

	// Find user
	var user models.User
	if err := h.db.Preload("Organizations").Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid credentials",
			"message": "Email or password is incorrect",
		})
	}

	// Find password account
	var account models.Account
	if err := h.db.Where("user_id = ? AND provider_id = ?", user.ID, "password").First(&account).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid credentials",
			"message": "Email or password is incorrect",
		})
	}

	// Verify password using Argon2
	match, err := crypto.VerifyPassword(req.Password, account.Password)
	if err != nil || !match {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Invalid credentials",
			"message": "Email or password is incorrect",
		})
	}

	sess := session.FromContext(c)

	// Create session
	userSession := &storage.Session{
		UserID:             user.ID,
		IPAddress:          c.IP(),
		UserAgent:          c.Get("User-Agent"),
		ExpiresAt:          time.Now().Add(24 * time.Hour),
		ActiveOrganization: user.Organizations[0].ID,
	}

	sess.Set(storage.SessionDataKey, userSession)

	if err := h.db.Model(&models.User{}).Where("id = ?", user.ID).Update("last_login_at", time.Now()).Error; err != nil {
		// Non-critical error, just log it
		log.Printf("Failed to update last login time: %v", err)
	}

	// Preload organizations and their projects
	var organizations []models.Organization
	if err := h.db.
		Joins("JOIN team_memberships ON team_memberships.organization_id = organizations.id").
		Where("team_memberships.user_id = ?", user.ID).
		Preload("Projects").
		Find(&organizations).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to load organizations",
			"message": err.Error(),
		})
	}

	user.Organizations = organizations

	return c.JSON(user)
}

// Logout handles user logout
func (h *AuthHandler) Logout(c fiber.Ctx) error {
	sess := session.FromContext(c)
	sess.Delete(storage.SessionDataKey)
	return c.SendStatus(fiber.StatusOK)
}

// Me returns the current user
func (h *AuthHandler) Me(c fiber.Ctx) error {
	user := c.Locals("user").(*models.User)

	return c.JSON(user)
}

// SetActiveOrganization sets the active organization for the current session
func (h *AuthHandler) SetActiveOrganization(c fiber.Ctx) error {
	orgID := c.Params("id")
	if orgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Organization ID is required",
			"message": "The organization ID parameter is missing",
		})
	}

	sess := session.FromContext(c)

	userSession, ok := sess.Get(storage.SessionDataKey).(storage.Session)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Not authenticated",
			"message": "No active session found",
		})
	}

	// Verify user belongs to organization
	var membership models.TeamMembership
	if err := h.db.Where("user_id = ? AND organization_id = ?", userSession.UserID, orgID).First(&membership).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":   "Not a member of this organization",
			"message": err.Error(),
		})
	}

	// Update session
	userSession.ActiveOrganization = orgID
	sess.Set(storage.SessionDataKey, userSession)

	return c.SendStatus(fiber.StatusOK)
}
