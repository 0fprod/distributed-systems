# ── GHCR imagePullSecret ──────────────────────────────────────────────────────
# GitHub Container Registry (ghcr.io) is free for public and private repos.
# Image format: ghcr.io/<github_username>/<repo>:<tag>
#
# The PAT needs scope: write:packages (for CI push) + read:packages (for k8s pull)

resource "kubernetes_secret" "ghcr_pull_secret" {
  metadata {
    name      = "ghcr-pull-secret"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  type = "kubernetes.io/dockerconfigjson"

  data = {
    ".dockerconfigjson" = jsonencode({
      auths = {
        "ghcr.io" = {
          username = var.github_username
          password = var.github_pat
          auth     = base64encode("${var.github_username}:${var.github_pat}")
        }
      }
    })
  }
}
