// ── Alloy configuration ───────────────────────────────────────────────────────
// Receives OTLP from apps in the cluster and forwards everything to Grafana Cloud.
// Deployed as a DaemonSet — one pod per node.

// ── OTLP receiver (apps send here) ───────────────────────────────────────────
otelcol.receiver.otlp "default" {
  grpc { endpoint = "0.0.0.0:4317" }
  http { endpoint = "0.0.0.0:4318" }

  output {
    metrics = [otelcol.processor.batch.default.input]
    logs    = [otelcol.processor.batch.default.input]
    traces  = [otelcol.processor.batch.default.input]
  }
}

// ── Batch processor (reduces number of requests to Grafana Cloud) ─────────────
otelcol.processor.batch "default" {
  output {
    metrics = [otelcol.exporter.otlphttp.grafana_cloud.input]
    logs    = [otelcol.exporter.otlphttp.grafana_cloud.input]
    traces  = [otelcol.exporter.otlphttp.grafana_cloud.input]
  }
}

// ── OTLP exporter → Grafana Cloud ─────────────────────────────────────────────
otelcol.exporter.otlphttp "grafana_cloud" {
  client {
    endpoint = "${otlp_endpoint}"
    auth     = otelcol.auth.basic.grafana_cloud.handler
  }
}

otelcol.auth.basic "grafana_cloud" {
  username = "${grafana_instance_id}"
  password = "${grafana_token}"
}

// ── Kubernetes pod log collection ─────────────────────────────────────────────
discovery.kubernetes "pods" {
  role = "pod"

  namespaces {
    names = ["distributed-systems"]
  }
}

discovery.relabel "pod_logs" {
  targets = discovery.kubernetes.pods.targets

  rule {
    source_labels = ["__meta_kubernetes_pod_name"]
    target_label  = "pod"
  }
  rule {
    source_labels = ["__meta_kubernetes_namespace"]
    target_label  = "namespace"
  }
  rule {
    source_labels = ["__meta_kubernetes_pod_label_app"]
    target_label  = "app"
  }
  rule {
    source_labels = ["__meta_kubernetes_pod_container_name"]
    target_label  = "container"
  }
}

loki.source.kubernetes "pods" {
  targets    = discovery.relabel.pod_logs.output
  forward_to = [loki.write.grafana_cloud.receiver]
}

loki.write "grafana_cloud" {
  endpoint {
    url = "${loki_url}"

    basic_auth {
      username = "${loki_user}"
      password = "${grafana_token}"
    }
  }
}

// ── Kubernetes metrics (node + pod resource usage) ────────────────────────────
prometheus.operator.podmonitors "default" {
  forward_to = [prometheus.remote_write.grafana_cloud.receiver]
}

prometheus.remote_write "grafana_cloud" {
  endpoint {
    url = "${prometheus_url}"

    basic_auth {
      username = "${prometheus_user}"
      password = "${grafana_token}"
    }
  }
}
