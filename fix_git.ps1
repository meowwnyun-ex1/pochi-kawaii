# Quick Git Permission Fix
# Run this if you get "cannot open '.git/FETCH_HEAD': Permission denied"

Write-Host "Fixing Git permission issues..." -ForegroundColor Yellow

# Remove lock files
Remove-Item .git\FETCH_HEAD -Force -ErrorAction SilentlyContinue
Remove-Item .git\index.lock -Force -ErrorAction SilentlyContinue
Remove-Item .git\HEAD.lock -Force -ErrorAction SilentlyContinue
Remove-Item .git\config.lock -Force -ErrorAction SilentlyContinue

Write-Host "Lock files removed" -ForegroundColor Green

# Test Git
Write-Host "Testing Git..." -ForegroundColor Yellow
git status 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Git is working!" -ForegroundColor Green
} else {
    Write-Host "Git still has issues. Try:" -ForegroundColor Yellow
    Write-Host "  1. Close all Git/GitHub/Cursor/VS Code windows" -ForegroundColor Yellow
    Write-Host "  2. Run this script as Administrator" -ForegroundColor Yellow
    Write-Host "  3. Check antivirus settings" -ForegroundColor Yellow
}

