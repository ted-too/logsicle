package oidc

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/ted-too/logsicle/internal/config"
	"golang.org/x/oauth2"
)

const (
	stateKey        = "oidc_state"
	tokenKey        = "oidc_token"
	idTokenKey      = "oidc_id_token"
	refreshTokenKey = "oidc_refresh_token"
	expiryKey       = "oidc_expiry"
)

var (
	ErrStateNotFound                    = errors.New("state not found in session")
	ErrStateMissing                     = errors.New("state parameter missing from request")
	ErrStateMismatch                    = errors.New("state mismatch")
	ErrCodeNotFound                     = errors.New("code not found in request")
	ErrIDTokenNotFound                  = errors.New("id_token not found in OAuth2 token")
	ErrNotAuthenticated                 = errors.New("not authenticated")
	ErrIDTokenMissing                   = errors.New("id token not found in session")
	ErrInvalidIDTokenFormat             = errors.New("invalid id token format in session")
	ErrIDTokenMissingAfterRefresh       = errors.New("id token not found after refresh")
	ErrInvalidIDTokenFormatAfterRefresh = errors.New("invalid id token format after refresh")
	ErrRefreshTokenNotFound             = errors.New("refresh token not found in session")
	ErrInvalidRefreshToken              = errors.New("invalid refresh token format or empty refresh token")
)

// IDTokenClaims represents the claims in an ID token
type IDTokenClaims struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
}

// OIDCClient handles authentication with an OIDC provider (Authentik)
type OIDCClient struct {
	provider     *oidc.Provider
	verifier     *oidc.IDTokenVerifier
	oauth2Config *oauth2.Config
	session      *session.Middleware
	refreshMutex sync.Mutex
}

// NewClient creates a new OIDC client
func NewClient(ctx context.Context, cfg *config.Config, session *session.Middleware) (*OIDCClient, error) {
	provider, err := oidc.NewProvider(ctx, cfg.Auth.Endpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize OIDC provider: %w", err)
	}

	oauth2Config := &oauth2.Config{
		ClientID:     cfg.Auth.AppID,
		ClientSecret: cfg.Auth.AppSecret,
		RedirectURL:  cfg.Auth.RedirectURL,
		Endpoint:     provider.Endpoint(),
		Scopes:       []string{oidc.ScopeOpenID, "email", "profile", "offline_access"},
	}

	return &OIDCClient{
		provider:     provider,
		verifier:     provider.Verifier(&oidc.Config{ClientID: cfg.Auth.AppID}),
		oauth2Config: oauth2Config,
		session:      session,
	}, nil
}

// GenerateState generates a random state string for CSRF protection
func (c *OIDCClient) GenerateState() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

// SignIn returns the URL to redirect the user to for authentication
func (c *OIDCClient) SignIn() (string, error) {
	state, err := c.GenerateState()
	if err != nil {
		return "", fmt.Errorf("failed to generate state: %w", err)
	}

	// Store state in session
	c.session.Set(stateKey, state)

	// Generate auth URL with state
	authURL := c.oauth2Config.AuthCodeURL(state)
	return authURL, nil
}

// HandleSignInCallback processes the callback from the OIDC provider
func (c *OIDCClient) HandleSignInCallback(ctx context.Context, r *http.Request) error {
	// Verify state
	expectedState := c.session.Get(stateKey)
	if expectedState == nil {
		return ErrStateNotFound
	}

	// Get state from query parameters
	query := r.URL.Query()
	state := query.Get("state")
	if state == "" {
		return ErrStateMissing
	}

	if state != expectedState.(string) {
		return ErrStateMismatch
	}

	// Exchange code for token
	code := query.Get("code")
	if code == "" {
		return ErrCodeNotFound
	}

	oauth2Token, err := c.oauth2Config.Exchange(ctx, code)
	if err != nil {
		return fmt.Errorf("failed to exchange code for token: %w", err)
	}

	// Extract ID token
	rawIDToken, ok := oauth2Token.Extra("id_token").(string)
	if !ok {
		return ErrIDTokenNotFound
	}

	// Verify ID token
	_, err = c.verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return fmt.Errorf("failed to verify ID token: %w", err)
	}

	// Store tokens in session
	c.session.Set(tokenKey, oauth2Token.AccessToken)
	c.session.Set(idTokenKey, rawIDToken)
	if oauth2Token.RefreshToken != "" {
		log.Printf("Setting refresh token in session: %s", oauth2Token.RefreshToken)
		c.session.Set(refreshTokenKey, oauth2Token.RefreshToken)
	} else {
		log.Printf("No refresh token found in OAuth2 token")
	}
	c.session.Set(expiryKey, oauth2Token.Expiry.Format(time.RFC3339))

	return nil
}

