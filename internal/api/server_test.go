package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/flink-control-plane/fcp/domain"
)

type fakeControl struct {
	command domain.DeploymentCommand
}

func (f *fakeControl) EnsureDeploymentActor(context.Context, domain.DeploymentIdentity, *domain.Policy) error {
	return nil
}

func (f *fakeControl) SendCommand(_ context.Context, _ domain.DeploymentIdentity, command domain.DeploymentCommand) error {
	f.command = command
	return nil
}

func (f *fakeControl) Describe(context.Context, domain.DeploymentIdentity) (domain.DeploymentActorView, error) {
	return domain.DeploymentActorView{Status: domain.ActorIdle}, nil
}

func (f *fakeControl) Versions(context.Context, domain.DeploymentIdentity) ([]domain.DeploymentVersion, error) {
	return nil, nil
}

func (f *fakeControl) SetClusterFreeze(context.Context, string, string, domain.ClusterCommand) error {
	return nil
}

func (f *fakeControl) DescribeCluster(_ context.Context, environment, namespace string) (domain.ClusterActorState, error) {
	return domain.ClusterActorState{Environment: environment, Namespace: namespace}, nil
}

func TestDeployRequiresIdempotencyKey(t *testing.T) {
	control := &fakeControl{}
	server := New(control).Handler()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/deployments/prod/streaming/orders/deploy",
		strings.NewReader(`{"spec":{"imageDigest":"registry/orders@sha256:abc","flinkVersion":"2.2","parallelism":1,"maxParallelism":128}}`))
	response := httptest.NewRecorder()

	server.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", response.Code)
	}
}

func TestDeploySignalsCommand(t *testing.T) {
	control := &fakeControl{}
	server := New(control).Handler()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/deployments/prod/streaming/orders/deploy",
		strings.NewReader(`{"requester":"on-call","approved":true,"spec":{"imageDigest":"registry/orders@sha256:abc","flinkVersion":"2.2","parallelism":1,"maxParallelism":128}}`))
	request.Header.Set("Idempotency-Key", "deploy-123")
	response := httptest.NewRecorder()

	server.ServeHTTP(response, request)

	if response.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", response.Code, response.Body.String())
	}
	if control.command.IdempotencyKey != "deploy-123" || control.command.Type != domain.CommandDeployVersion {
		t.Fatalf("unexpected command: %+v", control.command)
	}
}
