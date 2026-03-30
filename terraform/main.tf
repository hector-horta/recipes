# ============================================================
# terraform/main.tf
# HCP (HashiCorp Cloud Platform) Provider Configuration
#
# This configuration connects to HCP Vault Secrets to read secrets
# for the application. It uses a data source to read existing
# secrets rather than creating them (HCP Vault Secrets has limited
# Terraform support for secret creation).
#
# Prerequisites:
# 1. Create an account at https://portal.cloud.hashicorp.com
# 2. Create a service principal with "Contributor" role
# 3. Create an app named "wati-backend" in HCP Vault Secrets
# 4. Add secrets to the app (database-password, etc.)
#
# State Management:
# - Currently stored locally (terraform.tfstate)
# - For production: migrate to HCP Terraform or S3 remote state
#
# Usage:
#   terraform init
#   terraform plan -var="hcp_client_id=$HCP_CLIENT_ID" \
#                   -var="hcp_client_secret=$HCP_CLIENT_SECRET" \
#                   -var="hcp_project_id=$HCP_PROJECT_ID"
#   terraform apply -var="hcp_client_id=$HCP_CLIENT_ID" \
#                   -var="hcp_client_secret=$HCP_CLIENT_SECRET" \
#                   -var="hcp_project_id=$HCP_PROJECT_ID"
#
# Reference:
# - https://developer.hashicorp.com/hcp/docs/vault-secrets
# - https://registry.terraform.io/providers/hashicorp/hcp/latest/docs
# ============================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    hcp = {
      source  = "hashicorp/hcp"
      version = "~> 0.94"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# Configure the HCP provider with credentials from variables
# These credentials should be passed via command line or environment
provider "hcp" {
  client_id     = var.hcp_client_id
  client_secret = var.hcp_client_secret
  project_id    = var.hcp_project_id
}

# ============================================================
# Data Sources
# Read existing secrets from HCP Vault Secrets
# ============================================================

# Reads the 'wati-backend' application from HCP Vault Secrets
# This data source provides access to all secrets stored in the app
#
# Note: The HCP Terraform provider does not support creating secrets
# directly. Secrets must be created manually in the HCP Portal or via
# the HCP CLI:
#   hcp vault-secrets secrets create database-password --value=wati_password
#
data "hcp_vault_secrets_app" "wati_app" {
  app_name = "wati-backend"
}
