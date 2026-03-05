# ── Civo Kubernetes Cluster ───────────────────────────────────────────────────
# k3s-based managed cluster. Civo handles networking, DNS, and the control plane.
# With 2x g4s.kube.medium (2 vCPU, 4 GB each) the full stack fits comfortably.
resource "civo_kubernetes_cluster" "main" {
  name        = var.project
  region      = var.civo_region
  # Firewall: Civo creates one by default; we use the default for simplicity
  firewall_id = civo_firewall.main.id

  pools {
    label      = "main"
    size       = var.node_size
    node_count = var.node_count
  }

  # Don't pre-install Traefik — we use a plain LoadBalancer Service for the frontend
  applications = ""

  # Required: the kubeconfig attribute is only populated when this is true.
  # Without it the state stores no kubeconfig and yamldecode fails.
  write_kubeconfig = true
}

# ── Firewall ──────────────────────────────────────────────────────────────────
resource "civo_firewall" "main" {
  name                 = "${var.project}-fw"
  region               = var.civo_region
  create_default_rules = false

  # kubectl access
  ingress_rule {
    label      = "kubernetes-api"
    protocol   = "tcp"
    port_range = "6443"
    cidr       = ["0.0.0.0/0"]
    action     = "allow"
  }

  # HTTP for the frontend LoadBalancer
  ingress_rule {
    label      = "http"
    protocol   = "tcp"
    port_range = "80"
    cidr       = ["0.0.0.0/0"]
    action     = "allow"
  }

  ingress_rule {
    label      = "https"
    protocol   = "tcp"
    port_range = "443"
    cidr       = ["0.0.0.0/0"]
    action     = "allow"
  }

  # NodePort range (used by Civo LB to reach pods)
  ingress_rule {
    label      = "nodeports"
    protocol   = "tcp"
    port_range = "30000-32767"
    cidr       = ["0.0.0.0/0"]
    action     = "allow"
  }

  # Allow all egress (nodes need to pull images, reach Grafana Cloud, etc.)
  egress_rule {
    label      = "all-egress"
    protocol   = "tcp"
    port_range = "1-65535"
    cidr       = ["0.0.0.0/0"]
    action     = "allow"
  }
}

# ── Namespace ─────────────────────────────────────────────────────────────────
resource "kubernetes_namespace" "app" {
  metadata {
    name = "distributed-systems"
  }

  depends_on = [civo_kubernetes_cluster.main]
}
