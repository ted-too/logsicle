package handlers

import (
	"context"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/logto-io/go/client"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/integrations/logto"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

func (g *BaseHandler) signIn(c fiber.Ctx) error {
	session := session.FromContext(c)
	logto := logto.NewClient(g.Config, session)

	signInUri, err := logto.SignIn(g.Config.Auth.RedirectURL)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get sign-in URI",
		})
	}

	return c.Redirect().Status(fiber.StatusTemporaryRedirect).To(signInUri)
}

func (g *BaseHandler) callback(c fiber.Ctx) error {
	session := session.FromContext(c)
	logto := logto.NewClient(g.Config, session)

	// Convert fiber request to http.Request
	req := &http.Request{
		TLS:        c.RequestCtx().TLSConnectionState(),
		Method:     string(c.Method()),
		Host:       string(c.RequestCtx().Host()),
		RequestURI: c.OriginalURL(),
		Header:     make(http.Header),
	}
	// Copy headers
	c.Request().Header.VisitAll(func(key, value []byte) {
		req.Header.Set(string(key), string(value))
	})

	err := logto.HandleSignInCallback(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to handle callback",
			"error":   err.Error(),
		})
	}

	// Sync user details
	go func() {
		_, err := syncUser(context.Background(), logto, g.DB)
		if err != nil {
			log.Printf("Failed to sync user: %v", err)
		}
	}()

	frontendURL, err := url.Parse(g.Config.Auth.FrontendURL)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Invalid frontend URL",
			"error":   err.Error(),
		})
	}

	return c.Redirect().Status(fiber.StatusTemporaryRedirect).To(frontendURL.JoinPath("/dashboard").String())
}

func (g *BaseHandler) signOut(c fiber.Ctx) error {
	session := session.FromContext(c)
	logto := logto.NewClient(g.Config, session)

	signOutUri, err := logto.SignOut(g.Config.Auth.FrontendURL)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to sign out",
			"error":   err.Error(),
		})
	}

	return c.Redirect().Status(fiber.StatusTemporaryRedirect).To(signOutUri)
}

func (g *BaseHandler) tokenClaims(c fiber.Ctx) error {
	session := session.FromContext(c)
	logto := logto.NewClient(g.Config, session)

	loggedIn := logto.IsAuthenticated()
	if !loggedIn {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Unauthorized",
		})
	}

	idTokenClaims, err := logto.GetIdTokenClaims()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get token claims",
			"error":   err.Error(),
		})
	}

	return c.JSON(idTokenClaims)
}

func syncUser(ctx context.Context, logto *client.LogtoClient, db *gorm.DB) (*models.User, error) {
	// Get user claims from Logto
	idTokenClaims, err := logto.GetIdTokenClaims()
	if err != nil {
		return nil, err
	}

	// Find or create user
	var user models.User
	result := db.WithContext(ctx).Model(&models.User{}).Where(&models.User{ExternalOauthID: idTokenClaims.Sub}).First(&user)
	if result.Error != nil && result.Error != gorm.ErrRecordNotFound {
		return nil, result.Error
	}

	if user.ID == "" {
		userID, err := typeid.New[models.UserID]()
		if err != nil {
			return nil, err
		}
		user.ID = userID.String()
	}

	// Update user details
	user.ExternalOauthID = idTokenClaims.Sub
	user.Email = idTokenClaims.Email
	user.Name = idTokenClaims.Name
	user.LastLoginAt = time.Now()

	if result.Error == gorm.ErrRecordNotFound {
		return &user, db.WithContext(ctx).Create(&user).Error
	}
	return &user, db.WithContext(ctx).Save(&user).Error
}

func (g *BaseHandler) getUserHandler(c fiber.Ctx) error {
	logtoID, ok := c.Locals("oauth-id").(string)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get user ID",
		})
	}

	var user models.User
	g.DB.WithContext(c.Context()).Model(&models.User{}).Where(&models.User{ExternalOauthID: logtoID}).First(&user)

	return c.JSON(user)
}

type updateUserRequest struct {
	Name         *string `json:"name"`
	HasOnboarded *bool   `json:"has_onboarded"`
}

func (g *BaseHandler) updateUserHandler(c fiber.Ctx) error {
	logtoID, ok := c.Locals("oauth-id").(string)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get user ID",
		})
	}

	// Parse request body
	input := new(updateUserRequest)
	if err := c.Bind().JSON(input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	// Get existing user
	var user models.User
	result := g.DB.WithContext(c.Context()).Model(&models.User{}).Where(&models.User{ExternalOauthID: logtoID}).First(&user)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get user",
			"error":   result.Error.Error(),
		})
	}

	// Update fields if provided
	if input.Name != nil {
		user.Name = *input.Name
	}
	if input.HasOnboarded != nil {
		user.HasOnboarded = *input.HasOnboarded
	}

	// Save updates
	if err := g.DB.WithContext(c.Context()).Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to update user",
			"error":   err.Error(),
		})
	}

	return c.JSON(user)
}
