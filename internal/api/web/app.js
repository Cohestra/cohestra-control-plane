const storageKey = "fcp.console.targets.v1";

const state = {
  targets: loadTargets(),
  targetFilter: "",
  activeTarget: null,
  actor: null,
  cluster: null,
  versions: [],
};

const elements = {
  targetList: document.querySelector("#target-list"),
  targetCount: document.querySelector("#target-count"),
  targetSearch: document.querySelector("#target-search"),
  breadcrumb: document.querySelector("#breadcrumb"),
  deploymentName: document.querySelector("#deployment-name"),
  workflowID: document.querySelector("#workflow-id"),
  flinkDashboardLink: document.querySelector("#flink-dashboard-link"),
  actorStatus: document.querySelector("#actor-status"),
  lastUpdated: document.querySelector("#last-updated"),
  flash: document.querySelector("#flash"),
  operationList: document.querySelector("#operation-list"),
  healthGrid: document.querySelector("#health-grid"),
  clusterStatus: document.querySelector("#cluster-status"),
  clusterDetail: document.querySelector("#cluster-detail"),
  versionsTable: document.querySelector("#versions-table"),
  targetDialog: document.querySelector("#target-dialog"),
  actionDialog: document.querySelector("#action-dialog"),
};

function loadTargets() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function saveTargets() {
  localStorage.setItem(storageKey, JSON.stringify(state.targets));
}

function matchesTargetFilter(target, filterValue) {
  if (!filterValue) return true;
  const haystack = [
    target.name,
    target.environment,
    target.namespace,
    target.owner,
    target.serviceAccount,
    target.nodePool,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(filterValue);
}

async function loadDeploymentInventory(optimisticTargets = []) {
  const localTargets = loadTargets();
  const localByKey = new Map(localTargets.map((target) => [targetKey(target), target]));
  const deployments = [];
  let pageToken = "";

  try {
    do {
      const query = new URLSearchParams({ limit: "500" });
      if (pageToken) query.set("pageToken", pageToken);
      const page = await request(`/api/v1/deployments?${query}`);
      deployments.push(...(page.deployments || []));
      pageToken = page.nextPageToken || "";
    } while (pageToken);

    state.targets = deployments.map(({ identity, startedAt }) => ({
      ...identity,
      startedAt,
      ...(localByKey.get(targetKey(identity)) || {}),
    }));
    for (const target of optimisticTargets) {
      if (!state.targets.some((item) => targetKey(item) === targetKey(target))) {
        state.targets.unshift(target);
      }
    }
    saveTargets();
    renderTargets();

    if (state.targets.length) {
      const selected = state.activeTarget
        ? state.targets.find((target) => targetKey(target) === targetKey(state.activeTarget))
        : state.targets[0];
      if (selected) activateTarget(selected);
    }
  } catch (error) {
    state.targets = localTargets;
    renderTargets();
    if (state.targets.length) activateTarget(state.targets[0]);
    flash(`Deployment inventory unavailable: ${error.message}`, "error");
  }
}

function targetKey(target) {
  return `${target.environment}/${target.namespace}/${target.name}`;
}

function apiPath(target, suffix = "") {
  const parts = [target.environment, target.namespace, target.name].map(encodeURIComponent);
  return `/api/v1/deployments/${parts.join("/")}${suffix}`;
}

function clusterPath(target, suffix) {
  return `/api/v1/clusters/${encodeURIComponent(target.environment)}/${encodeURIComponent(target.namespace)}${suffix}`;
}

function generatedKey(prefix) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${crypto.randomUUID().slice(0, 8)}`;
}

function parsePairs(value) {
  return value.split("\n").reduce((result, line) => {
    const trimmed = line.trim();
    if (!trimmed) return result;
    const separator = trimmed.indexOf("=");
    if (separator < 1) throw new Error(`Expected key=value, received "${trimmed}"`);
    result[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
    return result;
  }, {});
}

function shortDigest(value = "") {
  if (!value) return "—";
  const digest = value.split("@").pop();
  return digest.length > 20 ? `${digest.slice(0, 17)}…` : digest;
}

function formatDate(value) {
  if (!value || value.startsWith("0001-")) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function dashboardURLFor(target, actor) {
  if (!target) return "";
  const configured = target.flinkDashboardUrl || actor?.identity?.flinkDashboardUrl;
  if (configured) return configured;
  if (!actor?.currentVersion) return "";
  return `http://localhost:8081/#/job/${encodeURIComponent(target.name)}`;
}

