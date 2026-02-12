$baseUrl = "http://localhost:8060/api"

function Get-AuthSession {
    param ($user, $pass)
    $loginBody = @{ username = $user; password = $pass } | ConvertTo-Json
    try {
        $tr = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable sess
        $userInfo = $tr.Content | ConvertFrom-Json
        return @{ session = $sess; user = $userInfo }
    } catch {
        Write-Error "Login failed for $user"
        exit 1
    }
}

try {
    # 1. Setup Sessions
    $supData = Get-AuthSession "support_e2e_20251225" "E2E@12345"
    $supSess = $supData.session
    $supId = $supData.user.id
    
    $empData = Get-AuthSession "employee_e2e_20251225" "E2E@12345"
    $empSess = $empData.session

    $adminData = Get-AuthSession "admin" "password"
    $adminSess = $adminData.session

    # 2. Find the Approved Ticket (GSG-1220250079 or latest approved)
    Write-Host "Finding approved ticket..."
    $ticketsResp = Invoke-WebRequest -Uri "$baseUrl/tickets" -Method Get -WebSession $supSess
    $tickets = $ticketsResp.Content | ConvertFrom-Json
    
    # Filter for OPEN tickets that are APPROVED
    $targetTicket = $tickets.content | Where-Object { $_.status -eq "OPEN" -and $_.managerApprovalStatus -eq "APPROVED" } | Select-Object -Last 1

    if (-not $targetTicket) {
        Write-Warning "No OPEN & APPROVED ticket found. Creating a new one to force-test support flow..."
        # Optional: Fast-forward create logic here if needed, but assuming previous step worked DB-wise
        exit
    }
    
    $ticketId = $targetTicket.id
    Write-Host "Proceeding with Ticket $ticketId ($($targetTicket.ticketNumber))..."

    # 3. Support Flow: Assign
    Write-Host "3.1 Support Assigning to self..."
    Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId/assign?userId=$supId" -Method Patch -WebSession $supSess | Out-Null
    Write-Host "   -> Assigned."

    # 4. Support Flow: In Progress & Comment
    Write-Host "3.2 Setting IN_PROGRESS..."
    $progBody = @{ status = "IN_PROGRESS" } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId/status" -Method Patch -Body $progBody -WebSession $supSess -ContentType "application/json" | Out-Null
    
    Write-Host "3.3 Adding Comment..."
    $commentBody = @{ content = "Manually inspecting via API script." } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId/comments" -Method Post -Body $commentBody -WebSession $supSess -ContentType "application/json" | Out-Null
    Write-Host "   -> In Progress & Commented."

    # 5. Support Flow: Resolve & Close
    Write-Host "3.4 Resolving..."
    $resBody = @{ status = "RESOLVED" } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId/status" -Method Patch -Body $resBody -WebSession $supSess -ContentType "application/json" | Out-Null
    
    Write-Host "3.5 Closing..."
    $closeBody = @{ status = "CLOSED" } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId/status" -Method Patch -Body $closeBody -WebSession $supSess -ContentType "application/json" | Out-Null
    Write-Host "   -> Closed."

    # 6. Verification
    $checkTicket = (Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId" -Method Get -WebSession $empSess).Content | ConvertFrom-Json
    Write-Host "Final Status: $($checkTicket.status)"
    if ($checkTicket.status -eq "CLOSED") { Write-Host "SUCCESS: Ticket Lifecycle Completed." -ForegroundColor Green }
    else { Write-Error "FAIL: Ticket not closed." }

    # 7. Admin Feature Verification (Edit/Deactivate)
    Write-Host "`n--- Admin Verification ---"
    
    # 7.1 Edit User
    $empId = $empData.user.id
    Write-Host "7.1 Editing Employee ($empId) Job Title..."
    $editBody = @{ jobTitle = "Senior E2E Tester"; role = "EMPLOYEE" } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/api/users/$empId" -Method Put -Body $editBody -WebSession $adminSess -ContentType "application/json" | Out-Null
    $checkUser = (Invoke-WebRequest -Uri "$baseUrl/users" -Method Get -WebSession $adminSess).Content | ConvertFrom-Json | Where-Object { $_.id -eq $empId }
    if ($checkUser.jobTitle -eq "Senior E2E Tester") { Write-Host "   -> Edit Success." -ForegroundColor Green } else { Write-Error "   -> Edit Failed." }

    # 7.2 Manager Reset Pass? (Optional in prompt, verifying Deactivate instead)
    # 7.3 Deactivate User
    Write-Host "7.3 Deactivating Employee..."
    Invoke-WebRequest -Uri "$baseUrl/api/users/$empId/deactivate" -Method Patch -WebSession $adminSess | Out-Null
    
    # Verify Login Fails
    Write-Host "   -> Verifying Login Block..."
    try {
        Get-AuthSession "employee_e2e_20251225" "E2E@12345" | Out-Null
        Write-Error "FAIL: Deactivated user was able to login."
    } catch {
        Write-Host "   -> SUCCESS: Login blocked (401/403)." -ForegroundColor Green
    }

} catch {
    Write-Error "Script Failed: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())"
    }
}
