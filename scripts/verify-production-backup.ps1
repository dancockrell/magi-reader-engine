param([Parameter(Mandatory=$true)][string]$Backup)
$ErrorActionPreference='Stop'
$release=gh api repos/dancockrell/magi-reader-engine/releases/tags/v0.9.7-current | ConvertFrom-Json
if($LASTEXITCODE -ne 0){throw 'Cannot read remote release'}
$files=Get-ChildItem -LiteralPath $Backup -File | Where-Object {$_.Extension -in @('.zip','.json','.txt','.mp4')}
foreach($file in $files){
  $asset=$release.assets | Where-Object name -eq $file.Name
  if(@($asset).Count -ne 1){throw "Missing remote asset: $($file.Name)"}
  $hash='sha256:'+(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLower()
  if($asset.size -ne $file.Length -or $asset.digest -ne $hash){throw "Remote integrity mismatch: $($file.Name)"}
  Write-Output "Verified on GitHub: $($file.Name)"
}
