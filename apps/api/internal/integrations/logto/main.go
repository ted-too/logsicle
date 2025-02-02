package logto

import (
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/logto-io/go/client"
	"github.com/ted-too/logsicle/internal/config"
)

type SessionStorage struct {
	session *session.Middleware
}

func (storage *SessionStorage) GetItem(key string) string {
	value := storage.session.Get(key)
	if value == nil {
		return ""
	}
	return value.(string)
}

func (storage *SessionStorage) SetItem(key, value string) {
	storage.session.Set(key, value)
}

func NewClient(cfg *config.Config, session *session.Middleware) *client.LogtoClient {
	return client.NewLogtoClient(&client.LogtoConfig{
		Endpoint:  cfg.Auth.Endpoint,
		AppId:     cfg.Auth.AppID,
		AppSecret: cfg.Auth.AppSecret,
		// TODO: Implement RBAC
		// Resources: cfg.Auth.Resources,
		Scopes: []string{"email", "profile"},
	}, &SessionStorage{session: session})
}
