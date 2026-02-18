param(
    [string]$ImagePath,
    [string]$PrinterName
)

Add-Type -AssemblyName System.Drawing

$pd = New-Object System.Drawing.Printing.PrintDocument
$pd.PrinterSettings.PrinterName = $PrinterName

# Set default paper size to 4R (4x6 inch) and remove margins
try {
    $paperSize = $pd.PrinterSettings.PaperSizes |
        Where-Object { $_.PaperName -match "4R" -or $_.PaperName -match "4x6" } |
        Select-Object -First 1

    if (-not $paperSize) {
        # 4x6 inch in hundredths of an inch (System.Drawing unit)
        $paperSize = New-Object System.Drawing.Printing.PaperSize("4R", 400, 600)
    }

    $pd.DefaultPageSettings.PaperSize = $paperSize
    $pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
} catch {
    # If anything fails, fall back to driver defaults
}

$pd.Add_PrintPage({
    param($sender, $e)

    $img = [System.Drawing.Image]::FromFile($ImagePath)
    
    # Always use full page bounds for photo printing so large paper
    # is filled as much as possible while keeping aspect ratio.
    $printableArea = $e.PageBounds

    # Determine orientation
    if ($img.Width -gt $img.Height) {
        $e.PageSettings.Landscape = $true
    }

    # Calculate Scale to FIT (preserve aspect ratio)
    $ratioX = $printableArea.Width / $img.Width
    $ratioY = $printableArea.Height / $img.Height
    $ratio = [Math]::Min($ratioX, $ratioY)

    $newWidth = $img.Width * $ratio
    $newHeight = $img.Height * $ratio

    # Center the image on the page
    $posX = $printableArea.Left + ($printableArea.Width - $newWidth) / 2
    $posY = $printableArea.Top + ($printableArea.Height - $newHeight) / 2

    $e.Graphics.DrawImage($img, $posX, $posY, $newWidth, $newHeight)
    
    $img.Dispose()
})

$tempImg = [System.Drawing.Image]::FromFile($ImagePath)
if ($tempImg.Width -gt $tempImg.Height) {
    $pd.DefaultPageSettings.Landscape = $true
}
$tempImg.Dispose()

$pd.Print()
