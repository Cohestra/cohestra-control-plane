# Local end-to-end environment

Spins up a complete FCP stack on [kind](https://kind.sigs.k8s.io/) so you can drive
every control-plane workflow transition against a **real** Flink job:

- **Flink Kubernetes Operator 1.15** running **Flink 2.2** application deployments
- **Strimzi Kafka** (single-node KRaft) fed by the **Wikimedia EventStreams** producer
- the **FCP control plane** (control-api + the real Kubernetes backend worker), with a
  **bundled Temporal** for convenience

```
 Wikimedia EventStreams ──► producer ──► Kafka (topic: wikimedia.recentchange)
                                                     │
 FCP control-api ──► Temporal ──► FCP worker ──► FlinkDeployment CR ──► Flink 2.2 job ──┘
        ▲                                          (Flink Operator 1.15)
        └── examples/demo/run.sh drives deploy / savepoint / scale / suspend / resume /
            autoscaler / rollback / freeze / continue-as-new
```

## Prerequisites

`docker`, `kind`, `kubectl`, `helm`, plus `curl` and `jq` for the demo.

## Bring it up

```bash
cd deploy/local
make up      # idempotent: registry, cluster, cert-manager, operator, Kafka, images, FCP, producer
```

`make up` builds and pushes four images to a local registry (`localhost:5001`) so the
control plane can reference the job image **by digest**, which it requires.

## Run the demo

```bash
make demo    # or: ../../examples/demo/run.sh
```

The control-api is reachable at `http://localhost:8080` (NodePort `30080`). The demo
asserts actor state and real `FlinkDeployment` status after each transition, including a
forced health-gate **rollback** (it deploys a deliberately broken image digest) and a
cluster **freeze** that rejects mutations with HTTP 409.

## Inspect

```bash
kubectl -n streaming get flinkdeployment
kubectl -n streaming logs deploy/wikimedia-producer
kubectl -n fcp-system get pods
# Temporal UI (bundled): kubectl -n fcp-system port-forward svc/fcp-temporal-web 8088:8080
```

## Tear down

```bash
make down
```

## Notes / version pins

- Operator version: `FLINK_OPERATOR_VERSION` (default `1.15.0`). Confirm the chart advertises
  Flink 2.2 support; adjust the job image base (`flink:2.2`) and `flinkVersion` mapping if needed.
- Strimzi: `STRIMZI_VERSION` (default `0.46.0`, KRaft + KafkaNodePool).
- The job's `flink-connector-kafka` version in `examples/flink-job/pom.xml` may need to match
  your Flink 2.2 build (`kafka.connector.version`).
