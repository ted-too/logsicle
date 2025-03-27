package models

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"strconv"
	"time"

	"github.com/gosimple/slug"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"gorm.io/gorm"
)

// Organization represents a team or organization that owns projects
type Organization struct {
	storage.BaseModel
	Name        string           `gorm:"not null" json:"name"`
	Slug        string           `gorm:"not null;unique" json:"slug"`
	Logo        sql.NullString   `json:"logo"`
	Description string           `json:"description"`
	CreatedByID string           `gorm:"index;not null" json:"created_by_id"` // User ID who created the organisation
	CreatedBy   User             `json:"created_by" gorm:"foreignKey:CreatedByID"`
	Projects    []Project        `json:"projects"`
	Members     []TeamMembership `json:"members" gorm:"foreignKey:OrganizationID"`
}

func (o *Organization) BeforeCreate(tx *gorm.DB) (err error) {
	if o.BaseModel.ID == "" {
		id, err := typeid.New[OrganizationID]()
		if err != nil {
			return err
		}
		o.BaseModel.ID = id.String()
	}

	// Generate initial slug from name
	o.Slug = slug.Make(o.Name)

	var count int64
	if err := tx.Model(&Organization{}).Where("slug = ?", o.Slug).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		o.Slug = o.Slug + "-" + strconv.FormatInt(count+1, 10)
	}

	return nil
}

func (o Organization) MarshalJSON() ([]byte, error) {
	baseJSON, err := json.Marshal(o.BaseModel)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(baseJSON, &result); err != nil {
		return nil, err
	}

	result["name"] = o.Name
	result["slug"] = o.Slug
	if o.Logo.Valid {
		result["logo"] = o.Logo.String
	} else {
		result["logo"] = nil
	}
	result["description"] = o.Description
	result["created_by"] = o.CreatedBy
	result["projects"] = o.Projects
	result["members"] = o.Members

	// Convert CreatedBy to OtherUser
	result["created_by"] = OtherUser{
		BaseModel: o.CreatedBy.BaseModel,
		Name:      o.CreatedBy.Name,
		Email:     o.CreatedBy.Email,
		Image:     o.CreatedBy.Image,
	}

	return json.Marshal(result)
}

// Role defines the permission level within an organization
type Role string

const (
	RoleOwner  Role = "owner"  // Can manage organization settings, members, and all projects
	RoleAdmin  Role = "admin"  // Can manage projects and members, but not delete the organization
	RoleMember Role = "member" // Can view and use projects, but not modify organization settings
)

// TeamMembership represents a user's membership in an organization
type TeamMembership struct {
	storage.BaseModel
	OrganizationID string         `gorm:"index;not null" json:"organization_id"`
	UserID         string         `gorm:"index;not null" json:"user_id"`
	Role           Role           `gorm:"not null;default:'member'" json:"role"`
	JoinedAt       time.Time      `gorm:"not null" json:"joined_at"`
	InvitedByID    sql.NullString `json:"invited_by"` // User ID who invited this member
	InvitedBy      User           `json:"invited_by" gorm:"foreignKey:InvitedByID"`
	User           User           `json:"user" gorm:"foreignKey:UserID"`
	Organization   Organization   `json:"organization" gorm:"foreignKey:OrganizationID"`
}

func (t *TeamMembership) BeforeCreate(tx *gorm.DB) error {
	if t.BaseModel.ID == "" {
		id, err := typeid.New[TeamMembershipID]()
		if err != nil {
			return err
		}
		t.BaseModel.ID = id.String()
	}

	if t.JoinedAt.IsZero() {
		t.JoinedAt = time.Now()
	}

	return nil
}

// TODO: There's probably a better way to do this
func (t TeamMembership) MarshalJSON() ([]byte, error) {
	baseJSON, err := json.Marshal(t.BaseModel)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(baseJSON, &result); err != nil {
		return nil, err
	}

	result["organization_id"] = t.OrganizationID
	result["user_id"] = t.UserID
	result["role"] = t.Role
	result["joined_at"] = t.JoinedAt

	// Convert User to OtherUser
	result["user"] = OtherUser{
		BaseModel: t.User.BaseModel,
		Name:      t.User.Name,
		Email:     t.User.Email,
		Image:     t.User.Image,
	}

	// Convert InvitedBy to OtherUser if present
	result["invited_by"] = nil
	if t.InvitedByID.Valid {
		result["invited_by"] = OtherUser{
			BaseModel: t.InvitedBy.BaseModel,
			Name:      t.InvitedBy.Name,
			Email:     t.InvitedBy.Email,
			Image:     t.InvitedBy.Image,
		}
	}

	// Add organization without members
	org := t.Organization
	org.Members = nil
	result["organization"] = org

	return json.Marshal(result)
}

// InvitationStatus represents the status of an invitation
type InvitationStatus string

const (
	InvitationPending  InvitationStatus = "pending"
	InvitationAccepted InvitationStatus = "accepted"
	InvitationRejected InvitationStatus = "rejected"
	InvitationExpired  InvitationStatus = "expired"
)

// Invitation represents an invitation to join an organization
type Invitation struct {
	storage.BaseModel
	Email          string           `gorm:"not null" json:"email"`
	OrganizationID string           `gorm:"index;not null" json:"organization_id"`
	Organization   Organization     `json:"organization" gorm:"foreignKey:OrganizationID"`
	Role           Role             `gorm:"not null;default:'member'" json:"role"`
	Token          string           `gorm:"uniqueIndex;not null" json:"token,omitempty"`
	ExpiresAt      time.Time        `gorm:"not null" json:"expires_at"`
	Status         InvitationStatus `gorm:"not null;default:'pending'" json:"status"`
	InvitedByID    string           `gorm:"index;not null" json:"invited_by_id"`
	InvitedBy      User             `json:"invited_by" gorm:"foreignKey:InvitedByID"`
}

func (i *Invitation) BeforeCreate(tx *gorm.DB) error {
	if i.BaseModel.ID == "" {
		id, err := typeid.New[InvitationID]()
		if err != nil {
			return err
		}
		i.BaseModel.ID = id.String()
	}

	if i.Status == "" {
		i.Status = InvitationPending
	}

	if i.ExpiresAt.IsZero() {
		// Default expiration time is 7 days
		i.ExpiresAt = time.Now().Add(7 * 24 * time.Hour)
	}

	if i.Token == "" {
		// Generate a secure random token
		token, err := generateInvitationToken()
		if err != nil {
			return err
		}
		i.Token = token
	}

	return nil
}

func (i Invitation) MarshalJSON() ([]byte, error) {
	baseJSON, err := json.Marshal(i.BaseModel)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(baseJSON, &result); err != nil {
		return nil, err
	}

	result["email"] = i.Email
	result["organization_id"] = i.OrganizationID
	result["organization"] = i.Organization
	result["role"] = i.Role
	result["token"] = i.Token
	result["expires_at"] = i.ExpiresAt
	result["status"] = i.Status
	result["invited_by_id"] = i.InvitedByID

	// Convert InvitedBy to OtherUser
	result["invited_by"] = OtherUser{
		BaseModel: i.InvitedBy.BaseModel,
		Name:      i.InvitedBy.Name,
		Email:     i.InvitedBy.Email,
		Image:     i.InvitedBy.Image,
	}

	return json.Marshal(result)
}

// Generate a secure random token for invitation links
func generateInvitationToken() (string, error) {
	// Use crypto random to generate a secure token
	tokenBytes := make([]byte, 32)
	_, err := rand.Read(tokenBytes)
	if err != nil {
		return "", err
	}

	// Encode as base64 for URL safety
	return base64.URLEncoding.EncodeToString(tokenBytes), nil
}
