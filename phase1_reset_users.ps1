# Phase 1: User Data Reset Script (Enhanced)
# Handles cascading deletes and removes admin_test

$baseUrl = "http://localhost:8060"
$username = "admin"
$password = "Admin@123"

Write-Host "=== Phase 1: User Data Reset (Enhanced) ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login as Admin
Write-Host "[Step 1] Logging in as ADMIN..." -ForegroundColor Yellow
$loginBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable session

if ($loginResponse.StatusCode -eq 200) {
    Write-Host "[OK] Login successful" -ForegroundColor Green
} else {
    Write-Host "[ERR] Login failed" -ForegroundColor Red
    exit 1
}

# Step 2: Get all tickets
Write-Host ""
Write-Host "[Step 2] Fetching and deleting ALL tickets..." -ForegroundColor Yellow
try {
    $ticketsResponse = Invoke-RestMethod -Uri "$baseUrl/api/tickets" -Method GET -WebSession $session
    
    $ticketCount = $ticketsResponse.Count
    Write-Host "[OK] Found $ticketCount tickets" -ForegroundColor Green
    
    if ($ticketCount -gt 0) {
        foreach ($ticket in $ticketsResponse) {
            try {
                Invoke-RestMethod -Uri "$baseUrl/api/tickets/$($ticket.id)" -Method DELETE -WebSession $session | Out-Null
                Write-Host "  [OK] Deleted ticket #$($ticket.id)" -ForegroundColor Gray
            } catch {
                Write-Host "  [ERR] Failed to delete ticket #$($ticket.id)" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "[ERR] Failed to fetch tickets: $_" -ForegroundColor Red
}

# Step 3: Get all users  
Write-Host ""
Write-Host "[Step 3] Fetching all users..." -ForegroundColor Yellow
try {
    $usersResponse = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method GET -WebSession $session
    
    $totalUsers = $usersResponse.Count
    Write-Host "[OK] Found $totalUsers users" -ForegroundColor Green
    
    # Step 4: Delete all non-primary-admin users (including admin_test)
    Write-Host ""
    Write-Host "[Step 4] Deleting ALL users except 'admin'..." -ForegroundColor Yellow
    
    $deletedCount = 0
    $skippedCount = 0
    
    foreach ($user in $usersResponse) {
        # ONLY keep the primary 'admin' user
        if ($user.username -eq "admin") {
            Write-Host "  [KEEP] $($user.username) (PRIMARY ADMIN) - preserving" -ForegroundColor Green
            $skippedCount++
        } else {
            try {
                Invoke-RestMethod -Uri "$baseUrl/api/users/$($user.id)" -Method DELETE -WebSession $session | Out-Null
                Write-Host "  [OK] Deleted $($user.username) ($($user.role))" -ForegroundColor Gray
                $deletedCount++
            } catch {
                Write-Host "  [ERR] Failed to delete $($user.username) - $($_.Exception.Message)" -ForegroundColor Red
                
                # Retry after small delay
                Start-Sleep -Milliseconds 500
                try {
                    Invoke-Rest Method -Uri "$baseUrl/api/users/$($user.id)" -Method DELETE -WebSession $session | Out-Null
                    Write-Host "  [OK] Deleted $($user.username) on retry" -ForegroundColor Gray
                    $deletedCount++
                } catch {
                    Write-Host "  [FAIL] Could not delete $($user.username) after retry" -ForegroundColor Red
                }
            }
        }
    }
    
    Write-Host "[OK] User deletion completed" -ForegroundColor Green
    Write-Host "  - Deleted: $deletedCount user(s)" -ForegroundColor Gray
    Write-Host "  - Kept: $skippedCount user(s)" -ForegroundColor Gray
    
} catch {
    Write-Host "[ERR] Failed to fetch users: $_" -ForegroundColor Red
}

# Step 5: Verify final state
Write-Host ""
Write-Host "[Step 5] Verifying final state..." -ForegroundColor Yellow
try {
    $finalUsers = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method GET -WebSession $session
    
    Write-Host "[OK] Final user count: $($finalUsers.Count)" -ForegroundColor Green
    
    if ($finalUsers.Count -eq 1 -and $finalUsers[0].username -eq "admin" -and $finalUsers[0].role -eq "ADMIN") {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host " PHASE 1 VERIFICATION: PASSED" -ForegroundColor Green  
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Only ADMIN user remains:" -ForegroundColor Green
        Write-Host "  Username: $($finalUsers[0].username)" -ForegroundColor White
        Write-Host "  Role: $($finalUsers[0].role)" -ForegroundColor White
        Write-Host "  Email: $($finalUsers[0].email)" -ForegroundColor White
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host " PHASE 1 VERIFICATION: FAILED" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "Expected: 1 user (admin/ADMIN)" -ForegroundColor Red
        Write-Host "Actual: $($finalUsers.Count) user(s)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Remaining users:" -ForegroundColor Yellow
        $finalUsers | ForEach-Object {
            Write-Host "  - $($_.username) ($($_.role)) - $($_.email)" -ForegroundColor Gray
        }
        Write-Host "========================================" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERR] Failed to verify final state: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Phase 1 Complete ===" -ForegroundColor Cyan
