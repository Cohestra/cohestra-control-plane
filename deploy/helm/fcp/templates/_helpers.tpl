{{/* Common naming helpers */}}
{{- define "fcp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "fcp.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s" (include "fcp.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "fcp.labels" -}}
app.kubernetes.io/name: {{ include "fcp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
{{- end -}}

{{- define "fcp.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (printf "%s" (include "fcp.fullname" .)) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{- define "fcp.leaseNamespace" -}}
{{- default .Release.Namespace .Values.flink.leaseNamespace -}}
{{- end -}}

{{/*
Resolve the effective Temporal frontend address. In bundled mode the in-chart
Temporal service is used; otherwise the operator-supplied address.
*/}}
{{- define "fcp.temporalAddress" -}}
{{- if eq .Values.temporal.mode "bundled" -}}
{{- printf "%s-temporal:7233" (include "fcp.fullname" .) -}}
{{- else -}}
{{- required "temporal.address is required when temporal.mode=external" .Values.temporal.address -}}
{{- end -}}
{{- end -}}

{{/*
Common environment shared by control-api and worker.
*/}}
{{- define "fcp.commonEnv" -}}
- name: TEMPORAL_ADDRESS
  value: {{ include "fcp.temporalAddress" . | quote }}
- name: TEMPORAL_NAMESPACE
  value: {{ .Values.temporal.namespace | quote }}
- name: ACTOR_TASK_QUEUE
  value: {{ .Values.taskQueue.actor | quote }}
- name: ACTOR_TASK_QUEUE_SHARDS
  value: {{ .Values.taskQueue.shards | quote }}
- name: ACTIVITY_TASK_QUEUE
  value: {{ .Values.taskQueue.activity | quote }}
{{- if .Values.temporal.tls }}
- name: TEMPORAL_TLS
  value: "true"
{{- end }}
{{- if .Values.temporal.apiKey.secretName }}
- name: TEMPORAL_API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ .Values.temporal.apiKey.secretName }}
      key: {{ .Values.temporal.apiKey.secretKey }}
{{- end }}
{{- end -}}
