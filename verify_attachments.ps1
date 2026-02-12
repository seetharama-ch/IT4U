# Attachment Flow Verification Script
# Usage: ./verify_attachments.ps1

$baseUrl = "http://localhost:8060/api"
$testPng = "test.png"
$testTxt = "test.txt"

# --- Helper Functions ---
function Login($user, $pass) {
    try {
        $body = @{ username = $user; password = $pass } | ConvertTo-Json
        # Use a local variable first, then promote to Script scope
        $res = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $body -SessionVariable "localSession"
        
        # Manually set the dynamic session variable in Script scope
        Set-Variable -Name "session_$user" -Value $localSession -Scope Script
        
        return $res
    }
    catch {
        Write-Error "Login Failed: $user"
        $_.Exception.Response
        exit 1
    }
}

function Upload-Attachment($ticketId, $filePath, $session) {
    # Resolve absolute path to ensure .NET finds the file regardless of process CWD
    $absPath = (Resolve-Path $filePath).Path
    $fileBytes = [System.IO.File]::ReadAllBytes($absPath)
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"

    $headers = @{ "Content-Type" = "multipart/form-data; boundary=$boundary" }
    
    $bodyLines = @()
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"file`"; filename=`"$(Split-Path $filePath -Leaf)`""
    
    # Determine MIME type
    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
    $mimeType = "application/octet-stream"
    if ($ext -eq ".png") { $mimeType = "image/png" }
    elseif ($ext -eq ".txt") { $mimeType = "text/plain" }
    elseif ($ext -eq ".jpg") { $mimeType = "image/jpeg" }
    elseif ($ext -eq ".pdf") { $mimeType = "application/pdf" }

    $bodyLines += "Content-Type: $mimeType$LF"
    $bodyLines += [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetString($fileBytes)
    $bodyLines += "--$boundary--$LF"

    $bodyStr = $bodyLines -join "$LF"

    try {
        $res = Invoke-RestMethod -Uri "$baseUrl/tickets/$ticketId/attachments" -Method Post -Headers $headers -Body $bodyStr -WebSession $session
        Write-Host "Upload Success: $($res.filename)" -ForegroundColor Green
        return $res
    }
    catch {
        Write-Error "Upload Failed: $($_.Exception.Message)"
        return $null
    }
}

function Download-Attachment($filename, $session, $roleName) {
    try {
        # Note: Code analysis shows route is /api/tickets/attachments/{filename}
        $url = "$baseUrl/tickets/attachments/$filename"
        $res = Invoke-WebRequest -Uri $url -Method Get -WebSession $session
        if ($res.StatusCode -eq 200) {
            Write-Host "Download Success by $roleName" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Download Failed by $roleName : $($_.Exception.Message)" -ForegroundColor Red
    }
}

# --- Execution Flow ---

Write-Host ">>> Starting Attachment Regression..."

# 1. Login
$emp = Login "emp_direct_api" "password"
$mgr = Login "mgr_api" "password"
$adm = Login "admin" "password"

# 2. Create Ticket as Employee
$ticketBody = @{
    title       = "Attachment Test Ticket";
    description = "Testing uploads";
    category    = "HARDWARE";
    requester   = @{ username = "emp_direct_api" }
} | ConvertTo-Json

$ticket = Invoke-RestMethod -Uri "$baseUrl/tickets" -Method Post -ContentType "application/json" -Body $ticketBody -WebSession $session_emp_direct_api
$ticketId = $ticket.id
Write-Host "Ticket Created: #$ticketId"


# 3. Upload Attachment (Employee)
$u1 = Upload-Attachment $ticketId $testPng $session_emp_direct_api

# Verify Count == 1
$ticketCheck1 = Invoke-RestMethod -Uri "$baseUrl/tickets/$ticketId" -Method Get -WebSession $session_emp_direct_api
$count1 = $ticketCheck1.attachments.Count
Write-Host "Attachment Count after 1 upload: $count1"
if ($count1 -ne 1) { 
    Write-Error "FAILURE: Expected 1 attachment, found $count1" 
    # Print attachments for debugging
    $ticketCheck1.attachments | Format-List
    exit 1
}
else {
    Write-Host "SUCCESS: 1 Attachment found." -ForegroundColor Green
}

$u2 = Upload-Attachment $ticketId $testTxt $session_emp_direct_api

# Verify Count == 2 (and NOT more)
$ticketCheck2 = Invoke-RestMethod -Uri "$baseUrl/tickets/$ticketId" -Method Get -WebSession $session_emp_direct_api
$count2 = $ticketCheck2.attachments.Count
Write-Host "Attachment Count after 2 uploads: $count2"

if ($count2 -ne 2) { 
    Write-Error "FAILURE: Expected 2 attachments, found $count2. Duplicate issue might persist." 
    $ticketCheck2.attachments | Format-List
    exit 1
}
else {
    Write-Host "SUCCESS: 2 Attachments found. No Duplicates." -ForegroundColor Green
}

if (-not $u1) { Write-Error "Stop: Upload failed"; exit 1 }
$filename1 = $u1.fileUrl 
$targetFile = $u1.fileUrl 

# 4. Verify Downloads (Happy Path)
Write-Host "`n--- Happy Path Downloads ---"
Download-Attachment $targetFile $session_emp_direct_api "Owner (Employee)"
Download-Attachment $targetFile $session_mgr_api "Manager"
Download-Attachment $targetFile $session_admin "Admin"

# 5. Security Test (Negative)
Write-Host "`n--- Security Tests ---"
# Test A: Unrelated Employee Access (using another employee)
$otherEmp = Login "emp_appr_api" "password"
try {
    $url = "$baseUrl/tickets/attachments/$targetFile"
    $res = Invoke-WebRequest -Uri $url -Method Get -WebSession $session_emp_appr_api
    if ($res.StatusCode -eq 200) {
        Write-Host "SECURITY WARNING: Unrelated Employee COULD download file." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Access Denied for Unrelated Employee (GOOD)." -ForegroundColor Green
}

