package domain

import (
	"errors"
	"time"
)

var ErrInvalidDeploymentPageToken = errors.New("invalid deployment list page token")

type DeploymentListOptions struct {
	Environment string
	Namespace   string
	Limit       int
	PageToken   string
}

type DeploymentSummary struct {
	Identity   DeploymentIdentity `json:"identity"`
	WorkflowID string             `json:"workflowId"`
	StartedAt  time.Time          `json:"startedAt,omitempty"`
}

type DeploymentList struct {
	Deployments   []DeploymentSummary `json:"deployments"`
	NextPageToken string              `json:"nextPageToken,omitempty"`
}
