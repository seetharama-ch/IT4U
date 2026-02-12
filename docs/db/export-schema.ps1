# Export-Schema.ps1
# Exports the PostgreSQL schema for IT4U

$ErrorActionPreference = "Stop"

# Configuration - Defaults to properties found in config
$DbName = "it4u"
$DbUser = "it4u_user"
$DbHost = "localhost"

# Check for pg_dump availability
if (-not (Get-Command "pg_dump" -ErrorAction SilentlyContinue)) {
    Write-Warning "pg_dump not found in PATH. Please install PostgreSQL tools or add to PATH."
    exit 1
}

$OutputSql = Join-Path $PSScriptRoot "schema.sql"
$OutputMd = Join-Path $PSScriptRoot "schema.md"

Write-Host "Exporting Schema for DB '$DbName' to $OutputSql ..."

try {
    # Export Schema SQL
    # Note: Requires PGPASSWORD env var or .pgpass if password needed, 
    # or trusted auth for localhost.
    & pg_dump --schema-only --no-owner --no-privileges --host=$DbHost --username=$DbUser --file=$OutputSql $DbName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SQL Schema exported." -ForegroundColor Green
    } else {
        Write-Error "pg_dump failed with exit code $LASTEXITCODE"
    }

    # Generate Markdown Summary (Simple parsing of CREATE TABLE lines)
    Write-Host "Generating Markdown summary..."
    $SchemaContent = Get-Content $OutputSql
    
    $MdContent = @("# Database Schema Reference", "", "## Tables", "")
    
    $CurrentTable = ""
    $Columns = @()

    foreach ($line in $SchemaContent) {
        if ($line -match "CREATE TABLE public\.(\w+)") {
            if ($CurrentTable) {
                $MdContent += "### Table: $CurrentTable"
                $MdContent += "| Column | Type |"
                $MdContent += "| --- | --- |"
                $MdContent += $Columns
                $MdContent += ""
            }
            $CurrentTable = $Matches[1]
            $Columns = @()
        } elseif ($CurrentTable -and $line -match "^\s+(\w+)\s+([\w\(\)]+)") {
            $ColName = $Matches[1]
            $ColType = $Matches[2]
            $Columns += "| $ColName | $ColType |"
        }
    }
    # Add last table
     if ($CurrentTable) {
        $MdContent += "### Table: $CurrentTable"
        $MdContent += "| Column | Type |"
        $MdContent += "| --- | --- |"
        $MdContent += $Columns
        $MdContent += ""
    }

    $MdContent | Set-Content $OutputMd
    Write-Host "✅ Markdown Schema summary generated: $OutputMd" -ForegroundColor Green

} catch {
    Write-Error "Export failed: $_"
}
