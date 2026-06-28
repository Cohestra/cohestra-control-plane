package io.fcp.sdk;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * Java client for the Flink Control Plane REST API.
 * Uses java.net.http.HttpClient — zero external dependencies.
 *
 * <pre>{@code
 * var fcp = new FCPClient("http://localhost:8080");
 * var dep = fcp.deployment("prod", "jobs", "my-pipeline");
 * dep.register();
 * dep.deploy("ci-bot", spec, true, false, "release v42");
 * dep.waitHealthy(Duration.ofMinutes(5));
 * }</pre>
 */
public final class FCPClient implements AutoCloseable {
    private final String baseUrl;
    private final HttpClient http;
    private final String authToken; // nullable; sent as Bearer if set

    public FCPClient(String baseUrl) {
        this(baseUrl, null);
    }

    public FCPClient(String baseUrl, String authToken) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.authToken = authToken;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /** Get a handle to a specific deployment. */
    public Deployment deployment(String env, String namespace, String name) {
        return new Deployment(this, env, namespace, name);
    }

    // ── Global queries ──

    /** List deployments with optional filters. */
    public FCPResponse listDeployments() {
        return listDeployments(null, null, 0, null);
    }

    public FCPResponse listDeployments(String environment, String namespace, int limit, String pageToken) {
        var sb = new StringBuilder("/api/v1/deployments");
        char sep = '?';
        if (environment != null && !environment.isBlank()) { sb.append(sep).append("environment=").append(encode(environment)); sep = '&'; }
        if (namespace != null && !namespace.isBlank()) { sb.append(sep).append("namespace=").append(encode(namespace)); sep = '&'; }
        if (limit > 0) { sb.append(sep).append("limit=").append(limit); sep = '&'; }
        if (pageToken != null && !pageToken.isBlank()) { sb.append(sep).append("pageToken=").append(encode(pageToken)); }
        return get(sb.toString());
    }

    /** Dashboard summary cards for all deployments. */
    public FCPResponse summary() {
        return get("/api/v1/deployments/summary");
    }

    // ── Cluster operations ──

    /** Freeze a cluster namespace. */
    public FCPResponse clusterFreeze(String env, String namespace, String requester, String reason) {
        return postWithKey("/api/v1/clusters/%s/%s/freeze".formatted(env, namespace),
                Json.object("requester", requester, "reason", reason));
    }

    /** Unfreeze a cluster namespace. */
    public FCPResponse clusterUnfreeze(String env, String namespace, String requester, String reason) {
        return postWithKey("/api/v1/clusters/%s/%s/unfreeze".formatted(env, namespace),
                Json.object("requester", requester, "reason", reason));
    }

    // ── Health check ──

    public FCPResponse healthz() {
        return get("/healthz");
    }

    // ── HTTP plumbing (package-private for Deployment) ──

    FCPResponse get(String path) {
        return execute(requestBuilder(path).GET().build());
    }

    FCPResponse put(String path, String jsonBody) {
        return execute(requestBuilder(path)
                .PUT(HttpRequest.BodyPublishers.ofString(jsonBody))
                .header("Content-Type", "application/json")
                .build());
    }

    /** POST with auto-generated Idempotency-Key. */
    FCPResponse postWithKey(String path, String jsonBody) {
        return execute(requestBuilder(path)
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .build());
    }

    private HttpRequest.Builder requestBuilder(String path) {
        var builder = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .timeout(Duration.ofSeconds(30));
        if (authToken != null && !authToken.isBlank()) {
            builder.header("Authorization", "Bearer " + authToken);
        }
        return builder;
    }

    private FCPResponse execute(HttpRequest request) {
        try {
            HttpResponse<String> resp = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 400) {
                throw new FCPException(resp.statusCode(), resp.body());
            }
            return new FCPResponse(resp.statusCode(), resp.body());
        } catch (FCPException e) {
            throw e;
        } catch (IOException e) {
            throw new FCPException(0, "connection failed: " + e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new FCPException(0, "request interrupted");
        }
    }

    private static String encode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    @Override
    public void close() {
        // HttpClient doesn't need explicit close in Java 17; here for AutoCloseable contract
    }
}
