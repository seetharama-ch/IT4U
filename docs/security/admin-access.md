# Admin Access & Security

> ⚠️ **CRITICAL SECURITY WARNING** ⚠️
> **NEVER** store real passwords, secrets, or production keys in this documentation or in the source code repository.
> Credentials must be managed via secure storage or environment variables.

## Admin User Policy
By default, the system initializes with a bootstrap admin account if one is not detected.

*   **Default Username:** `admin` (configurable via `IT4U_ADMIN_USERNAME`)
*   **Password Strategy:** Handled via Environment Variable.

## Credential Management

### 1. Initial Password Setup
For production environments, the Admin password SHOULD be set via the system environment variable:
`IT4U_ADMIN_PASSWORD`

If this variable is not present, the system may refuse to start in PROD mode (depending on configuration) or default to a generated log-only password.

**Example (Windows / PowerShell):**
```powershell
[System.Environment]::SetEnvironmentVariable('IT4U_ADMIN_PASSWORD', 'YourSuperSecurePassword123!', 'Machine')
```

### 2. Password Retrieval
Admins should retrieve credentials from the designated **Enterprise Vault** or **Password Manager** (e.g., 1Password, Keeper, CyberArk).
*   **Location:** IT Infrastructure / Servers / GSG-MECM / IT4U
*   **Access:** Restricted to System Administrators.

### 3. Password Rotation
To rotate the admin password:
1.  Update the `IT4U_ADMIN_PASSWORD` environment variable on the server.
2.  Restart the Backend Service (`nssm restart NetPulseBackend`).
    *   *Note: If the application logic persists the password to DB only on creation, a manual DB update might be required:*
    *   `UPDATE users SET password = '...' WHERE username = 'admin';` (Use BCrypt hash)

## Secret Storage Recommendations
*   **Production Secrets:** Store in **Bitwarden** (Enterprise Tier) or **Azure Key Vault**.
*   **Development Secrets:** Use `application-local.properties` (git-ignored) or environment variables.