function statusTone(status) {
  if (["IDLE", "SUCCEEDED", "HEALTHY"].includes(status)) return "success";
  if (["FAILED", "REJECTED", "FROZEN"].includes(status)) return "danger";
  if (["OPERATING", "RUNNING", "QUEUED", "SUSPENDED"].includes(status)) return "warning";
  return "neutral";
}

function setBadge(element, text, tone = statusTone(text)) {
  element.textContent = text;
  element.className = `status-badge ${tone}`;
}

function flash(message, tone = "success") {
  elements.flash.textContent = message;
  elements.flash.className = `flash visible ${tone}`;
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => {
    elements.flash.className = "flash";
  }, 5000);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = { error: text }; }
  }
  if (!response.ok) {
    throw new Error(body?.error || `${response.status} ${response.statusText}`);
  }
  return body;
}

function renderTargets() {
  const filterValue = state.targetFilter.trim().toLowerCase();
  const visibleTargets = state.targets.filter((target) => matchesTargetFilter(target, filterValue));
  elements.targetCount.textContent = filterValue
    ? `${visibleTargets.length}/${state.targets.length}`
    : String(state.targets.length);
  if (!state.targets.length) {
    elements.targetList.innerHTML = '<div class="empty-state">No targets yet.</div>';
    return;
  }
  if (!visibleTargets.length) {
    elements.targetList.innerHTML = '<div class="empty-state">No targets match the current filter.</div>';
    return;
  }
  elements.targetList.innerHTML = visibleTargets.map((target) => `
    <button class="target ${state.activeTarget && targetKey(target) === targetKey(state.activeTarget) ? "active" : ""}"
      data-target="${targetKey(target)}">
      <strong>${escapeHTML(target.name)}</strong>
      <small>${escapeHTML(target.environment)} / ${escapeHTML(target.namespace)}</small>
      <div class="target-meta">
        <span>${target.owner ? escapeHTML(target.owner) : "Inventory"}</span>
        <time>${target.startedAt ? escapeHTML(formatDate(target.startedAt)) : "Local only"}</time>
      </div>
    </button>
  `).join("");
}

function renderActor() {
  const actor = state.actor;
  const target = state.activeTarget;
  const dashboardURL = dashboardURLFor(target, actor);
  elements.breadcrumb.textContent = target ? `${target.environment} / ${target.namespace}` : "Environment / namespace";
  elements.deploymentName.textContent = target?.name || "Select a deployment";
  elements.workflowID.textContent = target
    ? `flink-deployment/${target.environment}/${target.namespace}/${target.name}`
    : "Add or select a target to inspect its actor.";
  elements.flinkDashboardLink.href = dashboardURL || "#";
  elements.flinkDashboardLink.classList.toggle("disabled", !dashboardURL);
  elements.flinkDashboardLink.setAttribute("aria-disabled", dashboardURL ? "false" : "true");

  if (!actor) {
    setBadge(elements.actorStatus, "UNKNOWN", "neutral");
    ["version", "parallelism", "health", "pending"].forEach((name) => {
      document.querySelector(`#metric-${name}`).textContent = "—";
    });
    document.querySelector("#metric-image").textContent = "No version reported";
    document.querySelector("#metric-slots").textContent = "No resource shape";
    document.querySelector("#metric-health-detail").textContent = "Awaiting actor state";
    document.querySelector("#metric-autoscaler").textContent = "Autoscaler unknown";
    renderHealth(null);
    renderOperations([]);
    renderSavepoint(null);
    return;
  }

  setBadge(elements.actorStatus, actor.status || "UNKNOWN");
  const version = actor.currentVersion;
  document.querySelector("#metric-version").textContent = version ? `v${version.versionId}` : "None";
  document.querySelector("#metric-image").textContent = version ? shortDigest(version.spec.imageDigest) : "No active version";
  document.querySelector("#metric-parallelism").textContent = version?.spec.parallelism ?? "—";
  const resources = version?.spec.resources;
  document.querySelector("#metric-slots").textContent = resources
    ? `${resources.taskManagerCount || 0} managers · ${(resources.taskManagerCount || 0) * (resources.slotsPerManager || 0)} slots`
    : "No resource shape";
  document.querySelector("#metric-health").textContent = version?.healthSummary?.healthy ? "Healthy" : version ? "Degraded" : "—";
  document.querySelector("#metric-health-detail").textContent = version?.healthSummary?.message || "Latest health-gate result";
  document.querySelector("#metric-pending").textContent = actor.pendingOperations ?? 0;
  document.querySelector("#metric-autoscaler").textContent =
    `Autoscaler ${actor.autoscalerEnabled ? "enabled" : "disabled"}${actor.autoscalerFrozen ? " · frozen" : ""}`;

  renderHealth(version?.healthSummary);
  renderOperations(actor.recentOperations || []);
  renderSavepoint(actor.lastSavepoint);
}

