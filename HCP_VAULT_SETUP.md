# HCP Vault Secrets Setup

## Prerequisites

1. Create an account at [HCP Portal](https://portal.cloud.hashicorp.com)
2. Create a service principal with "Contributor" role
3. Get the service principal credentials (client_id, client_secret)
4. Get the project ID from your HCP project

## Setup Steps

### 1. Create the App in HCP Vault Secrets

1. Go to [HCP Vault Secrets](https://portal.cloud.hashicorp.com/vault/secrets)
2. Click "Create new app"
3. Name: `wati-backend`
4. Description: Application secrets for WATI backend
5. Click "Create"

### 2. Create Secrets

Create the following secrets in the `wati-backend` app:

| Secret Name | Value |
|-------------|-------|
| `database-password` | wati_password |

### 3. Configure Environment Variables

Add the following to your `.env` file:

```bash
HCP_CLIENT_ID=your_client_id
HCP_CLIENT_SECRET=your_client_secret
HCP_PROJECT_ID=your_project_id
```

### 4. Run Terraform (Optional)

The Terraform configuration in `terraform/main.tf` includes a data source to read the secrets from HCP Vault:

```bash
cd terraform
terraform init
terraform plan -var="hcp_client_id=$HCP_CLIENT_ID" -var="hcp_client_secret=$HCP_CLIENT_SECRET" -var="hcp_project_id=$HCP_PROJECT_ID"
terraform apply -var="hcp_client_id=$HCP_CLIENT_ID" -var="hcp_client_secret=$HCP_CLIENT_SECRET" -var="hcp_project_id=$HCP_PROJECT_ID"
```

## How It Works

1. The backend (`backend/config/vault.js`) authenticates with HCP using OAuth2
2. It retrieves secrets from the `wati-backend` app
3. The database configuration (`backend/config/database.js`) fetches the database password from Vault
4. The connection string is built dynamically using the retrieved password

## Security Notes

- Never commit `.env` file to version control
- The `.env` file is already in `.gitignore`
- Use different secrets for production vs development
