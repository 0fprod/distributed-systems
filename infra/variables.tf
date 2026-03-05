# ── Civo ──────────────────────────────────────────────────────────────────────
variable "civo_api_key" {
  description = "Civo API key — Settings → API Keys → Generate"
  type        = string
  sensitive   = true
}

variable "civo_region" {
  description = "Civo region (LON1, NYC1, FRA1, PHX1, NYC1...)"
  type        = string
  default     = "LON1"
}

# ── Project ───────────────────────────────────────────────────────────────────
variable "project" {
  description = "Short project name used as prefix for resource names"
  type        = string
  default     = "distributed-systems"
}

# ── OKE node pool ─────────────────────────────────────────────────────────────
variable "node_size" {
  description = "Civo node size. g4s.kube.medium = 2 vCPU / 4 GB RAM (~$20/node/month)"
  type        = string
  default     = "g4s.kube.medium"
}

variable "node_count" {
  description = "Number of worker nodes. 2 is enough for this stack with $250 credit."
  type        = number
  default     = 2
}

# ── GHCR (GitHub Container Registry) ─────────────────────────────────────────
variable "github_username" {
  description = "GitHub username — used as the GHCR image path prefix"
  type        = string
}

variable "github_pat" {
  description = "GitHub Personal Access Token with write:packages scope (Settings → Developer settings → PATs)"
  type        = string
  sensitive   = true
}

# ── Grafana Cloud ─────────────────────────────────────────────────────────────
variable "grafana_cloud_api_key" {
  description = "Grafana Cloud access policy token (My Account → Security → Access Policies)"
  type        = string
  sensitive   = true
}

variable "grafana_stack_slug" {
  description = "Slug of your Grafana Cloud stack (visible in the stack URL)"
  type        = string
}

variable "grafana_region" {
  description = "Grafana Cloud region (eu, us, au...)"
  type        = string
  default     = "eu"
}
