param([string]$FilePath)

# Extracts conflict blocks from a file and prints them side-by-side
$content = Get-Content $FilePath
$lines = @()
$i = 0
$blocks = @()

while ($i -lt $content.Count) {
  $line = $content[$i]
  if ($line -match '^<<<<<<< ') {
    $startIdx = $i
    # find =======
    $eqIdx = -1
    for ($j = $i + 1; $j -lt $content.Count; $j++) {
      if ($content[$j] -match '^=======$') { $eqIdx = $j; break }
    }
    # find >>>>>>>
    $endIdx = -1
    for ($j = $eqIdx + 1; $j -lt $content.Count; $j++) {
      if ($content[$j] -match '^>>>>>>> ') { $endIdx = $j; break }
    }
    $ours = $content[($startIdx+1)..($eqIdx-1)]
    $theirs = $content[($eqIdx+1)..($endIdx-1)]
    $blocks += [PSCustomObject]@{
      StartLine = $startIdx + 1
      EndLine   = $endIdx + 1
      Ours      = $ours
      Theirs    = $theirs
    }
    $i = $endIdx + 1
  } else {
    $i++
  }
}

return $blocks
