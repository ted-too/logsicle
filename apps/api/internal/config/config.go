package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/caarlos0/env/v11"
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/go-ozzo/ozzo-validation/v4/is"
	"github.com/pelletier/go-toml/v2"
)

type Config struct {
	Port            string `toml:"port" env:"PORT"`
	ShutdownTimeout string `toml:"shutdown_timeout"`
	Dev             bool   `toml:"dev" env:"DEV"`
	ApiBaseURL      string `toml:"api_base_url" env:"API_URL"`
	WebBaseURL      string `toml:"web_base_url" env:"WEB_URL"`
	Cors            struct {
		// Change the type to string for env parsing
		AllowedOrigins      string   `toml:"-" env:"CORS_ALLOWED_ORIGINS"`
		AllowedOriginsSlice []string `toml:"allowed_origins" env:"-"` // For TOML parsing
		CookieDomain        string   `toml:"cookie_domain" env:"CORS_COOKIE_DOMAIN"`
	} `toml:"cors"`
	// Rest of your struct remains the same
	Storage struct {
		Dsn             string `toml:"dsn" env:"DB_DSN"`
		MaxOpenConns    int    `toml:"max_open_conns" env:"DB_MAX_OPEN_CONNS"`
		MaxIdleConns    int    `toml:"max_idle_conns" env:"DB_MAX_IDLE_CONNS"`
		ConnMaxLifetime string `toml:"conn_max_lifetime" env:"DB_CONN_MAX_LIFETIME"`
		RedisURL        string `toml:"redis_url" env:"REDIS_URL"`
		RedisQueueURL   string `toml:"redis_queue_url" env:"REDIS_QUEUE_URL"`
		RedisSessionURL string `toml:"redis_session_url" env:"REDIS_SESSION_URL"`
	} `toml:"storage"`
	Auth struct {
		Endpoint    string `toml:"endpoint" env:"AUTH_ENDPOINT"`
		AppID       string `toml:"app_id" env:"AUTH_APP_ID"`
		AppSecret   string `toml:"app_secret" env:"AUTH_APP_SECRET"`
		SignInURL   string
		RedirectURL string
		FrontendURL string
		Resources   []string `toml:"resources" env:"AUTH_RESOURCES"`
	} `toml:"auth"`
}

// GetAllowedOrigins returns the allowed origins as a slice
func (c *Config) GetAllowedOrigins() []string {
	// If we have values from TOML, use those
	if len(c.Cors.AllowedOriginsSlice) > 0 {
		return c.Cors.AllowedOriginsSlice
	}

	// Otherwise, parse the comma-separated string from env
	if c.Cors.AllowedOrigins != "" {
		origins := strings.Split(c.Cors.AllowedOrigins, ",")
		// Trim spaces from each origin
		for i, origin := range origins {
			origins[i] = strings.TrimSpace(origin)
		}
		return origins
	}

	// Default if nothing is set
	return []string{"http://localhost:3000"}
}

func validateDuration(value interface{}) error {
	s, _ := value.(string)
	_, err := time.ParseDuration(s)
	return err
}

func (c Config) Validate() error {
	// Get the actual allowed origins for validation
	allowedOrigins := c.GetAllowedOrigins()

	// Validate top-level fields
	if err := validation.ValidateStruct(&c,
		validation.Field(&c.Port, validation.Required, is.Digit),
		validation.Field(&c.ShutdownTimeout, validation.Required, validation.By(validateDuration)),
		validation.Field(&c.ApiBaseURL, validation.Required, is.URL),
		validation.Field(&c.WebBaseURL, validation.Required, is.URL),
	); err != nil {
		return err
	}

	// Validate CORS fields - use the computed allowedOrigins
	if err := validation.Validate(allowedOrigins,
		validation.Required, validation.Length(1, 0)); err != nil {
		return fmt.Errorf("CORS config: AllowedOrigins: %w", err)
	}

	if err := validation.Validate(c.Cors.CookieDomain, validation.Required); err != nil {
		return fmt.Errorf("CORS config: CookieDomain: %w", err)
	}

	// Rest of your validation remains the same
	// Validate Storage fields
	if err := validation.ValidateStruct(&c.Storage,
		validation.Field(&c.Storage.Dsn, validation.Required),
		validation.Field(&c.Storage.MaxOpenConns, validation.Min(1)),
		validation.Field(&c.Storage.MaxIdleConns, validation.Min(1)),
		validation.Field(&c.Storage.ConnMaxLifetime, validation.Required, validation.By(validateDuration)),
		validation.Field(&c.Storage.RedisURL, validation.Required),
		validation.Field(&c.Storage.RedisQueueURL, validation.Required),
		validation.Field(&c.Storage.RedisSessionURL, validation.Required),
	); err != nil {
		return fmt.Errorf("Storage config: %w", err)
	}

	// Validate Auth fields
	if err := validation.ValidateStruct(&c.Auth,
		validation.Field(&c.Auth.Endpoint, validation.Required, is.URL),
		validation.Field(&c.Auth.AppID, validation.Required),
		validation.Field(&c.Auth.AppSecret, validation.Required),
		validation.Field(&c.Auth.SignInURL, validation.Required, is.URL),
		validation.Field(&c.Auth.RedirectURL, validation.Required, is.URL),
		validation.Field(&c.Auth.FrontendURL, validation.Required, is.URL),
		validation.Field(&c.Auth.Resources, validation.Required),
	); err != nil {
		return fmt.Errorf("Auth config: %w", err)
	}

	return nil
}

func (c *Config) SetDefaultValues() {
	if c.ShutdownTimeout == "" {
		c.ShutdownTimeout = "5s"
	}

	// Set derived URLs if base URLs are provided and the derived URLs aren't explicitly set
	if c.ApiBaseURL != "" {
		apiBase := strings.TrimSuffix(c.ApiBaseURL, "/")

		// Only set these if they weren't explicitly provided
		if c.Auth.SignInURL == "" {
			c.Auth.SignInURL = fmt.Sprintf("%s/v1/auth/sign-in", apiBase)
		}

		if c.Auth.RedirectURL == "" {
			c.Auth.RedirectURL = fmt.Sprintf("%s/v1/auth/callback", apiBase)
		}
	}

	if c.WebBaseURL != "" && c.Auth.FrontendURL == "" {
		c.Auth.FrontendURL = c.WebBaseURL
	}

	if c.Auth.Resources == nil || len(c.Auth.Resources) == 0 {
		c.Auth.Resources = []string{"*"}
	}
}

func LoadConfig(path string) (*Config, error) {
	config := &Config{}

	// Try to load TOML file if it exists
	file, err := os.Open(path)
	if err == nil {
		defer file.Close()
		if err := toml.NewDecoder(file).Decode(&config); err != nil {
			return nil, fmt.Errorf("error parsing TOML file: %w", err)
		}
		config.SetDefaultValues()
		// Validate the configuration
		if err := config.Validate(); err != nil {
			return nil, fmt.Errorf("config validation failed: %w", err)
		}

		return config, nil

	} else if !os.IsNotExist(err) {
		// If error is not "file not found", return it
		return nil, fmt.Errorf("error opening config file: %w", err)
	}

	// If file doesn't exist, we'll rely entirely on environment variables
	if err := env.Parse(config); err != nil {
		return nil, fmt.Errorf("error parsing environment variables: %w", err)
	}

	// Set defaults for required fields if not provided

	// TODO: Implement RBAC
	config.Auth.Resources = []string{"*"}

	config.SetDefaultValues()
	// Validate the configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return config, nil
}