function renderHealth(health) {
  const values = health ? [
    ["Running", health.running ? "PASS" : "FAIL", health.running],
    ["Checkpoint", health.checkpointCompleted ? "PASS" : "FAIL", health.checkpointCompleted],
    ["Sink", health.sinkHealthy ? "PASS" : "FAIL", health.sinkHealthy],
    ["Restarts", String(health.restartCount), health.restartCount <= 3],
    ["Backpressure", `${((health.backpressureRatio || 0) * 100).toFixed(1)}%`, health.backpressureRatio <= .75],
    ["Kafka lag", Number(health.kafkaLag || 0).toLocaleString(), true],
  ] : [
    ["Running", "—"], ["Checkpoint", "—"], ["Sink", "—"],
    ["Restarts", "—"], ["Backpressure", "—"], ["Kafka lag", "—"],
  ];
  elements.healthGrid.innerHTML = values.map(([label, value, good]) => `
    <div class="health-item">
      <span>${label}</span>
      <strong class="${good === undefined ? "" : good ? "good" : "bad"}">${value}</strong>
    </div>
  `).join("");
  setBadge(document.querySelector("#runtime-badge"), health ? (health.healthy ? "HEALTHY" : "DEGRADED") : "NO DATA");
}

function renderOperations(operations) {
  if (!operations.length) {
    elements.operationList.innerHTML = '<div class="empty-state">No recent operations reported.</div>';
    return;
  }
  elements.operationList.innerHTML = operations.map((operation) => `
    <div class="operation">
      <span class="operation-dot ${statusTone(operation.status)}"></span>
      <div class="operation-copy">
        <strong>${escapeHTML(operation.commandType || "Operation")}</strong>
        <small>${escapeHTML(operation.result || operation.operationId)}</small>
      </div>
      <span class="status-badge ${statusTone(operation.status)}">${escapeHTML(operation.status)}</span>
      <time>${formatDate(operation.completedAt || operation.startedAt)}</time>
    </div>
  `).join("");
}

function renderSavepoint(savepoint) {
  const card = document.querySelector("#savepoint-card");
  if (!savepoint) {
    card.innerHTML = "<strong>No savepoint</strong><p>The actor has not reported a savepoint.</p>";
    return;
  }
  card.innerHTML = `
    <strong>Version ${savepoint.deploymentVersion}</strong>
    <p>${formatDate(savepoint.createdAt)} · parallelism ${savepoint.parallelism}</p>
    <code>${escapeHTML(savepoint.uri)}</code>
  `;
}

function renderCluster() {
  const cluster = state.cluster;
  if (!cluster) {
    setBadge(elements.clusterStatus, "UNKNOWN", "neutral");
    elements.clusterDetail.textContent = "Load a target to inspect namespace mutation controls.";
    return;
  }
  setBadge(elements.clusterStatus, cluster.frozen ? "FROZEN" : "OPEN", cluster.frozen ? "danger" : "success");
  elements.clusterDetail.textContent = cluster.frozen
    ? `Frozen by ${cluster.requester || "unknown"}${cluster.reason ? `: ${cluster.reason}` : ""}`
    : "Runtime mutations are permitted for this namespace.";
}

function renderVersions() {
  if (!state.versions.length) {
    elements.versionsTable.innerHTML = '<tr><td colspan="6" class="empty-cell">No recorded versions.</td></tr>';
    return;
  }
  elements.versionsTable.innerHTML = state.versions.map((version) => `
    <tr>
      <td><strong>v${version.versionId}</strong></td>
      <td>${formatDate(version.createdAt)}</td>
      <td><code>${escapeHTML(shortDigest(version.spec.imageDigest))}</code></td>
      <td>${version.spec.parallelism}</td>
      <td><span class="status-badge ${version.healthSummary?.healthy ? "success" : "danger"}">${version.healthSummary?.healthy ? "HEALTHY" : "DEGRADED"}</span></td>
      <td><button class="text-button" data-rollback-version="${version.versionId}">Rollback</button></td>
    </tr>
  `).join("");
}