// IsAuthenticated checks if the user is authenticated
func (c *OIDCClient) IsAuthenticated() bool {
	token := c.session.Get(tokenKey)
	idToken := c.session.Get(idTokenKey)

	if token == nil || idToken == nil {
		return false
	}

	// If token exists but is expired, don't refresh here
	// Let GetIDTokenClaims handle the refresh if needed
	expiryStr, ok := c.session.Get(expiryKey).(string)
	if !ok {
		return false
	}

	expiry, err := time.Parse(time.RFC3339, expiryStr)
	if err != nil {
		log.Printf("Failed to parse token expiry: %v", err)
		return false
	}

	return !time.Now().After(expiry)
}

// GetIDTokenClaims returns the claims from the ID token
func (c *OIDCClient) GetIDTokenClaims(ctx context.Context) (*IDTokenClaims, error) {
	c.refreshMutex.Lock()
	defer c.refreshMutex.Unlock()

	rawIDTokenVal := c.session.Get(idTokenKey)
	if rawIDTokenVal == nil {
		return nil, ErrIDTokenMissing
	}

	rawIDToken, ok := rawIDTokenVal.(string)
	if !ok {
		return nil, ErrInvalidIDTokenFormat
	}

	// Try to verify the token
	idToken, err := c.verifier.Verify(ctx, rawIDToken)
	if err != nil {
		// Check if the error is due to token expiration
		if strings.Contains(err.Error(), "token is expired") {
			// Try to refresh the token
			log.Printf("Token expired, attempting to refresh in GetIDTokenClaims")

			// Perform the actual token refresh
			refreshTokenVal := c.session.Get(refreshTokenKey)
			if refreshTokenVal == nil {
				return nil, ErrRefreshTokenNotFound
			}

			refreshToken, ok := refreshTokenVal.(string)
			if !ok || refreshToken == "" {
				return nil, ErrInvalidRefreshToken
			}

			// Create a token source with the refresh token
			ts := c.oauth2Config.TokenSource(ctx, &oauth2.Token{
				RefreshToken: refreshToken,
			})

			// Get a new token
			newToken, err := ts.Token()
			if err != nil {
				return nil, fmt.Errorf("failed to refresh token: %w", err)
			}

			// Extract ID token
			newRawIDToken, ok := newToken.Extra("id_token").(string)
			if !ok {
				return nil, ErrIDTokenNotFound
			}

			// Store the new tokens in session
			c.session.Set(tokenKey, newToken.AccessToken)
			c.session.Set(idTokenKey, newRawIDToken)
			if newToken.RefreshToken != "" {
				c.session.Set(refreshTokenKey, newToken.RefreshToken)
			}
			c.session.Set(expiryKey, newToken.Expiry.Format(time.RFC3339))

			log.Printf("Token refreshed successfully in GetIDTokenClaims, new expiry: %s", newToken.Expiry.Format(time.RFC3339))

			// Verify the new token
			idToken, err = c.verifier.Verify(ctx, newRawIDToken)
			if err != nil {
				return nil, fmt.Errorf("failed to verify refreshed ID token: %w", err)
			}
		} else {
			return nil, fmt.Errorf("failed to verify ID token: %w", err)
		}
	}

	var claims IDTokenClaims
	if err := idToken.Claims(&claims); err != nil {
		return nil, fmt.Errorf("failed to parse ID token claims: %w", err)
	}

	return &claims, nil
}

