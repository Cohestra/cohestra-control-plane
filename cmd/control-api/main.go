package main

import (
	"context"
	"errors"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/flink-control-plane/fcp/control"
	"github.com/flink-control-plane/fcp/internal/api"
	"github.com/flink-control-plane/fcp/internal/config"
	"go.temporal.io/sdk/client"
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

	controlService := control.NewService(temporalClient, cfg.ActorTaskQueue, cfg.ActivityTaskQueue, cfg.ContinueAfter, cfg.ActorShards)
	server := &http.Server{
		Addr:              cfg.HTTPAddress,
		Handler:           api.New(controlService).Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		slog.Info("control API listening", "address", cfg.HTTPAddress)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("control API failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		slog.Error("control API shutdown failed", "error", err)
	}
}
