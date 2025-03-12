package models

import (
	"strconv"
	"time"

	"github.com/gosimple/slug"
	"github.com/sumup/typeid"
	"github.com/ted-too/logsicle/internal/storage"
	"gorm.io/gorm"
)

// Organization prefix for TypeID
type OrganizationPrefix struct{}

func (OrganizationPrefix) Prefix() string {
	return "org"
}

type OrganizationID = typeid.Sortable[OrganizationPrefix]

// Organization represents a team or organization that owns projects
type Organization struct {
	storage.BaseModel
	Name        string           `gorm:"not null" json:"name"`
	Slug        string           `gorm:"not null;unique" json:"slug"`
	Description string           `json:"description"`
	CreatedBy   string           `gorm:"index;not null" json:"created_by"` // User ID who created the organization
	Projects    []Project        `json:"projects"`
	Members     []TeamMembership `json:"members" gorm:"foreignKey:OrganizationID"`
}

func (o *Organization) BeforeCreate(tx *gorm.DB) (err error) {
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

// Role defines the permission level within an organization
type Role string

const (
	RoleOwner  Role = "owner"  // Can manage organization settings, members, and all projects
	RoleAdmin  Role = "admin"  // Can manage projects and members, but not delete the organization
	RoleMember Role = "member" // Can view and use projects, but not modify organization settings
)

// TeamMembershipPrefix for TypeID
type TeamMembershipPrefix struct{}

func (TeamMembershipPrefix) Prefix() string {
	return "mem"
}

type TeamMembershipID = typeid.Sortable[TeamMembershipPrefix]

// TeamMembership represents a user's membership in an organization
type TeamMembership struct {
	storage.BaseModel
	OrganizationID string        `gorm:"index;not null" json:"organization_id"`
	UserID         string        `gorm:"index;not null" json:"user_id"`
	Role           Role          `gorm:"not null;default:'member'" json:"role"`
	JoinedAt       time.Time     `gorm:"not null" json:"joined_at"`
	InvitedBy      string        `json:"invited_by"` // User ID who invited this member
	User           *User         `json:"user" gorm:"foreignKey:UserID"`
	Organization   *Organization `json:"organization" gorm:"foreignKey:OrganizationID"`
}

// // Custom JSON marshaling for Organization
// func (o Organization) MarshalJSON() ([]byte, error) {
// 	// Get the base model fields
// 	baseJSON, err := json.Marshal(o.BaseModel)
// 	if err != nil {
// 		return nil, err
// 	}

// 	// Unmarshal into a map to combine with other fields
// 	var result map[string]interface{}
// 	if err := json.Unmarshal(baseJSON, &result); err != nil {
// 		return nil, err
// 	}

// 	// Add the fields
// 	result["name"] = o.Name
// 	result["slug"] = o.Slug
// 	result["description"] = o.Description
// 	result["created_by"] = o.CreatedBy

// 	if o.Projects != nil {
// 		result["projects"] = o.Projects
// 	}

// 	if o.Members != nil {
// 		result["members"] = o.Members
// 	}

// 	return json.Marshal(result)
// }

// // Custom JSON marshaling for TeamMembership
// func (tm TeamMembership) MarshalJSON() ([]byte, error) {
// 	// Get the base model fields
// 	baseJSON, err := json.Marshal(tm.BaseModel)
// 	if err != nil {
// 		return nil, err
// 	}

// 	// Unmarshal into a map to combine with other fields
// 	var result map[string]interface{}
// 	if err := json.Unmarshal(baseJSON, &result); err != nil {
// 		return nil, err
// 	}

// 	// Add the fields
// 	result["organization_id"] = tm.OrganizationID
// 	result["user_id"] = tm.UserID
// 	result["role"] = tm.Role
// 	result["joined_at"] = tm.JoinedAt
// 	result["invited_by"] = tm.InvitedBy

// 	if tm.User != nil {
// 		result["user"] = tm.User
// 	}

// 	if tm.Organization != nil {
// 		result["organization"] = tm.Organization
// 	}

// 	return json.Marshal(result)
// }
