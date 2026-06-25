package main

import (
	"log"
	"log/slog"
	"os"

	"github.com/flink-control-plane/fcp"
	"github.com/flink-control-plane/fcp/activities"
	"github.com/flink-control-plane/fcp/internal/config"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

func main() {
	cfg := config.Load()
	temporalClient, err := client.Dial(client.Options{
		HostPort:  cfg.TemporalAddress,
		Namespace: cfg.TemporalNamespace,
	})
	if err != nil {
		log.Fatal(err)
	}
	defer temporalClient.Close()

	simulated := activities.NewSimulated(cfg.SimulationDelay)
	activityWorker := worker.New(temporalClient, cfg.ActivityTaskQueue, worker.Options{})
	fcp.RegisterActivities(activityWorker, simulated)
	if err := activityWorker.Start(); err != nil {
		log.Fatal(err)
	}
	defer activityWorker.Stop()

	// Start one actor worker per shard task queue.
	actorQueues := fcp.ActorTaskQueues(cfg.ActorTaskQueue, cfg.ActorShards)
	for _, queue := range actorQueues[1:] {
		actorWorker := worker.New(temporalClient, queue, worker.Options{})
		fcp.RegisterWorkflows(actorWorker)
		if err := actorWorker.Start(); err != nil {
			log.Fatal(err)
		}
		defer actorWorker.Stop()
	}

	primary := worker.New(temporalClient, actorQueues[0], worker.Options{})
	fcp.RegisterWorkflows(primary)

	slog.Info("Temporal workers started",
		"actorTaskQueues", actorQueues,
		"activityTaskQueue", cfg.ActivityTaskQueue,
	)
	if err := primary.Run(worker.InterruptCh()); err != nil {
		slog.Error("worker stopped", "error", err)
		os.Exit(1)
	}
}
