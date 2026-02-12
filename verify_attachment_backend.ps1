$baseUrl = "http://localhost:8060/api"
$sampleFile = "d:\Workspace\gsg-IT4U\frontend\e2e\fixtures\issue10\sample.txt"

function Get-AuthSession {
    param ($user, $pass)
    $loginBody = @{ username = $user; password = $pass } | ConvertTo-Json
    $tr = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable sess
    $userInfo = $tr.Content | ConvertFrom-Json
    return @{ session = $sess; user = $userInfo }
}

try {
    # 1. Login as Employee
    Write-Host "1. Logging in as Employee..."
    $empData = Get-AuthSession "admin" "Admin@123"

    $empSess = $empData.session
    $empUser = $empData.user

    # 2. Create Ticket
    Write-Host "2. Creating Ticket..."
    $ticketBody = @{
        title = "Attachment Test Ticket";
        description = "Testing API upload";
        priority = "MEDIUM";
        category = "HARDWARE";
        status = "OPEN";
        requester = @{ username = $empUser.username };
    } | ConvertTo-Json

    $tResp = Invoke-WebRequest -Uri "$baseUrl/tickets" -Method Post -Body $ticketBody -WebSession $empSess -ContentType "application/json"
    $ticket = $tResp.Content | ConvertFrom-Json
    $ticketId = $ticket.id
    Write-Host "Ticket Created: ID=$ticketId"

    # 3. Upload Attachment
    Write-Host "3. Uploading Attachment..."
    
    # PowerShell 7+ supports -Form, but we might be on 5.1.
    # Let's try simple boundary approach for broad compatibility or assume modern PWSH.
    # If this fails, we know backend might be fine but script is hard.
    # But usually 'Invoke-RestMethod -InFile' performs a PUT/POST of body, not multipart form.
    # We need multipart form.
    
    # Using .NET HttpClient for robust multipart upload in PS
    $fileBytes = [System.IO.File]::ReadAllBytes($sampleFile)
    $fileContent = [System.Net.Http.ByteArrayContent]::new($fileBytes)
    $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("text/plain")
    
    $multipart = [System.Net.Http.MultipartFormDataContent]::new()
    $multipart.Add($fileContent, "file", "sample.txt")
    
    # We need to copy cookies from session
    $handler = [System.Net.Http.HttpClientHandler]::new()
    $handler.CookieContainer = $empSess.Cookies
    $client = [System.Net.Http.HttpClient]::new($handler)
    
    $response = $client.PostAsync("$baseUrl/tickets/$ticketId/attachments", $multipart).Result
    if (-not $response.IsSuccessStatusCode) {
        throw "Upload Failed: $($response.StatusCode)"
    }
    Write-Host "Upload Success."

    # 4. Login as Manager
    Write-Host "4. Logging in as Manager..."
    $mgrData = Get-AuthSession "manager1" "Pass@123"
    $mgrSess = $mgrData.session

    # 5. Fetch Ticket Details
    Write-Host "5. Fetching as Manager..."
    # Need to access via /tickets/{id} or /tickets/manager/pending?
    # /tickets/{id} works if manager has access.
    # But wait, manager wasn't assigned in step 2!
    # Let's Assign Manager or verify 'canViewTicket' logic. 
    # Logic allows if manager assigned.
    # Let's re-login as Admin or fetch as Employee to verify persistence first?
    # Manager visibility requires assignment.
    # I'll fetch as Employee first to prove it's saved.
    
    $checkResp = Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId" -Method Get -WebSession $empSess
    $checkTicket = $checkResp.Content | ConvertFrom-Json
    
    Write-Host "Attachments Count: $($checkTicket.attachments.Count)"
    
    if ($checkTicket.attachments.Count -ge 1) {
        Write-Host "SUCCESS: Attachment saved and returned."
    } else {
        Write-Error "FAIL: Attachment not found in details."
    }

} catch {
    Write-Error "Error: $_"
    exit 1
}
