package handlers

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation"
	"github.com/gofiber/fiber/v3"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"github.com/ted-too/logsicle/internal/storage/models"
	"gorm.io/gorm"
)

// Request structs

type createOrganizationRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (r createOrganizationRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Name, validation.Required, validation.Length(1, 255)),
	)
}

type updateOrganizationRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type addMemberRequest struct {
	UserID string      `json:"user_id"`
	Role   models.Role `json:"role"`
}

func (r addMemberRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.UserID, validation.Required),
		validation.Field(&r.Role, validation.In(
			models.RoleOwner,
			models.RoleAdmin,
			models.RoleMember,
		)),
	)
}

type updateMemberRoleRequest struct {
	Role models.Role `json:"role"`
}

func (r updateMemberRoleRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Role, validation.Required, validation.In(
			models.RoleOwner,
			models.RoleAdmin,
			models.RoleMember,
		)),
	)
}

// Handler methods

// createOrganization creates a new organization
func (h *BaseHandler) createOrganization(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)

	body := new(createOrganizationRequest)
	if err := c.Bind().Body(body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	err := body.Validate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Validation failed",
			"error":   err.Error(),
		})
	}

	// Generate organization ID
	orgID, err := typeid.New[models.OrganizationID]()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to generate organization ID",
		})
	}

	// Create organization
	org := models.Organization{
		BaseModel: storage.BaseModel{
			ID: orgID.String(),
		},
		Name:        body.Name,
		Description: body.Description,
		CreatedBy:   userID,
	}

	// Start a transaction
	tx := h.db.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to start transaction",
			"error":   tx.Error.Error(),
		})
	}

	// Create organization
	if err := tx.Create(&org).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to create organization",
			"error":   err.Error(),
		})
	}

	// Generate membership ID
	membershipID, err := typeid.New[models.TeamMembershipID]()
	if err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to generate membership ID",
		})
	}

	// Add creator as owner
	membership := models.TeamMembership{
		BaseModel: storage.BaseModel{
			ID: membershipID.String(),
		},
		OrganizationID: org.ID,
		UserID:         userID,
		Role:           models.RoleOwner,
		JoinedAt:       time.Now(),
		InvitedBy:      userID,
	}

	if err := tx.Create(&membership).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to add user to organization",
			"error":   err.Error(),
		})
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to commit transaction",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(org)
}

// listOrganizations lists all organizations the user is a member of
func (h *BaseHandler) listOrganizations(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)

	var memberships []models.TeamMembership
	if err := h.db.Preload("Organization").Where("user_id = ?", userID).Find(&memberships).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch organizations",
			"error":   err.Error(),
		})
	}

	// Extract organizations from memberships
	organizations := make([]models.Organization, 0, len(memberships))
	for _, membership := range memberships {
		if membership.Organization != nil {
			organizations = append(organizations, *membership.Organization)
		}
	}

	return c.JSON(organizations)
}

// getOrganization gets a single organization by ID
func (h *BaseHandler) getOrganization(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	orgID := c.Params("id")

	// Verify organization access
	org, err := verifyOrganizationAccess(h.db, orgID, userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "You don't have access to this organization",
		})
	}

	// Load members
	if err := h.db.Preload("Members.User").First(&org, "id = ?", orgID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch organization details",
			"error":   err.Error(),
		})
	}

	return c.JSON(org)
}

// updateOrganization updates an organization
func (h *BaseHandler) updateOrganization(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	orgID := c.Params("id")

	// Verify organization access with admin or owner role
	_, err := verifyOrganizationRole(h.db, orgID, userID, []models.Role{models.RoleOwner, models.RoleAdmin})
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "You don't have permission to update this organization",
		})
	}

	body := new(updateOrganizationRequest)
	if err := c.Bind().Body(body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	// Update only provided fields
	updates := make(map[string]interface{})
	if body.Name != "" {
		updates["name"] = body.Name
	}
	if body.Description != "" {
		updates["description"] = body.Description
	}

	if len(updates) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "No fields to update",
		})
	}

	if err := h.db.Model(&models.Organization{}).Where("id = ?", orgID).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to update organization",
			"error":   err.Error(),
		})
	}

	// Fetch updated organization
	var org models.Organization
	if err := h.db.First(&org, "id = ?", orgID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch updated organization",
			"error":   err.Error(),
		})
	}

	return c.JSON(org)
}

// deleteOrganization deletes an organization
func (h *BaseHandler) deleteOrganization(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	orgID := c.Params("id")

	// Verify organization access with owner role
	_, err := verifyOrganizationRole(h.db, orgID, userID, []models.Role{models.RoleOwner})
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Only organization owners can delete organizations",
		})
	}

	// Start a transaction
	tx := h.db.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to start transaction",
			"error":   tx.Error.Error(),
		})
	}

	// Delete organization (soft delete)
	if err := tx.Delete(&models.Organization{}, "id = ?", orgID).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to delete organization",
			"error":   err.Error(),
		})
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to commit transaction",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Organization deleted successfully",
	})
}

// listOrganizationMembers lists all members of an organization
func (h *BaseHandler) listOrganizationMembers(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	orgID := c.Params("id")

	// Verify organization access
	_, err := verifyOrganizationAccess(h.db, orgID, userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "You don't have access to this organization",
		})
	}

	var memberships []models.TeamMembership
	if err := h.db.Preload("User").Where("organization_id = ?", orgID).Find(&memberships).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch organization members",
			"error":   err.Error(),
		})
	}

	return c.JSON(memberships)
}

