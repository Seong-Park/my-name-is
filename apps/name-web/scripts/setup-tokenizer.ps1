$ErrorActionPreference = 'Stop'
$taskArchive = Join-Path ([System.IO.Path]::GetTempPath()) ('name-tokenizer-' + [guid]::NewGuid().ToString() + '.zip')
$taskTarget = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.cache/deepseek_v4_tokenizer'))
Invoke-WebRequest -Uri 'https://cdn.deepseek.com/api-docs/deepseek_v4_tokenizer.zip' -OutFile $taskArchive
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskZip = [System.IO.Compression.ZipFile]::OpenRead($taskArchive)
try {
  [System.IO.Directory]::CreateDirectory($taskTarget) | Out-Null
  $taskExpected = @{
    'tokenizer.json' = '89085F12EF79460AC5F66D1119325DDFC694B4AB209D80BBD81D35F081DC9614'
    'tokenizer_config.json' = '841F8CF146E3F0AD1082594A31F68ECF7608C20467EF355081333D85BBAEB1CB'
  }
  foreach ($taskName in $taskExpected.Keys) {
    $taskEntry = $taskZip.GetEntry('deepseek_v4_tokenizer/' + $taskName)
    if ($null -eq $taskEntry -or $taskEntry.Length -gt 8000000) { throw 'Unexpected tokenizer archive' }
    $taskStream = $taskEntry.Open()
    $taskBytes = [System.IO.MemoryStream]::new()
    try { $taskStream.CopyTo($taskBytes) } finally { $taskStream.Dispose() }
    $taskData = $taskBytes.ToArray()
    $taskBytes.Dispose()
    $taskHash = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($taskData))
    if ($taskHash -ne $taskExpected[$taskName]) { throw 'Tokenizer changed; review before replacing pinned assets' }
    [System.IO.File]::WriteAllBytes((Join-Path $taskTarget $taskName), $taskData)
  }
  Write-Output 'PINNED_TOKENIZER_READY'
} finally {
  $taskZip.Dispose()
  Remove-Item -LiteralPath $taskArchive
}
