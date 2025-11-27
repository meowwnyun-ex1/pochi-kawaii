# Fix Git Permission Issues
# This script fixes common Git permission problems on Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git Permission Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}

Set-Location $projectRoot

# Check if .git directory exists
if (-not (Test-Path ".git")) {
    Write-Host "Error: .git directory not found. Are you in a Git repository?" -ForegroundColor Red
    exit 1
}

Write-Host "Project Root: $projectRoot" -ForegroundColor Yellow
Write-Host ""

# Step 1: Remove lock files
Write-Host "[1/5] Removing lock files..." -ForegroundColor Yellow
$lockFiles = @(
    ".git/index.lock",
    ".git/FETCH_HEAD.lock",
    ".git/HEAD.lock",
    ".git/config.lock",
    ".git/refs/heads/*.lock"
)

foreach ($lockFile in $lockFiles) {
    if (Test-Path $lockFile) {
        try {
            Remove-Item $lockFile -Force -ErrorAction Stop
            Write-Host "  ✓ Removed: $lockFile" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Failed to remove: $lockFile - $_" -ForegroundColor Red
        }
    }
}

# Step 2: Fix FETCH_HEAD permission
Write-Host ""
Write-Host "[2/5] Fixing FETCH_HEAD permissions..." -ForegroundColor Yellow
$fetchHead = ".git/FETCH_HEAD"
if (Test-Path $fetchHead) {
    try {
        # Remove read-only attribute
        $file = Get-Item $fetchHead -Force
        $file.Attributes = $file.Attributes -band (-bnot [System.IO.FileAttributes]::ReadOnly)
        
        # Try to delete and recreate
        Remove-Item $fetchHead -Force -ErrorAction Stop
        Write-Host "  ✓ Removed FETCH_HEAD" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ Could not remove FETCH_HEAD: $_" -ForegroundColor Yellow
        Write-Host "    This is usually OK - Git will recreate it when needed" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✓ FETCH_HEAD does not exist (will be created when needed)" -ForegroundColor Green
}

# Step 3: Fix .git directory permissions
Write-Host ""
Write-Host "[3/5] Fixing .git directory permissions..." -ForegroundColor Yellow
try {
    $gitDir = Get-Item ".git" -Force
    $gitDir.Attributes = $gitDir.Attributes -band (-bnot [System.IO.FileAttributes]::ReadOnly)
    Write-Host "  ✓ Fixed .git directory permissions" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Could not fix .git directory permissions: $_" -ForegroundColor Yellow
}

# Step 4: Clean Git cache
Write-Host ""
Write-Host "[4/5] Cleaning Git cache..." -ForegroundColor Yellow
try {
    git gc --prune=now 2>&1 | Out-Null
    Write-Host "  ✓ Git cache cleaned" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Git gc failed: $_" -ForegroundColor Yellow
}

# Step 5: Test Git commands
Write-Host ""
Write-Host "[5/5] Testing Git commands..." -ForegroundColor Yellow
try {
    $status = git status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Git status works" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Git status failed" -ForegroundColor Red
        Write-Host "    Output: $status" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Git command failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you still encounter permission errors:" -ForegroundColor Yellow
Write-Host "  1. Close all Git/GitHub/Cursor/VS Code windows" -ForegroundColor Yellow
Write-Host "  2. Run this script as Administrator" -ForegroundColor Yellow
Write-Host "  3. Check if antivirus is blocking .git folder" -ForegroundColor Yellow
Write-Host ""

