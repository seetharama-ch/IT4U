$ports = @(80, 443, 8060)
Write-Host "=== IT4U Port Verification ===" -ForegroundColor Cyan
foreach ($p in $ports) {
  Write-Host "`n=== Port $p ===" -ForegroundColor Yellow
  $proc = netstat -ano | findstr ":$p"
  if ($proc) {
      $proc
  } else {
      Write-Host "  (No process listening)" -ForegroundColor Gray
  }
}
Write-Host "`n=== Done ===" -ForegroundColor Cyan
