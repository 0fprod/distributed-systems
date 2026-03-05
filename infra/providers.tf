terraform {
  required_version = ">= 1.5"

  required_providers {
    civo = {
      source  = "civo/civo"
      version = "~> 1.1"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.17"
    }
    grafana = {
      source  = "grafana/grafana"
      version = "~> 3.0"
    }
  }
}

# ── Civo ──────────────────────────────────────────────────────────────────────
provider "civo" {
  token  = var.civo_api_key
  region = var.civo_region
}

# ── Kubernetes (Civo k3s) ─────────────────────────────────────────────────────
locals {
  kubeconfig = yamldecode(civo_kubernetes_cluster.main.kubeconfig)
}

provider "kubernetes" {
  host                   = local.kubeconfig.clusters[0].cluster.server
  client_certificate     = base64decode(local.kubeconfig.users[0].user["client-certificate-data"])
  client_key             = base64decode(local.kubeconfig.users[0].user["client-key-data"])
  cluster_ca_certificate = base64decode(local.kubeconfig.clusters[0].cluster["certificate-authority-data"])
}

provider "helm" {
  kubernetes {
    host                   = local.kubeconfig.clusters[0].cluster.server
    client_certificate     = base64decode(local.kubeconfig.users[0].user["client-certificate-data"])
    client_key             = base64decode(local.kubeconfig.users[0].user["client-key-data"])
    cluster_ca_certificate = base64decode(local.kubeconfig.clusters[0].cluster["certificate-authority-data"])
  }
}

# ── Grafana Cloud ─────────────────────────────────────────────────────────────
provider "grafana" {
  alias                     = "cloud"
  cloud_access_policy_token = var.grafana_cloud_api_key
}

provider "grafana" {
  alias = "stack"
  url   = grafana_cloud_stack.prod.url
  auth  = grafana_cloud_stack_service_account_token.terraform.key
}
