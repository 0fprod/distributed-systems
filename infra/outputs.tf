# ── Cluster ───────────────────────────────────────────────────────────────────
output "kubectl_config_command" {
  description = "Configure kubectl to point to your Civo cluster"
  value       = "civo kubernetes config ${civo_kubernetes_cluster.main.name} --region ${var.civo_region} --save --switch"
}

output "cluster_api_endpoint" {
  description = "Kubernetes API server endpoint"
  value       = civo_kubernetes_cluster.main.api_endpoint
}

# ── GHCR ──────────────────────────────────────────────────────────────────────
output "image_backend" {
  description = "Full GHCR image path for the backend — use in k8s/backend/deployment.yaml"
  value       = "ghcr.io/${var.github_username}/${var.project}/backend:latest"
}

output "image_worker" {
  description = "Full GHCR image path for the worker"
  value       = "ghcr.io/${var.github_username}/${var.project}/worker:latest"
}

output "image_frontend" {
  description = "Full GHCR image path for the frontend"
  value       = "ghcr.io/${var.github_username}/${var.project}/frontend:latest"
}

output "ghcr_login_command" {
  description = "Authenticate Docker with GHCR"
  value       = "echo $GITHUB_PAT | docker login ghcr.io -u ${var.github_username} --password-stdin"
  sensitive   = false
}

output "docker_build_and_push" {
  description = "Build and push all images to GHCR"
  value       = <<-EOT
    # Run from the repo root:
    docker build -f apps/backend/Dockerfile  -t ghcr.io/${var.github_username}/${var.project}/backend:latest  .
    docker build -f apps/worker/Dockerfile   -t ghcr.io/${var.github_username}/${var.project}/worker:latest   .
    docker build -f apps/frontend/Dockerfile -t ghcr.io/${var.github_username}/${var.project}/frontend:latest .

    docker push ghcr.io/${var.github_username}/${var.project}/backend:latest
    docker push ghcr.io/${var.github_username}/${var.project}/worker:latest
    docker push ghcr.io/${var.github_username}/${var.project}/frontend:latest
  EOT
}

# ── Sealed Secrets ────────────────────────────────────────────────────────────
output "sealed_secrets_backup_command" {
  description = "IMPORTANT: back up the Sealed Secrets master key after first apply — without this you cannot re-seal if the cluster is recreated"
  value       = "kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key -o yaml > sealed-secrets-master-key-BACKUP.yaml"
}

# ── Grafana Cloud ─────────────────────────────────────────────────────────────
output "grafana_url" {
  description = "Grafana Cloud dashboard URL"
  value       = grafana_cloud_stack.prod.url
}
