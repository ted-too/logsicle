package config

import (
	"os"

	"github.com/pelletier/go-toml/v2"
)

type Config struct {
	Port            string `toml:"port" env:"PORT"`
	ShutdownTimeout string `toml:"shutdown_timeout"`
	Dev             bool   `toml:"dev" env:"DEV"`
	Cors            struct {
		AllowedOrigins []string `toml:"allowed_origins" env:"CORS_ALLOWED_ORIGINS"`
	} `toml:"cors"`
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
		Endpoint    string   `toml:"endpoint" env:"AUTH_ENDPOINT"`
		AppID       string   `toml:"app_id" env:"AUTH_APP_ID"`
		AppSecret   string   `toml:"app_secret" env:"AUTH_APP_SECRET"`
		SignInURL   string   `toml:"sign_in_url" env:"AUTH_SIGN_IN_URL"`
		RedirectURL string   `toml:"redirect_url" env:"AUTH_REDIRECT_URL"`
		FrontendURL string   `toml:"frontend_url" env:"AUTH_FRONTEND_URL"`
		Resources   []string `toml:"resources" env:"AUTH_RESOURCES"`
	} `toml:"auth"`
}

func LoadConfig(path string) (*Config, error) {
	config := &Config{}

	// Load YAML file
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	if err := toml.NewDecoder(file).Decode(&config); err != nil {
		return nil, err
	}

	// Override with environment variables
	if port := os.Getenv("PORT"); port != "" {
		config.Port = port
	}
	// TODO: repeat for other environment variables

	return config, nil
}
