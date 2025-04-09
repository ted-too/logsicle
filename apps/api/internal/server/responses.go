package server

import (
	"github.com/gofiber/fiber/v3"
)

type ErrorResponse struct {
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// SendResponse sends a JSON response with optional status code
func SendResponse(c fiber.Ctx, data interface{}, statusCode ...int) error {
	code := fiber.StatusOK
	if len(statusCode) > 0 {
		code = statusCode[0]
	}

	return c.Status(code).JSON(data)
}

// SendError sends a standardized error response
func SendError(c fiber.Ctx, err error, statusCode ...int) error {
	code := fiber.StatusBadRequest
	if len(statusCode) > 0 {
		code = statusCode[0]
	}

	return c.Status(code).JSON(fiber.Map{
		"message": err.Error(),
	})
}