async function loadActiveTarget({ quiet = false } = {}) {
  if (!state.activeTarget) {
    if (!quiet) flash("Add or select a deployment target first.", "error");
    return;
  }
  document.querySelector("#refresh-button").disabled = true;
  try {
    const [actor, cluster] = await Promise.all([
      request(apiPath(state.activeTarget, "/actor")),
      request(clusterPath(state.activeTarget, "/actor")),
    ]);
    state.actor = actor;
    state.cluster = cluster;
    elements.lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    renderActor();
    renderCluster();
  } catch (error) {
    state.actor = null;
    state.cluster = null;
    renderActor();
    renderCluster();
    if (!quiet) flash(error.message, "error");
  } finally {
    document.querySelector("#refresh-button").disabled = false;
  }
}

async function loadVersions() {
  if (!state.activeTarget) {
    flash("Select a deployment first.", "error");
    return;
  }
  try {
    state.versions = await request(apiPath(state.activeTarget, "/versions")) || [];
    renderVersions();
  } catch (error) {
    flash(error.message, "error");
  }
}

function activateTarget(target) {
  state.activeTarget = target;
  state.actor = null;
  state.cluster = null;
  state.versions = [];
  renderTargets();
  renderActor();
  renderCluster();
  renderVersions();
  loadActiveTarget();
}

function switchView(name) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `${name}-view`));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === name));
  document.querySelector("#page-title").textContent = {
    overview: "Deployment overview",
    deploy: "Controlled rollout",
    history: "Versions & history",
  }[name];
  if (name === "history") loadVersions();
}

function openAction(command, options = {}) {
  if (!state.activeTarget) {
    flash("Select a deployment first.", "error");
    return;
  }
  const form = document.querySelector("#action-form");
  form.reset();
  form.elements.command.value = command;
  form.elements.requester.value = "operator";
  form.elements.idempotencyKey.value = generatedKey(command);
  form.elements.targetVersion.value = options.targetVersion || "";
  form.elements.parallelism.value = options.parallelism || "";
  const titles = {
    savepoint: "Create savepoint",
    suspend: "Suspend deployment",
    resume: "Resume deployment",
    rollback: "Rollback deployment",
    scale: "Scale deployment",
    "autoscaler-enable": "Enable autoscaler",
    "autoscaler-freeze": "Freeze autoscaler",
    "continue-as-new": "Compact actor history",
  };
  document.querySelector("#action-title").textContent = titles[command] || "Run operation";
  document.querySelector("#action-version-label").classList.toggle("hidden", command !== "rollback");
  document.querySelector("#action-parallelism-label").classList.toggle("hidden", command !== "scale");
  elements.actionDialog.showModal();
}

async function submitAction(form) {
  const data = new FormData(form);
  const command = data.get("command");
  const commandPath = {
    "autoscaler-enable": "autoscaler/enable",
    "autoscaler-freeze": "autoscaler/freeze",
    "continue-as-new": "continue-as-new",
  }[command] || command;
  const body = {
    requester: data.get("requester"),
    reason: data.get("reason"),
    approved: data.get("approved") === "on",
  };
  if (command === "rollback") body.targetVersion = Number(data.get("targetVersion"));
  if (command === "scale") body.parallelism = Number(data.get("parallelism"));
  try {
    const result = await request(apiPath(state.activeTarget, `/${commandPath}`), {
      method: "POST",
      headers: { "Idempotency-Key": data.get("idempotencyKey") },
      body: JSON.stringify(body),
    });
    elements.actionDialog.close();
    flash(`Command accepted: ${result.operationId}`);
    setTimeout(loadActiveTarget, 600);
  } catch (error) {
    flash(error.message, "error");
  }
}

