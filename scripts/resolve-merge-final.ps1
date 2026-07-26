# حلّ merge conflicts: بحسب القاعدة
# - customer/مشترك → خذ THEIRS (Stashed changes = شغل اليوزر)
# - seller (RatingsManagement) → خذ OURS (Updated upstream = شغل الزميلة)

param(
  [string]$FilePath,
  [ValidateSet("theirs", "ours")]
  [string]$Keep = "theirs"
)

if (-not (Test-Path $FilePath)) {
  Write-Host "❌ File not found: $FilePath" -ForegroundColor Red
  exit 1
}

$content = Get-Content $FilePath -Raw
$lines = $content -split "`r?`n"
$result = @()
$mode = "normal"

foreach ($line in $lines) {
  if ($line -match '^<<<<<<< ') {
    if ($Keep -eq "ours") {
      # نحتفظ بالـ OURS (السطور بين <<<<<<< و =======)
      $mode = "keep-ours"
    } else {
      # نشيل الـ OURS
      $mode = "skip-until-equals"
    }
    continue
  }
  if ($line -match '^=======$' -and $mode -in @("skip-until-equals", "keep-ours")) {
    if ($Keep -eq "ours") {
      # بنخلص مرحلة ours، من هلق لحد >>>>>>> نشيل
      $mode = "skip-until-end"
    } else {
      # بنخلص مرحلة skip، من هلق لحد >>>>>>> نحتفظ
      $mode = "keep-theirs"
    }
    continue
  }
  if ($line -match '^>>>>>>> ' -and $mode -in @("keep-theirs", "skip-until-end")) {
    $mode = "normal"
    continue
  }
  if ($mode -in @("normal", "keep-ours", "keep-theirs")) {
    $result += $line
  }
}

$cleaned = ($result -join "`n") -replace "`n`n`n+", "`n`n"
Set-Content -Path $FilePath -Value $cleaned -NoNewline

$remaining = (Select-String -Path $FilePath -Pattern '^(<<<<<<<|>>>>>>>)' -ErrorAction SilentlyContinue).Count
if ($remaining -eq 0) {
  $color = if ($Keep -eq "ours") { "Magenta" } else { "Green" }
  $tag = if ($Keep -eq "ours") { "OURS (seller)" } else { "THEIRS (customer)" }
  Write-Host "✅ $FilePath → $tag" -ForegroundColor $color
} else {
  Write-Host "⚠️  $FilePath → $remaining markers بقوا" -ForegroundColor Yellow
}
