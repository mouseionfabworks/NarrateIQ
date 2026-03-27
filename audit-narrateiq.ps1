# NarrateIQ Project Structure Audit
# Run from: C:\Users\Concierge\Desktop\NarrateIQ PRD\narrateiq

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NarrateIQ Project Structure Audit" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get project root
$projectRoot = Get-Location
Write-Host "Project Root: $projectRoot" -ForegroundColor Yellow
Write-Host ""

# 1. Top-level directory structure
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TOP-LEVEL STRUCTURE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Get-ChildItem -Directory | Select-Object Name, @{Name="Items";Expression={(Get-ChildItem $_.FullName -Recurse -File).Count}}, @{Name="Size";Expression={"{0:N2} MB" -f ((Get-ChildItem $_.FullName -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB)}} | Format-Table -AutoSize
Write-Host ""

# 2. Check for multiple app entry points
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "APP ENTRY POINTS (Potential Duplication)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$entryPoints = @(
    "App.js",
    "App.tsx",
    "index.js",
    "index.tsx",
    "_layout.js",
    "_layout.tsx",
    "app/_layout.js",
    "app/_layout.tsx",
    "src/App.js",
    "src/index.js"
)
foreach ($entry in $entryPoints) {
    if (Test-Path $entry) {
        Write-Host "✓ FOUND: $entry" -ForegroundColor Green
        $lineCount = (Get-Content $entry | Measure-Object -Line).Lines
        Write-Host "  Lines: $lineCount" -ForegroundColor Gray
    }
}
Write-Host ""

# 3. Check for environment files
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ENVIRONMENT FILES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$envFiles = @(".env", ".env.example", ".env.local", ".env.production", "api/.env", "api/.env.example")
foreach ($env in $envFiles) {
    if (Test-Path $env) {
        Write-Host "✓ FOUND: $env" -ForegroundColor Green
        $content = Get-Content $env -Raw
        # Show variable names only, not values
        $vars = $content -split "`n" | Where-Object { $_ -match "^[A-Z_]+=.*" } | ForEach-Object { ($_ -split "=")[0] }
        Write-Host "  Variables: $($vars -join ', ')" -ForegroundColor Gray
    }
}
Write-Host ""

# 4. Check for config files
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CONFIG FILES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$configs = @("app.json", "app.config.js", "eas.json", "package.json", "babel.config.js", "metro.config.js")
foreach ($config in $configs) {
    if (Test-Path $config) {
        Write-Host "✓ FOUND: $config" -ForegroundColor Green
    } else {
        Write-Host "✗ MISSING: $config" -ForegroundColor Red
    }
}
Write-Host ""

# 5. Check for duplicate screens/components
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SCREEN FILES (Check for duplicates)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Get-ChildItem -Recurse -Filter "*Screen.js" -File | Select-Object FullName, @{Name="Lines";Expression={(Get-Content $_.FullName | Measure-Object -Line).Lines}} | Format-Table -AutoSize
Write-Host ""

# 6. Check API/backend structure
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API/BACKEND STRUCTURE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
if (Test-Path "api") {
    Write-Host "✓ api/ folder exists" -ForegroundColor Green
    Get-ChildItem "api" -File | Select-Object Name, @{Name="Lines";Expression={(Get-Content $_.FullName | Measure-Object -Line).Lines}} | Format-Table -AutoSize
    if (Test-Path "api/routes") {
        Write-Host "  Routes:" -ForegroundColor Gray
        Get-ChildItem "api/routes" -File | Select-Object Name | Format-Table -AutoSize
    }
} else {
    Write-Host "✗ api/ folder NOT FOUND" -ForegroundColor Red
}
Write-Host ""

# 7. Check for web/admin/waitlist folders
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WEB DEPLOYMENTS (Waitlist/Admin)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$webFolders = @("web", "waitlist", "admin", "public", "dist", "build", "out")
foreach ($folder in $webFolders) {
    if (Test-Path $folder) {
        Write-Host "✓ FOUND: $folder/" -ForegroundColor Green
        $fileCount = (Get-ChildItem $folder -Recurse -File).Count
        Write-Host "  Files: $fileCount" -ForegroundColor Gray
    }
}
Write-Host ""

# 8. Check package.json scripts
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NPM SCRIPTS (from package.json)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
if (Test-Path "package.json") {
    $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
    $pkg.scripts.PSObject.Properties | Select-Object Name, Value | Format-Table -AutoSize
}
Write-Host ""

# 9. Git status (if available)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GIT STATUS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
if (Get-Command git -ErrorAction SilentlyContinue) {
    git status --short
    Write-Host ""
    Write-Host "Recent commits:" -ForegroundColor Gray
    git log --oneline -5
} else {
    Write-Host "Git not available" -ForegroundColor Yellow
}
Write-Host ""

# 10. Check for node_modules bloat
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPENDENCY HEALTH" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
if (Test-Path "node_modules") {
    $nodeModulesSize = (Get-ChildItem "node_modules" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB
    Write-Host "node_modules size: $($nodeModulesSize.ToString('F2')) GB" -ForegroundColor $(if ($nodeModulesSize -gt 2) { "Red" } else { "Green" })
}
if (Test-Path "package-lock.json") {
    Write-Host "✓ package-lock.json exists (dependency versions locked)" -ForegroundColor Green
} else {
    Write-Host "✗ package-lock.json missing (dependencies may drift)" -ForegroundColor Yellow
}
Write-Host ""

# 11. Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT READINESS CHECKLIST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$checks = @(
    @{Name="Mobile app code (app/ folder)"; Test=(Test-Path "app")},
    @{Name="Backend API code (api/ folder)"; Test=(Test-Path "api")},
    @{Name="Environment config (.env)"; Test=(Test-Path ".env")},
    @{Name="EAS build config (eas.json)"; Test=(Test-Path "eas.json")},
    @{Name="App config (app.config.js or app.json)"; Test=((Test-Path "app.config.js") -or (Test-Path "app.json"))},
    @{Name="Waitlist/Admin web code"; Test=((Test-Path "waitlist") -or (Test-Path "admin") -or (Test-Path "web"))}
)

foreach ($check in $checks) {
    if ($check.Test) {
        Write-Host "✓ $($check.Name)" -ForegroundColor Green
    } else {
        Write-Host "✗ $($check.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Audit complete. Review output above." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan