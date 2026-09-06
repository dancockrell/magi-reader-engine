param([Parameter(Mandatory=$true)][string]$Source,[Parameter(Mandatory=$true)][string]$Output)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
New-Item -ItemType Directory -Force -Path $Output | Out-Null
$root=(Resolve-Path -LiteralPath $Source).Path
$files=Get-ChildItem -LiteralPath $root -File -Recurse | Where-Object {
  $rel=$_.FullName.Substring($root.Length+1)
  $rel -notmatch '^(node_modules|dist|work-npm-cache|test-results|\.git)(\\|/)' -and
  $rel -notmatch '^tools[\\/]ffmpeg[\\/]' -and
  $_.Name -notmatch '^(\.env|debug\.log)' -and
  $_.Extension -notin @('.exe','.dll','.pem','.key')
} | Sort-Object FullName
$records=[System.Collections.Generic.List[object]]::new()
$part=0; $size=0; $zip=$null
try {
  foreach($file in $files) {
    if($null -eq $zip -or $size+$file.Length -gt 1400000000) {
      if($null -ne $zip){$zip.Dispose()}
      $part++; $size=0
      $name='production-{0:d3}.zip' -f $part
      $zip=[System.IO.Compression.ZipFile]::Open((Join-Path $Output $name),'Create')
      Write-Output "Packing $name"
    }
    $rel=$file.FullName.Substring($root.Length+1).Replace('\','/')
    $hash=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLower()
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file.FullName,$rel,[System.IO.Compression.CompressionLevel]::NoCompression) | Out-Null
    $records.Add([pscustomobject]@{path=$rel;bytes=$file.Length;sha256=$hash;archive=$name})
    $size+=$file.Length
  }
} finally {if($null -ne $zip){$zip.Dispose()}}
$records | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $Output 'production-manifest.json') -Encoding utf8
Get-ChildItem -LiteralPath $Output -Filter '*.zip' | ForEach-Object {
  $h=Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256
  "$($h.Hash.ToLower())  $($_.Name)"
} | Set-Content -LiteralPath (Join-Path $Output 'SHA256SUMS.txt') -Encoding ascii
Write-Output "Packed $($records.Count) files in $part archives."
