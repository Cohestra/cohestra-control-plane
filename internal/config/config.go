package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	TemporalAddress   string
	TemporalNamespace string
	ActorTaskQueue    string
	ActorShards       int
	ActivityTaskQueue string
	HTTPAddress       string
	SimulationDelay   time.Duration
	ContinueAfter     int
}

func Load() Config {
	return Config{
		TemporalAddress:   env("TEMPORAL_ADDRESS", "localhost:7233"),
		TemporalNamespace: env("TEMPORAL_NAMESPACE", "default"),
		ActorTaskQueue:    env("ACTOR_TASK_QUEUE", "flink-control-actors"),
		ActorShards:       intEnv("ACTOR_TASK_QUEUE_SHARDS", 1),
		ActivityTaskQueue: env("ACTIVITY_TASK_QUEUE", "flink-control-activities"),
		HTTPAddress:       env("HTTP_ADDRESS", ":8080"),
		SimulationDelay:   durationEnv("SIMULATION_DELAY", 100*time.Millisecond),
		ContinueAfter:     intEnv("CONTINUE_AS_NEW_AFTER", 500),
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func intEnv(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
