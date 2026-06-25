package domain

import (
	"fmt"
	"time"
)

const (
	ClusterCommandSignal = "cluster-command"
	ClusterQueryName     = "describe"
)

type ClusterCommandType string

const (
	ClusterFreeze   ClusterCommandType = "Freeze"
	ClusterUnfreeze ClusterCommandType = "Unfreeze"
)

type ClusterCommand struct {
	Type      ClusterCommandType `json:"type"`
	Requester string             `json:"requester"`
	Reason    string             `json:"reason"`
	At        time.Time          `json:"at"`
}

type ClusterActorState struct {
	Environment string    `json:"environment"`
	Namespace   string    `json:"namespace"`
	Frozen      bool      `json:"frozen"`
	Reason      string    `json:"reason,omitempty"`
	Requester   string    `json:"requester,omitempty"`
	UpdatedAt   time.Time `json:"updatedAt,omitempty"`
}

func (s ClusterActorState) WorkflowID() string {
	return "flink-cluster/" + s.Environment + "/" + s.Namespace
}

type ClusterFrozenError struct {
	Requester string
	Reason    string
}

func (e *ClusterFrozenError) Error() string {
	return fmt.Sprintf("cluster is frozen by %s: %s", e.Requester, e.Reason)
}
