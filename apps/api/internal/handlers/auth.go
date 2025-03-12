package handlers

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"net/url"
	"time"

	gravatar "github.com/automattic/go-gravatar"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/integrations/oidc"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

func (g *BaseHandler) signIn(c fiber.Ctx) error {
	log.Printf("Sign-in request received")

	session := session.FromContext(c)
	if session == nil {
		log.Printf("Session is nil in signIn handler")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get session",
		})
	}

	oidcClient, err := oidc.NewClient(c.Context(), g.Config, session)
	if err != nil {
		log.Printf("Failed to initialize OIDC client: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to initialize OIDC client",
			"error":   err.Error(),
		})
	}

	signInUri, err := oidcClient.SignIn()
	if err != nil {
		log.Printf("Failed to get sign-in URI: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get sign-in URI",
			"error":   err.Error(),
		})
	}

	log.Printf("Redirecting to auth provider: %s", signInUri)
	return c.Redirect().Status(fiber.StatusTemporaryRedirect).To(signInUri)
}

func (g *BaseHandler) callback(c fiber.Ctx) error {
	log.Printf("Auth callback received: %s", c.OriginalURL())

	session := session.FromContext(c)
	if session == nil {
		log.Printf("Session is nil in callback handler")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get session",
		})
	}

	oidcClient, err := oidc.NewClient(c.Context(), g.Config, session)
	if err != nil {
		log.Printf("Failed to initialize OIDC client: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to initialize OIDC client",
			"error":   err.Error(),
		})
	}

	// Convert fiber request to http.Request
	req := &http.Request{
		TLS:        c.RequestCtx().TLSConnectionState(),
		Method:     string(c.Method()),
		Host:       string(c.RequestCtx().Host()),
		RequestURI: c.OriginalURL(),
		Header:     make(http.Header),
		URL:        &url.URL{RawQuery: string(c.Request().URI().QueryString())},
	}

	// Copy headers
	c.Request().Header.VisitAll(func(key, value []byte) {
		req.Header.Set(string(key), string(value))
	})

	log.Printf("Processing callback with state: %s, code: %s",
		req.URL.Query().Get("state"),
		req.URL.Query().Get("code"))

	err = oidcClient.HandleSignInCallback(c.Context(), req)
	if err != nil {
		log.Printf("Failed to handle callback: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to handle callback",
			"error":   err.Error(),
		})
	}

	log.Printf("Callback processed successfully, syncing user")

	// Sync user details
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		user, err := syncUser(ctx, oidcClient, g.db)
		if err != nil {
			log.Printf("Failed to sync user: %v", err)
		} else {
			log.Printf("User synced successfully: %s (%s)", user.Name, user.Email)
		}
	}()

	frontendURL, err := url.Parse(g.Config.Auth.FrontendURL)
	if err != nil {
		log.Printf("Invalid frontend URL: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Invalid frontend URL",
			"error":   err.Error(),
		})
	}

	redirectURL := frontendURL.JoinPath("/dashboard").String()
	log.Printf("Redirecting to: %s", redirectURL)
	return c.Redirect().Status(fiber.StatusTemporaryRedirect).To(redirectURL)
}

func (g *BaseHandler) signOut(c fiber.Ctx) error {
	session := session.FromContext(c)

	oidcClient, err := oidc.NewClient(c.Context(), g.Config, session)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to initialize OIDC client",
			"error":   err.Error(),
		})
	}

	signOutUri, err := oidcClient.SignOut(g.Config.Auth.FrontendURL)
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

	oidcClient, err := oidc.NewClient(c.Context(), g.Config, session)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to initialize OIDC client",
			"error":   err.Error(),
		})
	}

	loggedIn := oidcClient.IsAuthenticated()
	if !loggedIn {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Unauthorized",
		})
	}

	idTokenClaims, err := oidcClient.GetIDTokenClaims(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get token claims",
			"error":   err.Error(),
		})
	}

	return c.JSON(idTokenClaims)
}

func syncUser(ctx context.Context, oidcClient *oidc.OIDCClient, db *gorm.DB) (*models.User, error) {
	// Get user claims from OIDC
	idTokenClaims, err := oidcClient.GetIDTokenClaims(ctx)
	if err != nil {
		return nil, err
	}

	// Find or create user
	var user models.User

	g := gravatar.NewGravatarFromEmail(idTokenClaims.Email)
	url := g.GetURL()

	// Check if the Gravatar URL is valid (doesn't return 404)
	resp, err := http.Head(url)
	if err == nil && resp.StatusCode != http.StatusNotFound {
		g.Size = 200 // Set size for avatar
		url = g.GetURL()
		user.AvatarURL = sql.NullString{String: url, Valid: true}
	}
	if resp != nil {
		resp.Body.Close()
	}

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
	oauthID, ok := c.Locals("oauth-id").(string)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to get user ID",
		})
	}

	var user models.User
	g.db.WithContext(c.Context()).Model(&models.User{}).Where(&models.User{ExternalOauthID: oauthID}).First(&user)

	return c.JSON(user)
}

type updateUserRequest struct {
	Name         *string `json:"name"`
	HasOnboarded *bool   `json:"has_onboarded"`
}

func (g *BaseHandler) updateUserHandler(c fiber.Ctx) error {
	oauthID, ok := c.Locals("oauth-id").(string)
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
	result := g.db.WithContext(c.Context()).Model(&models.User{}).Where(&models.User{ExternalOauthID: oauthID}).First(&user)
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
	if err := g.db.WithContext(c.Context()).Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to update user",
			"error":   err.Error(),
		})
	}

	return c.JSON(user)
}
