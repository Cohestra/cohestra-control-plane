package domain

import (
	"strings"
	"testing"
)

func TestClassifyChangeRejectsMaxParallelismDecrease(t *testing.T) {
	current := BuildVersion(1, validSpec())
	target := validSpec()
	target.MaxParallelism = current.Spec.MaxParallelism / 2

	result := ClassifyChange(&current, target, DefaultPolicy("prod"))

	if result.Risk != RiskRejected {
		t.Fatalf("expected rejected risk, got %s", result.Risk)
	}
	if !strings.Contains(result.Reason, "max parallelism") {
		t.Fatalf("unexpected reason: %s", result.Reason)
	}
}

func TestClassifyChangeRequiresSavepointForStatefulArgs(t *testing.T) {
	current := BuildVersion(1, validSpec())
	target := validSpec()
	target.JobArgs = map[string]string{"topic": "new-topic"}

	result := ClassifyChange(&current, target, DefaultPolicy("prod"))

	if result.Risk != RiskStateful || !result.RequiresSavepoint || !result.RequiresApproval {
		t.Fatalf("unexpected classification: %+v", result)
	}
}

func TestEvaluateHealth(t *testing.T) {
	policy := DefaultPolicy("prod")
	healthy := HealthSummary{
		Running:             true,
		CheckpointCompleted: true,
		SinkHealthy:         true,
	}
	if err := EvaluateHealth(healthy, policy); err != nil {
		t.Fatalf("expected healthy result: %v", err)
	}

	healthy.CheckpointCompleted = false
	if err := EvaluateHealth(healthy, policy); err == nil {
		t.Fatal("expected missing checkpoint to fail")
	}
}

func validSpec() DeploymentSpec {
	return DeploymentSpec{
		ImageDigest:    "registry/job@sha256:abc123",
		FlinkVersion:   "2.2",
		JobArgs:        map[string]string{"topic": "events"},
		FlinkConfig:    map[string]string{"state.backend.type": "rocksdb"},
		Parallelism:    8,
		MaxParallelism: 128,
		Resources: ResourceShape{
			TaskManagerCPU:    2,
			TaskManagerMemory: 4096,
			TaskManagerCount:  2,
			SlotsPerManager:   4,
		},
		State: StateCompatibility{
			JobGraphCompatible: true,
			OperatorUIDsStable: true,
		},
	}
}
