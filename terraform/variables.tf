# ============================================================
# terraform/variables.tf
# Variables for HCP (HashiCorp Cloud Platform) authentication
# 
# These variables are used to authenticate with HCP Vault Secrets
# and must be provided when running terraform apply.
#
# Usage:
#   terraform plan -var="hcp_client_id=$HCP_CLIENT_ID" \
#                   -var="hcp_client_secret=$HCP_CLIENT_SECRET" \
#                   -var="hcp_project_id=$HCP_PROJECT_ID"
#
# For CI/CD, use environment variables or a tfvars file.
# ============================================================

variable "hcp_client_id" {
  description = "HCP Client ID for authentication"
  type        = string
  sensitive   = true
}

variable "hcp_client_secret" {
  description = "HCP Client Secret for authentication"
  type        = string
  sensitive   = true
}

variable "hcp_project_id" {
  description = "HCP Project ID"
  type        = string
}