// addOrganizationMember adds a new member to an organization
func (h *BaseHandler) addOrganizationMember(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	orgID := c.Params("id")

	// Verify organization access with admin or owner role
	_, err := verifyOrganizationRole(h.db, orgID, userID, []models.Role{models.RoleOwner, models.RoleAdmin})
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "You don't have permission to add members to this organization",
		})
	}

	body := new(addMemberRequest)
	if err := c.Bind().Body(body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	err = body.Validate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Validation failed",
			"error":   err.Error(),
		})
	}

	// Check if user exists
	var user models.User
	if err := h.db.First(&user, "id = ?", body.UserID).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "User not found",
		})
	}

	// Check if user is already a member
	var existingMembership models.TeamMembership
	result := h.db.Where("organization_id = ? AND user_id = ?", orgID, body.UserID).First(&existingMembership)
	if result.Error == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"message": "User is already a member of this organization",
		})
	}

	// Generate membership ID
	membershipID, err := typeid.New[models.TeamMembershipID]()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to generate membership ID",
		})
	}

	// Create membership
	membership := models.TeamMembership{
		BaseModel: storage.BaseModel{
			ID: membershipID.String(),
		},
		OrganizationID: orgID,
		UserID:         body.UserID,
		Role:           body.Role,
		JoinedAt:       time.Now(),
		InvitedBy:      userID,
	}

	if err := h.db.Create(&membership).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to add member to organization",
			"error":   err.Error(),
		})
	}

	// Load user data
	if err := h.db.Preload("User").First(&membership, "id = ?", membership.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to fetch membership details",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(membership)
}

// updateOrganizationMember updates a member's role in an organization
func (h *BaseHandler) updateOrganizationMember(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	orgID := c.Params("id")
	memberID := c.Params("memberId")

	// Verify organization access with admin or owner role
	currentUserMembership, err := verifyOrganizationRole(h.db, orgID, userID, []models.Role{models.RoleOwner, models.RoleAdmin})
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "You don't have permission to update members in this organization",
		})
	}

	body := new(updateMemberRoleRequest)
	if err := c.Bind().Body(body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	err = body.Validate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Validation failed",
			"error":   err.Error(),
		})
	}

	// Get the membership to update
	var membership models.TeamMembership
	if err := h.db.First(&membership, "id = ? AND organization_id = ?", memberID, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Membership not found",
		})
	}

	// Admin can't change owner's role
	if currentUserMembership.Role == models.RoleAdmin && membership.Role == models.RoleOwner {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Admins cannot change an owner's role",
		})
	}

	// Update role
	if err := h.db.Model(&membership).Update("role", body.Role).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to update member role",
			"error":   err.Error(),
		})
	}

	return c.JSON(membership)
}

// removeOrganizationMember removes a member from an organization
func (h *BaseHandler) removeOrganizationMember(c fiber.Ctx) error {
	userID := c.Locals("user-id").(string)
	orgID := c.Params("id")
	memberID := c.Params("memberId")

	// Verify organization access with admin or owner role
	currentUserMembership, err := verifyOrganizationRole(h.db, orgID, userID, []models.Role{models.RoleOwner, models.RoleAdmin})
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "You don't have permission to remove members from this organization",
		})
	}

	// Get the membership to remove
	var membership models.TeamMembership
	if err := h.db.First(&membership, "id = ? AND organization_id = ?", memberID, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Membership not found",
		})
	}

	// Admin can't remove owner
	if currentUserMembership.Role == models.RoleAdmin && membership.Role == models.RoleOwner {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Admins cannot remove owners from the organization",
		})
	}

	// Can't remove yourself if you're the last owner
	if membership.UserID == userID && membership.Role == models.RoleOwner {
		var ownerCount int64
		h.db.Model(&models.TeamMembership{}).Where("organization_id = ? AND role = ?", orgID, models.RoleOwner).Count(&ownerCount)
		if ownerCount <= 1 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"message": "Cannot remove the last owner from the organization",
			})
		}
	}

	// Delete membership
	if err := h.db.Delete(&membership).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Failed to remove member from organization",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Member removed successfully",
	})
}

// Helper functions

// verifyOrganizationAccess checks if a user has access to an organization
func verifyOrganizationAccess(db *gorm.DB, orgID, userID string) (*models.Organization, error) {
	var membership models.TeamMembership
	result := db.Where("organization_id = ? AND user_id = ?", orgID, userID).First(&membership)
	if result.Error != nil {
		return nil, result.Error
	}

	var org models.Organization
	if err := db.First(&org, "id = ?", orgID).Error; err != nil {
		return nil, err
	}

	return &org, nil
}

// verifyOrganizationRole checks if a user has a specific role in an organization
func verifyOrganizationRole(db *gorm.DB, orgID, userID string, allowedRoles []models.Role) (*models.TeamMembership, error) {
	var membership models.TeamMembership
	result := db.Where("organization_id = ? AND user_id = ?", orgID, userID).First(&membership)
	if result.Error != nil {
		return nil, result.Error
	}

	// Check if user has one of the allowed roles
	hasRole := false
	for _, role := range allowedRoles {
		if membership.Role == role {
			hasRole = true
			break
		}
	}

	if !hasRole {
		return nil, fiber.NewError(fiber.StatusForbidden, "Insufficient permissions")
	}

	return &membership, nil
}
