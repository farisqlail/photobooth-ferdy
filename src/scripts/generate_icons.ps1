Add-Type -AssemblyName System.Drawing

function Create-Icon($size, $text, $path) {
    $fullPath = Join-Path $PWD $path
    Write-Host "Creating icon at $fullPath"
    
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Black)
    
    # Cast size to float to resolve ambiguity
    $fontSize = [float]($size / 3)
    $fontStyle = [System.Drawing.FontStyle]::Bold
    $font = New-Object System.Drawing.Font "Arial", $fontSize, $fontStyle
    
    $brush = [System.Drawing.Brushes]::White
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
    $g.DrawString($text, $font, $brush, $rect, $format)
    
    $bmp.Save($fullPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Create-Icon 192 "PB" "public\icons\icon-192x192.png"
Create-Icon 512 "PB" "public\icons\icon-512x512.png"