async function submitDeployment(form) {
  if (!state.activeTarget) {
    flash("Select a deployment first.", "error");
    return;
  }
  const data = new FormData(form);
  try {
    const body = {
      requester: data.get("requester"),
      approved: data.get("approved") === "on",
      reason: data.get("reason"),
      spec: {
        imageDigest: data.get("imageDigest"),
        gitRef: data.get("gitRef"),
        flinkVersion: data.get("flinkVersion"),
        jobArgs: parsePairs(data.get("jobArgs")),
        flinkConfig: parsePairs(data.get("flinkConfig")),
        parallelism: Number(data.get("parallelism")),
        maxParallelism: Number(data.get("maxParallelism")),
        resources: {
          taskManagerCpu: Number(data.get("taskManagerCpu")),
          taskManagerMemoryMiB: Number(data.get("taskManagerMemoryMiB")),
          taskManagerCount: Number(data.get("taskManagerCount")),
          slotsPerManager: Number(data.get("slotsPerManager")),
        },
        stateCompatibility: {
          jobGraphCompatible: data.get("jobGraphCompatible") === "on",
          operatorUidsStable: data.get("operatorUidsStable") === "on",
          allowNonRestored: data.get("allowNonRestored") === "on",
          freshStartApproved: data.get("freshStartApproved") === "on",
        },
        autoscalerEnabled: data.get("autoscalerEnabled") === "on",
      },
    };
    const result = await request(apiPath(state.activeTarget, "/deploy"), {
      method: "POST",
      headers: { "Idempotency-Key": data.get("idempotencyKey") },
      body: JSON.stringify(body),
    });
    flash(`Rollout queued: ${result.operationId}`);
    switchView("overview");
    setTimeout(loadActiveTarget, 600);
  } catch (error) {
    flash(error.message, "error");
  }
}

async function setFreeze(frozen) {
  if (!state.activeTarget) {
    flash("Select a deployment first.", "error");
    return;
  }
  const reason = frozen ? window.prompt("Reason for freezing namespace mutations:") : "Operations resumed";
  if (frozen && reason === null) return;
  try {
    await request(clusterPath(state.activeTarget, frozen ? "/freeze" : "/unfreeze"), {
      method: "POST",
      body: JSON.stringify({ requester: "operator", reason }),
    });
    flash(frozen ? "Namespace freeze requested." : "Namespace unfreeze requested.");
    setTimeout(loadActiveTarget, 400);
  } catch (error) {
    flash(error.message, "error");
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[character]));
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view], [data-view-link]");
  if (viewButton) switchView(viewButton.dataset.view || viewButton.dataset.viewLink);

  const targetButton = event.target.closest("[data-target]");
  if (targetButton) {
    const target = state.targets.find((item) => targetKey(item) === targetButton.dataset.target);
    if (target) activateTarget(target);
  }

  const commandButton = event.target.closest("[data-command]");
  if (commandButton) openAction(commandButton.dataset.command);

  const rollbackButton = event.target.closest("[data-open-rollback]");
  if (rollbackButton) openAction("rollback", { targetVersion: state.actor?.lastHealthyVersion?.versionId });

  const versionRollback = event.target.closest("[data-rollback-version]");
  if (versionRollback) openAction("rollback", { targetVersion: versionRollback.dataset.rollbackVersion });

  if (event.target.closest("[data-open-deploy]")) {
    const key = document.querySelector('[name="idempotencyKey"]');
    key.value = generatedKey("deploy");
    switchView("deploy");
  }
});

document.querySelector("#add-target-button").addEventListener("click", () => elements.targetDialog.showModal());
document.querySelector("#refresh-button").addEventListener("click", () => loadActiveTarget());
document.querySelector("#load-versions-button").addEventListener("click", loadVersions);
document.querySelector("#freeze-button").addEventListener("click", () => setFreeze(true));
document.querySelector("#unfreeze-button").addEventListener("click", () => setFreeze(false));
elements.targetSearch.addEventListener("input", (event) => {
  state.targetFilter = event.target.value;
  renderTargets();
});

document.querySelector("#target-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    elements.targetDialog.close();
    return;
  }
  const form = event.currentTarget;
  const data = new FormData(form);
  const target = Object.fromEntries(data.entries());
  try {
    await request(apiPath(target), {
      method: "PUT",
      body: JSON.stringify({
        owner: target.owner,
        serviceAccount: target.serviceAccount,
        nodePool: target.nodePool,
        flinkDashboardUrl: target.flinkDashboardUrl,
      }),
    });
    const existingIndex = state.targets.findIndex((item) => targetKey(item) === targetKey(target));
    if (existingIndex >= 0) state.targets[existingIndex] = target;
    else state.targets.push(target);
    saveTargets();
    elements.targetDialog.close();
    await loadDeploymentInventory([target]);
    flash(`Registered ${target.name}.`);
  } catch (error) {
    flash(error.message, "error");
  }
});

document.querySelector("#action-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    elements.actionDialog.close();
    return;
  }
  submitAction(event.currentTarget);
});

document.querySelector("#deploy-form").addEventListener("submit", (event) => {
  event.preventDefault();
  submitDeployment(event.currentTarget);
});

renderTargets();
renderActor();
renderCluster();
renderVersions();
document.querySelector('[name="idempotencyKey"]').value = generatedKey("deploy");
loadDeploymentInventory();
