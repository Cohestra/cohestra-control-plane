package io.fcp.sdk;

import java.time.Duration;
import java.util.Map;

/**
 * Handle to a specific deployment ({env}/{ns}/{name}).
 * All mutation methods auto-generate an Idempotency-Key and return the parsed response.
 */
public final class Deployment {
    private final FCPClient client;
    private final String env;
    private final String namespace;
    private final String name;

    Deployment(FCPClient client, String env, String namespace, String name) {
        this.client = client;
        this.env = env;
        this.namespace = namespace;
        this.name = name;
    }

    public String env() { return env; }
    public String namespace() { return namespace; }
    public String name() { return name; }

    private String basePath() {
        return "/api/v1/deployments/%s/%s/%s".formatted(env, namespace, name);
    }

    // ── Queries ──

    /** Get actor state. */
    public FCPResponse actor() {
        return client.get(basePath() + "/actor");
    }

    /** Get version history. */
    public FCPResponse versions() {
        return client.get(basePath() + "/versions");
    }

    // ── Mutations ──

    /** Register this deployment (PUT). */
    public FCPResponse register() {
        return register(null, null, null, null);
    }

    public FCPResponse register(String owner, String serviceAccount, String nodePool, String flinkDashboardUrl) {
        String body = Json.object(
                "owner", owner,
                "serviceAccount", serviceAccount,
                "nodePool", nodePool,
                "flinkDashboardUrl", flinkDashboardUrl
        );
        return client.put(basePath(), body);
    }

    /** Deploy a new version. */
    public FCPResponse deploy(String requester, DeploymentSpec spec, boolean approved, boolean incident, String reason) {
        String body = Json.object(
                "requester", requester,
                "approved", approved,
                "incident", incident,
                "reason", reason,
                "spec", spec.toJson() // raw JSON, embedded directly
        );
        // spec.toJson() returns a JSON object string; we need to splice it unquoted.
        // Rebuild manually to avoid double-quoting:
        var sb = new StringBuilder(512);
        sb.append("{");
        Json.field(sb, "requester", requester);
        Json.field(sb, "approved", approved);
        Json.field(sb, "incident", incident);
        Json.field(sb, "reason", reason);
        sb.append("\"spec\":").append(spec.toJson());
        sb.append("}");
        return client.postWithKey(basePath() + "/deploy", sb.toString());
    }

    /** Scale to a new parallelism. */
    public FCPResponse scale(String requester, int parallelism, boolean approved, String reason) {
        return client.postWithKey(basePath() + "/scale", Json.object(
                "requester", requester,
                "parallelism", parallelism,
                "approved", approved,
                "reason", reason
        ));
    }

    /** Request a savepoint. */
    public FCPResponse savepoint(String requester) {
        return client.postWithKey(basePath() + "/savepoint", Json.object("requester", requester));
    }

    /** Suspend the deployment. */
    public FCPResponse suspend(String requester, String reason) {
        return client.postWithKey(basePath() + "/suspend", Json.object("requester", requester, "reason", reason));
    }

    /** Resume the deployment. */
    public FCPResponse resume(String requester) {
        return client.postWithKey(basePath() + "/resume", Json.object("requester", requester));
    }

    /** Rollback to a specific version. */
    public FCPResponse rollback(String requester, long targetVersion, boolean approved, String reason) {
        return client.postWithKey(basePath() + "/rollback", Json.object(
                "requester", requester,
                "targetVersion", targetVersion,
                "approved", approved,
                "reason", reason
        ));
    }

    /** Enable the autoscaler. */
    public FCPResponse enableAutoscaler(String requester) {
        return client.postWithKey(basePath() + "/autoscaler/enable", Json.object("requester", requester));
    }

    /** Freeze the autoscaler. */
    public FCPResponse freezeAutoscaler(String requester) {
        return client.postWithKey(basePath() + "/autoscaler/freeze", Json.object("requester", requester));
    }

    /**
     * Poll the actor endpoint until status is IDLE and the current version is healthy,
     * or until timeout expires.
     * @throws FCPException if the deployment enters FAILED state
     * @throws java.util.concurrent.TimeoutException if timeout is exceeded
     */
    public FCPResponse waitHealthy(Duration timeout) throws Exception {
        long deadline = System.currentTimeMillis() + timeout.toMillis();
        // ponytail: linear 2s poll; exponential backoff if this hits real traffic
        while (System.currentTimeMillis() < deadline) {
            FCPResponse resp = actor();
            String status = resp.getString("status");
            if ("FAILED".equals(status)) {
                throw new FCPException(200, "deployment in FAILED state: " + resp.getString("lastError"));
            }
            Map<String, Object> cv = resp.getObject("currentVersion");
            if ("IDLE".equals(status) && cv != null) {
                @SuppressWarnings("unchecked")
                var health = (Map<String, Object>) cv.get("healthSummary");
                if (health != null && Boolean.TRUE.equals(health.get("healthy"))) {
                    return resp;
                }
            }
            Thread.sleep(2000);
        }
        throw new java.util.concurrent.TimeoutException(
                "deployment %s/%s/%s did not become healthy within %s".formatted(env, namespace, name, timeout));
    }
}
