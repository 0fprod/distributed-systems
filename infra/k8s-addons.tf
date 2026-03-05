# ── ingress-nginx ──────────────────────────────────────────────────────────────
resource "helm_release" "ingress_nginx" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  version          = "4.12.1"
  namespace        = "ingress-nginx"
  create_namespace = true

  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }
  set {
    name  = "controller.resources.requests.cpu"
    value = "50m"
  }
  set {
    name  = "controller.resources.requests.memory"
    value = "90Mi"
  }

  depends_on = [civo_kubernetes_cluster.main]
}

# ── cert-manager ───────────────────────────────────────────────────────────────
resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = "1.17.1"
  namespace        = "cert-manager"
  create_namespace = true

  set {
    name  = "crds.enabled"
    value = "true"
  }
  set {
    name  = "resources.requests.cpu"
    value = "25m"
  }
  set {
    name  = "resources.requests.memory"
    value = "64Mi"
  }

  depends_on = [civo_kubernetes_cluster.main]
}

# ── KEDA ──────────────────────────────────────────────────────────────────────
resource "helm_release" "keda" {
  name             = "keda"
  repository       = "https://kedacore.github.io/charts"
  chart            = "keda"
  version          = "2.17.0"
  namespace        = "keda"
  create_namespace = true

  set {
    name  = "resources.operator.requests.cpu"
    value = "50m"
  }
  set {
    name  = "resources.operator.requests.memory"
    value = "64Mi"
  }

  depends_on = [civo_kubernetes_cluster.main]
}

# ── Sealed Secrets controller ─────────────────────────────────────────────────
# Decrypts SealedSecrets → k8s Secrets. The cluster key is generated on install.
# IMPORTANT: back up the key immediately after install (see outputs.tf).
resource "helm_release" "sealed_secrets" {
  name             = "sealed-secrets"
  repository       = "https://bitnami-labs.github.io/sealed-secrets"
  chart            = "sealed-secrets"
  version          = "2.17.3"
  namespace        = "kube-system"

  set {
    name  = "resources.requests.cpu"
    value = "25m"
  }
  set {
    name  = "resources.requests.memory"
    value = "32Mi"
  }

  depends_on = [civo_kubernetes_cluster.main]
}

# ── Grafana Alloy ─────────────────────────────────────────────────────────────
# Receives OTLP from apps and forwards to Grafana Cloud.
resource "helm_release" "alloy" {
  name             = "alloy"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "alloy"
  version          = "0.12.0"
  namespace        = "monitoring"
  create_namespace = true

  values = [
    yamlencode({
      alloy = {
        configMap = {
          content = templatefile("${path.module}/alloy-config.alloy.tpl", {
            otlp_endpoint       = "https://otlp-gateway-prod-${var.grafana_region}.grafana.net/otlp"
            grafana_instance_id = grafana_cloud_stack.prod.id
            grafana_token       = grafana_cloud_access_policy_token.alloy.token
            prometheus_url      = grafana_cloud_stack.prod.prometheus_remote_write_endpoint
            prometheus_user     = tostring(grafana_cloud_stack.prod.prometheus_user_id)
            loki_url            = "${grafana_cloud_stack.prod.logs_url}/loki/api/v1/push"
            loki_user           = tostring(grafana_cloud_stack.prod.logs_user_id)
          })
        }
      }
    })
  ]

  depends_on = [
    civo_kubernetes_cluster.main,
    grafana_cloud_access_policy_token.alloy,
  ]
}
