/**
 * HCP Vault Secrets Client
 * 
 * This module provides integration with HashiCorp Cloud Platform (HCP) Vault Secrets.
 * It allows retrieving secrets stored in HCP Vault from the backend application.
 * 
 * Setup Requirements:
 * 1. Create an account at https://portal.cloud.hashicorp.com
 * 2. Create a service principal with "Contributor" role
 * 3. Create an app in HCP Vault Secrets named 'wati-backend'
 * 4. Add secrets to the app (e.g., database-password)
 * 5. Set environment variables: HCP_CLIENT_ID, HCP_CLIENT_SECRET, HCP_PROJECT_ID
 * 
 * Environment Variables:
 * - HCP_CLIENT_ID: Service principal client ID
 * - HCP_CLIENT_SECRET: Service principal client secret
 * - HCP_PROJECT_ID: HCP project ID
 * 
 * API Reference:
 * - https://developer.hashicorp.com/hcp/docs/vault-secrets
 * - https://developer.hashicorp.com/hcp/api-docs/vault-secrets
 */

import { config } from './env.js';

const HCP_CLIENT_ID = config.HCP_CLIENT_ID;
const HCP_CLIENT_SECRET = config.HCP_CLIENT_SECRET;
const HCP_PROJECT_ID = config.HCP_PROJECT_ID;
const APP_NAME = 'wati-backend';

let accessToken = null;

/**
 * Checks if HCP Vault credentials are configured
 * 
 * @returns {boolean} True if all required credentials are present
 */
function isVaultConfigured() {
  return HCP_CLIENT_ID && HCP_CLIENT_SECRET && HCP_PROJECT_ID;
}

/**
 * Obtains an OAuth2 access token from HCP
 * 
 * Uses the client credentials flow to authenticate with HCP.
 * The token is cached in memory for subsequent requests.
 * 
 * @returns {Promise<string>} OAuth2 access token
 * @throws {Error} If credentials are not configured or authentication fails
 */
async function getAccessToken() {
  if (!isVaultConfigured()) {
    throw new Error('HCP Vault credentials not configured');
  }

  if (accessToken) return accessToken;

  const response = await fetch('https://auth.hashicorp.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: HCP_CLIENT_ID,
      client_secret: HCP_CLIENT_SECRET,
      audience: 'https://api.hashicorp.cloud',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  return accessToken;
}

/**
 * Retrieves a single secret from HCP Vault Secrets
 * 
 * @param {string} secretName - The name of the secret to retrieve
 * @returns {Promise<string|null>} The secret value, or null if not found
 * @throws {Error} If credentials are not configured or API call fails
 */
export async function getSecret(secretName) {
  if (!isVaultConfigured()) {
    throw new Error('HCP Vault credentials not configured');
  }

  const token = await getAccessToken();

  const response = await fetch(
    `https://api.hashicorp.cloud/vsecrets/2023-11-28/apps/${APP_NAME}/secrets/${secretName}:open`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to get secret ${secretName}: ${response.status}`);
  }

  const data = await response.json();
  return data.secret.value;
}

/**
 * Retrieves all secrets from the configured HCP Vault app
 * 
 * @returns {Promise<Object>} Object with secret names as keys and values
 * @throws {Error} If credentials are not configured or API call fails
 */
export async function getAllSecrets() {
  const token = await getAccessToken();

  const response = await fetch(
    `https://api.hashicorp.cloud/vsecrets/2023-11-28/apps/${APP_NAME}/secrets:open`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get secrets: ${response.status}`);
  }

  const data = await response.json();
  const secrets = {};
  for (const secret of data.secrets) {
    secrets[secret.name] = secret.value;
  }
  return secrets;
}

/**
 * Convenience function to get the database password specifically
 * 
 * This function retrieves the 'database-password' secret from HCP Vault.
 * Used by database.js when HCP_VAULT integration is enabled.
 * 
 * @returns {Promise<string>} The database password
 */
export async function getDatabasePassword() {
  return getSecret('database-password');
}
