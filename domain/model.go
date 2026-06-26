package domain

import "time"

type DeploymentIdentity struct {
	Environment       string `json:"environment"`
	Namespace         string `json:"namespace"`
	Name              string `json:"name"`
	Owner             string `json:"owner,omitempty"`
	ServiceAccount    string `json:"serviceAccount,omitempty"`
	NodePool          string `json:"nodePool,omitempty"`
	FlinkDashboardURL string `json:"flinkDashboardUrl,omitempty"`
}

func (d DeploymentIdentity) WorkflowID() string {
	return "flink-deployment/" + d.Environment + "/" + d.Namespace + "/" + d.Name
}

func (d DeploymentIdentity) ClusterWorkflowID() string {
	return "flink-cluster/" + d.Environment + "/" + d.Namespace
}

func (d DeploymentIdentity) ResourceWorkflowID() string {
	return "flink-resource-pool/" + d.Environment + "/" + d.Namespace + "/" + d.NodePool
}

type ResourceShape struct {
	TaskManagerCPU    float64 `json:"taskManagerCpu"`
	TaskManagerMemory int64   `json:"taskManagerMemoryMiB"`
	TaskManagerCount  int     `json:"taskManagerCount"`
	SlotsPerManager   int     `json:"slotsPerManager"`
}

func (r ResourceShape) Slots() int {
	return r.TaskManagerCount * r.SlotsPerManager
}

type StateCompatibility struct {
	JobGraphCompatible bool `json:"jobGraphCompatible"`
	OperatorUIDsStable bool `json:"operatorUidsStable"`
	AllowNonRestored   bool `json:"allowNonRestored"`
	FreshStartApproved bool `json:"freshStartApproved"`
}

type DeploymentSpec struct {
	ImageDigest       string             `json:"imageDigest"`
	GitRef            string             `json:"gitRef,omitempty"`
	FlinkVersion      string             `json:"flinkVersion"`
	JobArgs           map[string]string  `json:"jobArgs,omitempty"`
	FlinkConfig       map[string]string  `json:"flinkConfig,omitempty"`
	Parallelism       int                `json:"parallelism"`
	MaxParallelism    int                `json:"maxParallelism"`
	Resources         ResourceShape      `json:"resources"`
	State             StateCompatibility `json:"stateCompatibility"`
	AutoscalerEnabled bool               `json:"autoscalerEnabled"`
}

type DeploymentVersion struct {
	VersionID                  int64          `json:"versionId"`
	Spec                       DeploymentSpec `json:"spec"`
	ManifestHash               string         `json:"manifestHash"`
	JobArgsHash                string         `json:"jobArgsHash"`
	FlinkConfigHash            string         `json:"flinkConfigHash"`
	SavepointURI               string         `json:"savepointUri,omitempty"`
	OperatorObservedGeneration int64          `json:"operatorObservedGeneration,omitempty"`
	HealthSummary              HealthSummary  `json:"healthSummary"`
	CreatedAt                  time.Time      `json:"createdAt"`
}

type SavepointRecord struct {
	URI                string    `json:"uri"`
	TriggerID          string    `json:"triggerId"`
	FlinkJobID         string    `json:"flinkJobId"`
	DeploymentVersion  int64     `json:"deploymentVersion"`
	ImageDigest        string    `json:"imageDigest"`
	JobArgsHash        string    `json:"jobArgsHash"`
	Parallelism        int       `json:"parallelism"`
	MaxParallelism     int       `json:"maxParallelism"`
	CompatibilityNotes string    `json:"compatibilityNotes,omitempty"`
	CreatedAt          time.Time `json:"createdAt"`
}

type HealthSummary struct {
	Healthy             bool      `json:"healthy"`
	Running             bool      `json:"running"`
	CheckpointCompleted bool      `json:"checkpointCompleted"`
	RestartCount        int       `json:"restartCount"`
	BackpressureRatio   float64   `json:"backpressureRatio"`
	KafkaLag            int64     `json:"kafkaLag"`
	SinkHealthy         bool      `json:"sinkHealthy"`
	Message             string    `json:"message,omitempty"`
	ObservedAt          time.Time `json:"observedAt"`
}

type Policy struct {
	RequireProdApproval      bool    `json:"requireProdApproval"`
	GitOpsOnly               bool    `json:"gitOpsOnly"`
	AllowIncidentDirectPatch bool    `json:"allowIncidentDirectPatch"`
	RequireRiskySavepoint    bool    `json:"requireRiskySavepoint"`
	RequireFirstCheckpoint   bool    `json:"requireFirstCheckpoint"`
	RequireHealthySink       bool    `json:"requireHealthySink"`
	MaxRestartCount          int     `json:"maxRestartCount"`
	MaxBackpressureRatio     float64 `json:"maxBackpressureRatio"`
	MaxKafkaLag              int64   `json:"maxKafkaLag"`
}

func DefaultPolicy(environment string) Policy {
	return Policy{
		RequireProdApproval:      environment == "prod",
		GitOpsOnly:               environment == "prod",
		AllowIncidentDirectPatch: true,
		RequireRiskySavepoint:    true,
		RequireFirstCheckpoint:   true,
		RequireHealthySink:       true,
		MaxRestartCount:          3,
		MaxBackpressureRatio:     0.75,
		MaxKafkaLag:              1_000_000,
	}
}

type Lease struct {
	ID            string    `json:"id"`
	NodePool      string    `json:"nodePool"`
	CPU           float64   `json:"cpu"`
	MemoryMiB     int64     `json:"memoryMiB"`
	Slots         int       `json:"slots"`
	OwnerWorkflow string    `json:"ownerWorkflow"`
	ExpiresAt     time.Time `json:"expiresAt"`
}
