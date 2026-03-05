# ── Grafana Cloud Stack ───────────────────────────────────────────────────────
# A single stack bundles Grafana + Mimir (metrics) + Loki (logs) + Tempo (traces).
# Free tier: 10k metric series, 50 GB logs, 50 GB traces, 14-day retention.

resource "grafana_cloud_stack" "prod" {
  provider     = grafana.cloud
  name         = var.project
  slug         = var.grafana_stack_slug
  region_slug  = var.grafana_region

  lifecycle {
    # The API returns the full slug (e.g. "prod-eu-west-6") while we pass the
    # short alias ("eu"). Ignore the drift to prevent forced replacement — stacks
    # cannot be deleted via API token and would break the whole apply.
    ignore_changes = [region_slug]
  }
}

# ── Service Account for Terraform to manage stack resources ──────────────────
resource "grafana_cloud_stack_service_account" "terraform" {
  provider   = grafana.cloud
  stack_slug = grafana_cloud_stack.prod.slug
  name       = "terraform"
  role       = "Admin"
}

resource "grafana_cloud_stack_service_account_token" "terraform" {
  provider          = grafana.cloud
  stack_slug        = grafana_cloud_stack.prod.slug
  name              = "terraform-token"
  service_account_id = grafana_cloud_stack_service_account.terraform.id
}

# ── Access Policy for Alloy (push metrics, logs, traces) ─────────────────────
resource "grafana_cloud_access_policy" "alloy" {
  provider     = grafana.cloud
  # Use the full cluster slug ("prod-eu-west-6") instead of the short alias ("eu").
  # The API validates that the region here matches the stack's actual region exactly.
  region       = grafana_cloud_stack.prod.cluster_slug
  name         = "${var.project}-alloy"
  display_name = "Alloy push policy for ${var.project}"

  scopes = [
    "metrics:write",
    "logs:write",
    "traces:write",
    "profiles:write",
  ]

  realm {
    type       = "stack"
    identifier = grafana_cloud_stack.prod.id
  }
}

resource "grafana_cloud_access_policy_token" "alloy" {
  provider         = grafana.cloud
  region           = grafana_cloud_stack.prod.cluster_slug
  access_policy_id = grafana_cloud_access_policy.alloy.policy_id
  name             = "${var.project}-alloy-token"
}

# ── Datasources (configured inside the stack) ─────────────────────────────────
resource "grafana_data_source" "prometheus" {
  provider = grafana.stack
  name     = "Mimir"
  type     = "prometheus"
  url      = grafana_cloud_stack.prod.prometheus_url

  basic_auth_enabled   = true
  basic_auth_username  = tostring(grafana_cloud_stack.prod.prometheus_user_id)

  json_data_encoded = jsonencode({
    httpMethod        = "POST"
    prometheusType    = "Mimir"
    prometheusVersion = "2.9.1"
  })

  secure_json_data_encoded = jsonencode({
    basicAuthPassword = grafana_cloud_access_policy_token.alloy.token
  })
}

resource "grafana_data_source" "loki" {
  provider = grafana.stack
  name     = "Loki"
  type     = "loki"
  url      = grafana_cloud_stack.prod.logs_url

  basic_auth_enabled  = true
  basic_auth_username = tostring(grafana_cloud_stack.prod.logs_user_id)

  secure_json_data_encoded = jsonencode({
    basicAuthPassword = grafana_cloud_access_policy_token.alloy.token
  })
}

resource "grafana_data_source" "tempo" {
  provider = grafana.stack
  name     = "Tempo"
  type     = "tempo"
  url      = grafana_cloud_stack.prod.traces_url

  basic_auth_enabled  = true
  basic_auth_username = tostring(grafana_cloud_stack.prod.traces_user_id)

  secure_json_data_encoded = jsonencode({
    basicAuthPassword = grafana_cloud_access_policy_token.alloy.token
  })
}