// RefreshToken refreshes the OAuth2 token using the refresh token
func (c *OIDCClient) RefreshToken(ctx context.Context) error {
	c.refreshMutex.Lock()
	defer c.refreshMutex.Unlock()

	// Check if token is still expired after acquiring lock
	// Another goroutine might have refreshed it while we were waiting
	if !c.isTokenExpired() {
		return nil
	}

	refreshTokenVal := c.session.Get(refreshTokenKey)
	if refreshTokenVal == nil {
		return ErrRefreshTokenNotFound
	}

	refreshToken, ok := refreshTokenVal.(string)
	if !ok || refreshToken == "" {
		return ErrInvalidRefreshToken
	}

	// Create a token source with the refresh token
	ts := c.oauth2Config.TokenSource(ctx, &oauth2.Token{
		RefreshToken: refreshToken,
	})

	// Get a new token
	newToken, err := ts.Token()
	if err != nil {
		return fmt.Errorf("failed to refresh token: %w", err)
	}

	// Extract ID token
	rawIDToken, ok := newToken.Extra("id_token").(string)
	if !ok {
		return ErrIDTokenNotFound
	}

	// Store the new tokens in session
	c.session.Set(tokenKey, newToken.AccessToken)
	c.session.Set(idTokenKey, rawIDToken)
	if newToken.RefreshToken != "" {
		c.session.Set(refreshTokenKey, newToken.RefreshToken)
	}
	c.session.Set(expiryKey, newToken.Expiry.Format(time.RFC3339))

	log.Printf("Token refreshed successfully, new expiry: %s", newToken.Expiry.Format(time.RFC3339))

	return nil
}

// isTokenExpired checks if the current token is expired
func (c *OIDCClient) isTokenExpired() bool {
	expiryStr, ok := c.session.Get(expiryKey).(string)
	if !ok {
		return true
	}

	expiry, err := time.Parse(time.RFC3339, expiryStr)
	if err != nil {
		return true
	}

	return time.Now().After(expiry)
}

// SignOut signs the user out
func (c *OIDCClient) SignOut(redirectURL string) (string, error) {
	// Clear session
	c.session.Delete(stateKey)
	c.session.Delete(tokenKey)
	c.session.Delete(idTokenKey)
	c.session.Delete(refreshTokenKey)
	c.session.Delete(expiryKey)

	// Get the provider's metadata
	var providerMetadata struct {
		EndSessionEndpoint string `json:"end_session_endpoint"`
	}

	if err := c.provider.Claims(&providerMetadata); err != nil {
		log.Printf("Failed to get provider metadata: %v", err)
		// Fallback to constructing the URL manually
		baseURL := ""
		issuerURL := c.provider.Endpoint().AuthURL

		// Extract the base URL from the issuer
		if idx := strings.Index(issuerURL, "/application/o/"); idx != -1 {
			baseURL = issuerURL[:idx]
		} else {
			// Fallback to using the issuer URL as is
			baseURL = strings.TrimSuffix(issuerURL, "/")
		}

		// Construct the end session URL for Authentik
		logoutURL := fmt.Sprintf("%s/application/o/logsicle/end-session/?redirect_uri=%s", baseURL, redirectURL)
		log.Printf("Using fallback logout URL: %s", logoutURL)
		return logoutURL, nil
	}

	// If we have an end_session_endpoint in the metadata, use it
	if providerMetadata.EndSessionEndpoint != "" {
		logoutURL := fmt.Sprintf("%s?redirect_uri=%s", providerMetadata.EndSessionEndpoint, redirectURL)
		log.Printf("Using discovered logout URL: %s", logoutURL)
		return logoutURL, nil
	}

	// If no end_session_endpoint was found, use the fallback
	baseURL := ""
	issuerURL := c.provider.Endpoint().AuthURL

	// Extract the base URL from the issuer
	if idx := strings.Index(issuerURL, "/application/o/"); idx != -1 {
		baseURL = issuerURL[:idx]
	} else {
		// Fallback to using the issuer URL as is
		baseURL = strings.TrimSuffix(issuerURL, "/")
	}

	// Construct the end session URL for Authentik
	logoutURL := fmt.Sprintf("%s/application/o/logsicle/end-session/?redirect_uri=%s", baseURL, redirectURL)
	log.Printf("Using fallback logout URL: %s", logoutURL)
	return logoutURL, nil
}
