package control

import (
	"context"
	"errors"
	"fmt"

	"github.com/flink-control-plane/fcp"
	"github.com/flink-control-plane/fcp/domain"
	"github.com/flink-control-plane/fcp/workflows"
	"go.temporal.io/api/serviceerror"
	"go.temporal.io/sdk/client"
)

type Service struct {
	client            client.Client
	actorTaskQueue    string
	actorShards       int
	activityTaskQueue string
	continueAfter     int
}

func NewService(temporalClient client.Client, actorTaskQueue, activityTaskQueue string, continueAfter, actorShards int) *Service {
	if actorShards < 1 {
		actorShards = 1
	}
	return &Service{
		client:            temporalClient,
		actorTaskQueue:    actorTaskQueue,
		actorShards:       actorShards,
		activityTaskQueue: activityTaskQueue,
		continueAfter:     continueAfter,
	}
}

// actorQueueFor returns the sharded actor task queue that owns a workflow ID.
func (s *Service) actorQueueFor(workflowID string) string {
	return fcp.ShardTaskQueue(s.actorTaskQueue, s.actorShards, workflowID)
}

func (s *Service) EnsureDeploymentActor(ctx context.Context, identity domain.DeploymentIdentity, policy *domain.Policy) error {
	if err := s.EnsureClusterActor(ctx, identity.Environment, identity.Namespace); err != nil {
		return err
	}
	selectedPolicy := domain.DefaultPolicy(identity.Environment)
	if policy != nil {
		selectedPolicy = *policy
	}
	_, err := s.client.ExecuteWorkflow(ctx, client.StartWorkflowOptions{
		ID:                    identity.WorkflowID(),
		TaskQueue:             s.actorQueueFor(identity.WorkflowID()),
		WorkflowIDReusePolicy: 1,
	}, workflows.DeploymentActorWorkflow, workflows.DeploymentActorInput{
		State: domain.DeploymentActorState{
			SchemaVersion: 1,
			Identity:      identity,
			Policy:        selectedPolicy,
			Status:        domain.ActorIdle,
			ProcessedKeys: make(map[string]string),
			ContinueAfter: s.continueAfter,
		},
		ActivityTaskQueue: s.activityTaskQueue,
	})
	if err == nil {
		return nil
	}
	var alreadyStarted *serviceerror.WorkflowExecutionAlreadyStarted
	if errors.As(err, &alreadyStarted) {
		return nil
	}
	return fmt.Errorf("start deployment actor: %w", err)
}

func (s *Service) SendCommand(ctx context.Context, identity domain.DeploymentIdentity, command domain.DeploymentCommand) error {
	if err := s.EnsureDeploymentActor(ctx, identity, nil); err != nil {
		return err
	}
	cluster, err := s.DescribeCluster(ctx, identity.Environment, identity.Namespace)
	if err != nil {
		return err
	}
	if cluster.Frozen && mutatesRuntime(command.Type) {
		return &domain.ClusterFrozenError{Requester: cluster.Requester, Reason: cluster.Reason}
	}
	if err := s.client.SignalWorkflow(ctx, identity.WorkflowID(), "", workflows.DeploymentSignalName, command); err != nil {
		return fmt.Errorf("signal deployment actor: %w", err)
	}
	return nil
}

func (s *Service) EnsureClusterActor(ctx context.Context, environment, namespace string) error {
	state := domain.ClusterActorState{Environment: environment, Namespace: namespace}
	_, err := s.client.ExecuteWorkflow(ctx, client.StartWorkflowOptions{
		ID:                    state.WorkflowID(),
		TaskQueue:             s.actorQueueFor(state.WorkflowID()),
		WorkflowIDReusePolicy: 1,
	}, workflows.ClusterActorWorkflow, state)
	if err == nil {
		return nil
	}
	var alreadyStarted *serviceerror.WorkflowExecutionAlreadyStarted
	if errors.As(err, &alreadyStarted) {
		return nil
	}
	return fmt.Errorf("start cluster actor: %w", err)
}

func (s *Service) SetClusterFreeze(ctx context.Context, environment, namespace string, command domain.ClusterCommand) error {
	if err := s.EnsureClusterActor(ctx, environment, namespace); err != nil {
		return err
	}
	state := domain.ClusterActorState{Environment: environment, Namespace: namespace}
	if err := s.client.SignalWorkflow(ctx, state.WorkflowID(), "", domain.ClusterCommandSignal, command); err != nil {
		return fmt.Errorf("signal cluster actor: %w", err)
	}
	return nil
}

func (s *Service) DescribeCluster(ctx context.Context, environment, namespace string) (domain.ClusterActorState, error) {
	state := domain.ClusterActorState{Environment: environment, Namespace: namespace}
	response, err := s.client.QueryWorkflow(ctx, state.WorkflowID(), "", domain.ClusterQueryName)
	if err != nil {
		return domain.ClusterActorState{}, fmt.Errorf("query cluster actor: %w", err)
	}
	if err := response.Get(&state); err != nil {
		return domain.ClusterActorState{}, fmt.Errorf("decode cluster actor: %w", err)
	}
	return state, nil
}

func (s *Service) Describe(ctx context.Context, identity domain.DeploymentIdentity) (domain.DeploymentActorView, error) {
	response, err := s.client.QueryWorkflow(ctx, identity.WorkflowID(), "", workflows.DeploymentQueryName)
	if err != nil {
		return domain.DeploymentActorView{}, fmt.Errorf("query deployment actor: %w", err)
	}
	var view domain.DeploymentActorView
	if err := response.Get(&view); err != nil {
		return domain.DeploymentActorView{}, fmt.Errorf("decode deployment actor view: %w", err)
	}
	return view, nil
}

func (s *Service) Versions(ctx context.Context, identity domain.DeploymentIdentity) ([]domain.DeploymentVersion, error) {
	response, err := s.client.QueryWorkflow(ctx, identity.WorkflowID(), "", workflows.VersionsQueryName)
	if err != nil {
		return nil, fmt.Errorf("query versions: %w", err)
	}
	var versions []domain.DeploymentVersion
	if err := response.Get(&versions); err != nil {
		return nil, fmt.Errorf("decode versions: %w", err)
	}
	return versions, nil
}

func mutatesRuntime(commandType domain.CommandType) bool {
	switch commandType {
	case domain.CommandRequestSavepoint, domain.CommandContinueAsNew:
		return false
	default:
		return true
	}
}
