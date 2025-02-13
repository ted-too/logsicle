package models

import (
	"database/sql"
	"encoding/json"
	"time"

	validation "github.com/go-ozzo/ozzo-validation"
	"github.com/sumup/typeid"
)

// Event logs (high-level business events)

type ChannelRelation struct {
	Name  string  `json:"name"`
	Color *string `json:"color"`
}

type EventLogID = typeid.Sortable[EventLogPrefix]
type EventLogPrefix struct{}

func (EventLogPrefix) Prefix() string { return "evt" }

type EventLog struct {
	ID          string           `json:"id,omitempty"`
	ProjectID   string           `json:"project_id"`
	ChannelID   sql.NullString   `json:"channel_id"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Parser      string           `json:"parser,omitempty"`
	Metadata    JSONB            `json:"metadata,omitempty"`
	Tags        JSONB            `json:"tags,omitempty"`
	Timestamp   time.Time        `json:"timestamp"`
	Channel     *ChannelRelation `json:"channel"`
}

func (l *EventLog) GetLogType() string {
	return "event"
}

func (l *EventLog) GetProjectID() string {
	return l.ProjectID
}

func (l EventLog) MarshalJSON() ([]byte, error) {
	type Alias EventLog // Prevent recursive MarshalJSON calls

	clean := struct {
		*Alias
		ChannelID *string `json:"channel_id"`
	}{
		Alias:     (*Alias)(&l),
		ChannelID: nil,
	}

	if l.ChannelID.Valid {
		clean.ChannelID = &l.ChannelID.String
	}

	return json.Marshal(clean)
}

func (l *EventLog) UnmarshalJSON(data []byte) error {
	type Alias EventLog // Prevent recursive UnmarshalJSON calls

	aux := struct {
		*Alias
		ChannelID *string `json:"channel_id"`
	}{
		Alias: (*Alias)(l),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Convert *string to sql.NullString
	if aux.ChannelID != nil {
		l.ChannelID = sql.NullString{
			String: *aux.ChannelID,
			Valid:  true,
		}
	} else {
		l.ChannelID = sql.NullString{
			Valid: false,
		}
	}

	return nil
}

type EventLogInput struct {
	ProjectID   string         `json:"project_id"`
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Parser      string         `json:"parser,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
	Tags        []string       `json:"tags,omitempty"`
}

// TODO: Allow timestamp to be part of input

func (e EventLogInput) ValidateAndCreate(channelIDInput string) (*EventLog, error) {
	if err := validation.ValidateStruct(&e,
		validation.Field(&e.ProjectID,
			validation.Required,
		),
		validation.Field(&e.Name,
			validation.Required,
			validation.Length(1, 255),
		),
		validation.Field(&e.Description,
			validation.Length(0, 1000),
		),
		validation.Field(&e.Parser,
			validation.In("text", "markdown"),
		),
		validation.Field(&e.Metadata),
		validation.Field(&e.Tags,
			validation.Each(validation.Length(1, 50)),
		),
	); err != nil {
		return nil, err
	}

	id, err := typeid.New[EventLogID]()
	if err != nil {
		return nil, err
	}

	var metadataJSON, tagsJSON JSONB
	if e.Metadata != nil {
		metadataJSON = ConvertToJSONB(e.Metadata)
	}
	if e.Tags != nil {
		tagsJSON = ConvertToJSONB(e.Tags)
	}

	var channelID sql.NullString
	if channelIDInput != "" {
		channelID = sql.NullString{
			String: channelIDInput,
			Valid:  true,
		}
	}

	return &EventLog{
		ID:          id.String(),
		ProjectID:   e.ProjectID,
		ChannelID:   channelID,
		Name:        e.Name,
		Description: e.Description,
		Parser:      e.Parser,
		Metadata:    metadataJSON,
		Tags:        tagsJSON,
		Timestamp:   time.Now(),
	}, nil
}
