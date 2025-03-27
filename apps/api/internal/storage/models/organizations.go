package models

import (
	"database/sql"
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
