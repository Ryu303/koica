# KOICA Audio Guide Track Generator
# Extends short system sound clips into 45-second tracks by appending silence.

$audioDir = "C:\Users\Administrator\.gemini\antigravity-ide\scratch\koica-audio-guide\public\audio"
$srcFiles = @(
    "chimes.wav",
    "chord.wav",
    "ding.wav",
    "notify.wav",
    "recycle.wav",
    "tada.wav",
    "Windows Background.wav",
    "Windows Balloon.wav",
    "Windows Default.wav",
    "Windows Ding.wav"
)

$targetDuration = 10 # 10 seconds target duration to reduce file size for GitHub web upload

Write-Host "Generating extended 45-second tracks..." -ForegroundColor Cyan

for ($i = 0; $i -lt $srcFiles.Length; $i++) {
    $srcName = $srcFiles[$i]
    $srcPath = "C:\Windows\Media\$srcName"
    $destPath = "$audioDir\track$($i + 1).wav"
    
    if (-not (Test-Path $srcPath)) {
        Write-Host "Source file not found: $srcPath" -ForegroundColor Red
        continue
    }
    
    try {
        $bytes = [System.IO.File]::ReadAllBytes($srcPath)
        
        # Read byte rate at byte offset 28 (4 bytes)
        $byteRate = [System.BitConverter]::ToUInt32($bytes, 28)
        
        # Calculate sizes
        $targetDataSize = $byteRate * $targetDuration
        $headerSize = 44
        $originalDataSize = $bytes.Length - $headerSize
        
        # Prepare header bytes
        $newHeader = [byte[]]::new($headerSize)
        [Array]::Copy($bytes, 0, $newHeader, 0, $headerSize)
        
        # Update ChunkSize (File length - 8)
        $newFileSize = $headerSize + $targetDataSize
        $chunkSizeVal = [System.BitConverter]::GetBytes([uint32]($newFileSize - 8))
        [Array]::Copy($chunkSizeVal, 0, $newHeader, 4, 4)
        
        # Update Subchunk2Size (Data size)
        $subchunk2SizeVal = [System.BitConverter]::GetBytes([uint32]$targetDataSize)
        [Array]::Copy($subchunk2SizeVal, 0, $newHeader, 40, 4)
        
        # Create file stream and write
        $fs = New-Object System.IO.FileStream($destPath, [System.IO.FileMode]::Create)
        
        # Write header
        $fs.Write($newHeader, 0, $headerSize)
        
        # Write original chime data
        $originalDataLength = [Math]::Min($originalDataSize, $targetDataSize)
        $fs.Write($bytes, $headerSize, $originalDataLength)
        
        # Write silence (PCM 16-bit silence is 0)
        $silenceNeeded = $targetDataSize - $originalDataLength
        if ($silenceNeeded -gt 0) {
            $chunkSize = [Math]::Min($silenceNeeded, 65536)
            $chunk = [byte[]]::new($chunkSize) # filled with 0s by default in .NET
            $written = 0
            while ($written -lt $silenceNeeded) {
                $toWrite = [Math]::Min($silenceNeeded - $written, $chunk.Length)
                $fs.Write($chunk, 0, $toWrite)
                $written += $toWrite
            }
        }
        
        $fs.Close()
        Write-Host "Generated track$($i+1).wav ($targetDuration sec, $newFileSize bytes) from $srcName" -ForegroundColor Green
    } catch {
        Write-Host "Failed to generate track$($i+1).wav: $_" -ForegroundColor Red
    }
}

Write-Host "Done!" -ForegroundColor Cyan
