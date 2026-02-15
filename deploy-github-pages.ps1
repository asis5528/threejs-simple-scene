param(
  [Parameter(Mandatory = $false)]
  [string]$GitHubUser,

  [Parameter(Mandatory = $false)]
  [string]$RepoName = "threejs-simple-scene",

  [Parameter(Mandatory = $false)]
  [string]$Token = $env:GITHUB_TOKEN,

  [Parameter(Mandatory = $false)]
  [string]$CustomDomain
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Ensure-SafeGitDirectory {
  param([string]$Path)
  try {
    git -C $Path status | Out-Null
  } catch {
    $msg = $_.Exception.Message
    if ($msg -match "dubious ownership") {
      git config --global --add safe.directory $Path | Out-Null
    } else {
      throw
    }
  }
}

function Invoke-GitHubApi {
  param(
    [Parameter(Mandatory = $true)][ValidateSet("GET", "POST", "PUT", "PATCH")][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [Parameter(Mandatory = $false)]$Body
  )

  $headers = @{
    Authorization = "Bearer $Token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
  }

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
  }

  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -ContentType "application/json" -Body $json
}

function Get-StatusCodeFromException {
  param($Ex)
  try {
    return [int]$Ex.Exception.Response.StatusCode
  } catch {
    return -1
  }
}

if (-not $Token) {
  $secureToken = Read-Host "Enter GitHub token (repo + pages scope)" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
  try {
    $Token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if (-not $Token) {
  throw "Missing GitHub token."
}

Require-Command git
Ensure-SafeGitDirectory -Path (Get-Location).Path

$requiredFiles = @("index.html", "main.js", "styles.css")
foreach ($f in $requiredFiles) {
  if (-not (Test-Path $f)) {
    throw "Missing required file: $f"
  }
}

if (-not $GitHubUser) {
  $me = Invoke-GitHubApi -Method GET -Uri "https://api.github.com/user"
  $GitHubUser = $me.login
}

Write-Host "[1/7] Preparing git repository..."
if (-not (Test-Path ".git")) {
  git init | Out-Null
}

git checkout -B main | Out-Null

$prevErr = $ErrorActionPreference
$ErrorActionPreference = "Continue"
git add index.html main.js styles.css README.md deploy-github-pages.ps1 2>$null
$ErrorActionPreference = $prevErr
if ($LASTEXITCODE -ne 0) {
  throw "git add failed with exit code $LASTEXITCODE"
}
$pending = git status --porcelain
if ($pending) {
  git commit -m "Initial Three.js scene" | Out-Null
}

$repoApi = "https://api.github.com/repos/$GitHubUser/$RepoName"
$repoUrl = "https://github.com/$GitHubUser/$RepoName.git"
$authedUrl = "https://$GitHubUser`:$Token@github.com/$GitHubUser/$RepoName.git"

Write-Host "[2/7] Creating GitHub repository if needed..."
$repoExists = $true
try {
  Invoke-GitHubApi -Method GET -Uri $repoApi | Out-Null
} catch {
  $repoExists = $false
}

if (-not $repoExists) {
  try {
    Invoke-GitHubApi -Method POST -Uri "https://api.github.com/user/repos" -Body @{
      name = $RepoName
      "private" = $false
      description = "Simple Three.js scene"
    } | Out-Null
  } catch {
    $code = Get-StatusCodeFromException -Ex $_
    if ($code -eq 403 -or $code -eq 404) {
      throw @"
GitHub token cannot create repositories via API (HTTP $code).
Use a token with sufficient repository permissions, then rerun.

Recommended:
- Classic PAT scope: repo
or
- Fine-grained token permissions:
  - Repository access: All repositories (or include $RepoName)
  - Contents: Read and write
  - Administration: Read and write
  - Pages: Read and write

Fallback:
1) Create https://github.com/$GitHubUser/$RepoName manually.
2) Rerun this script; it will skip repo creation and continue.
"@
    }
    throw
  }
}

Write-Host "[3/7] Configuring remote..."
$hasOrigin = $false
try {
  git remote get-url origin | Out-Null
  $hasOrigin = $true
} catch {
  $hasOrigin = $false
}

if ($hasOrigin) {
  git remote set-url origin $authedUrl
} else {
  git remote add origin $authedUrl
}

Write-Host "[4/7] Pushing to GitHub..."
git push -u origin main | Out-Null

Write-Host "[5/7] Cleaning remote URL (remove token)..."
git remote set-url origin $repoUrl

Write-Host "[6/7] Enabling GitHub Pages..."
try {
  Invoke-GitHubApi -Method POST -Uri "https://api.github.com/repos/$GitHubUser/$RepoName/pages" -Body @{
    source = @{
      branch = "main"
      path = "/"
    }
  } | Out-Null
} catch {
  # If already configured, continue.
}

if ($CustomDomain) {
  Write-Host "[7/7] Setting custom domain..."
  Invoke-GitHubApi -Method PUT -Uri "https://api.github.com/repos/$GitHubUser/$RepoName/pages" -Body @{
    cname = $CustomDomain
    https_enforced = $true
  } | Out-Null
} else {
  Write-Host "[7/7] Skipping custom domain (not provided)."
}

$pagesUrl = "https://$GitHubUser.github.io/$RepoName/"
Write-Host ""
Write-Host "Done."
Write-Host "Repo:  https://github.com/$GitHubUser/$RepoName"
Write-Host "Site:  $pagesUrl"
if ($CustomDomain) {
  Write-Host "Domain: https://$CustomDomain"
}
Write-Host ""
Write-Host "Note: first Pages deploy may take 1-3 minutes."
