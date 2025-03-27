package models

import "github.com/sumup/typeid"

// User prefix for TypeID
type UserPrefix struct{}

func (UserPrefix) Prefix() string { return "user" }

type UserID = typeid.Sortable[UserPrefix]

// Organization prefix for TypeID
type OrganizationPrefix struct{}

func (OrganizationPrefix) Prefix() string { return "org" }

type OrganizationID = typeid.Sortable[OrganizationPrefix]

// Project prefix for TypeID
type ProjectPrefix struct{}

func (ProjectPrefix) Prefix() string { return "proj" }

type ProjectID = typeid.Sortable[ProjectPrefix]

// Session prefix for TypeID
type SessionPrefix struct{}

func (SessionPrefix) Prefix() string { return "sess" }

type SessionID = typeid.Sortable[SessionPrefix]

// Account prefix for TypeID
type AccountPrefix struct{}

func (AccountPrefix) Prefix() string { return "acc" }

type AccountID = typeid.Sortable[AccountPrefix]

// Verification prefix for TypeID
type VerificationPrefix struct{}

func (VerificationPrefix) Prefix() string { return "ver" }

type VerificationID = typeid.Sortable[VerificationPrefix]

// APIKey prefix for TypeID
type APIKeyPrefix struct{}

func (APIKeyPrefix) Prefix() string { return "key" }

type APIKeyID = typeid.Sortable[APIKeyPrefix]

// TeamMembership prefix for TypeID
type TeamMembershipPrefix struct{}

func (TeamMembershipPrefix) Prefix() string { return "mem" }

type TeamMembershipID = typeid.Sortable[TeamMembershipPrefix]

// EventChannel prefix for TypeID
type EventChannelPrefix struct{}

func (EventChannelPrefix) Prefix() string { return "evch" }

type EventChannelID = typeid.Sortable[EventChannelPrefix]

// Invitation prefix for TypeID
type InvitationPrefix struct{}

func (InvitationPrefix) Prefix() string { return "inv" }

type InvitationID = typeid.Sortable[InvitationPrefix]
