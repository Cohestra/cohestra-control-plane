package domain

import "time"

type CommandType string

const (
	CommandDeployVersion    CommandType = "DeployVersion"
	CommandRequestSavepoint CommandType = "RequestSavepoint"
	CommandSuspend          CommandType = "Suspend"
	CommandResume           CommandType = "Resume"
	CommandRollback         CommandType = "RollbackToVersion"
	CommandScaleTo          CommandType = "ScaleTo"
	CommandEnableAutoscaler CommandType = "EnableAutoscaler"
	CommandFreezeAutoscaler CommandType = "FreezeAutoscaler"
	CommandContinueAsNew    CommandType = "ContinueAsNew"
)

type DeploymentCommand struct {
	OperationID    string          `json:"operationId"`
	IdempotencyKey string          `json:"idempotencyKey"`
	Type           CommandType     `json:"type"`
	Requester      string          `json:"requester"`
	RequestedAt    time.Time       `json:"requestedAt"`
	TargetSpec     *DeploymentSpec `json:"targetSpec,omitempty"`
	TargetVersion  int64           `json:"targetVersion,omitempty"`
	Parallelism    int             `json:"parallelism,omitempty"`
	Approved       bool            `json:"approved,omitempty"`
	Incident       bool            `json:"incident,omitempty"`
	Reason         string          `json:"reason,omitempty"`
}

type OperationStatus string

const (
	OperationQueued    OperationStatus = "QUEUED"
	OperationRunning   OperationStatus = "RUNNING"
	OperationSucceeded OperationStatus = "SUCCEEDED"
	OperationFailed    OperationStatus = "FAILED"
	OperationRejected  OperationStatus = "REJECTED"
)

type OperationRecord struct {
	OperationID     string          `json:"operationId"`
	IdempotencyKey  string          `json:"idempotencyKey"`
	Requester       string          `json:"requester"`
	CommandType     CommandType     `json:"commandType"`
	Status          OperationStatus `json:"status"`
	ChildWorkflowID string          `json:"childWorkflowId,omitempty"`
	LeaseID         string          `json:"leaseId,omitempty"`
	Result          string          `json:"result,omitempty"`
	StartedAt       time.Time       `json:"startedAt,omitempty"`
	CompletedAt     time.Time       `json:"completedAt,omitempty"`
}

type ActorStatus string

const (
	ActorIdle      ActorStatus = "IDLE"
	ActorOperating ActorStatus = "OPERATING"
	ActorFailed    ActorStatus = "FAILED"
	ActorSuspended ActorStatus = "SUSPENDED"
)

type DeploymentActorState struct {
	SchemaVersion       int                 `json:"schemaVersion"`
	Identity            DeploymentIdentity  `json:"identity"`
	Policy              Policy              `json:"policy"`
	Status              ActorStatus         `json:"status"`
	CurrentVersion      *DeploymentVersion  `json:"currentVersion,omitempty"`
	LastHealthyVersion  *DeploymentVersion  `json:"lastHealthyVersion,omitempty"`
	Versions            []DeploymentVersion `json:"versions,omitempty"`
	LastSavepoint       *SavepointRecord    `json:"lastSavepoint,omitempty"`
	Operations          []OperationRecord   `json:"operations,omitempty"`
	ProcessedKeys       map[string]string   `json:"processedKeys,omitempty"`
	Pending             []DeploymentCommand `json:"pending,omitempty"`
	ActiveOperation     *OperationRecord    `json:"activeOperation,omitempty"`
	AutoscalerFrozen    bool                `json:"autoscalerFrozen"`
	AutoscalerEnabled   bool                `json:"autoscalerEnabled"`
	LastError           string              `json:"lastError,omitempty"`
	ProcessedEventCount int                 `json:"processedEventCount"`
	ContinueAfter       int                 `json:"continueAfter"`
}

type DeploymentActorView struct {
	Identity           DeploymentIdentity `json:"identity"`
	Status             ActorStatus        `json:"status"`
	CurrentVersion     *DeploymentVersion `json:"currentVersion,omitempty"`
	LastHealthyVersion *DeploymentVersion `json:"lastHealthyVersion,omitempty"`
	LastSavepoint      *SavepointRecord   `json:"lastSavepoint,omitempty"`
	ActiveOperation    *OperationRecord   `json:"activeOperation,omitempty"`
	PendingOperations  int                `json:"pendingOperations"`
	RecentOperations   []OperationRecord  `json:"recentOperations,omitempty"`
	AutoscalerEnabled  bool               `json:"autoscalerEnabled"`
	AutoscalerFrozen   bool               `json:"autoscalerFrozen"`
	LastError          string             `json:"lastError,omitempty"`
}
