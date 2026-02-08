param(
    [string]$ImagePath,
    [string]$PrinterName
)

Add-Type -AssemblyName System.Drawing

$pd = New-Object System.Drawing.Printing.PrintDocument
$pd.PrinterSettings.PrinterName = $PrinterName

$pd.Add_PrintPage({
    param($sender, $e)

    $img = [System.Drawing.Image]::FromFile($ImagePath)
    
    # Get printable area
    $printableArea = $e.MarginBounds
    # If margins are huge (default), use PageBounds (full page) for photo printing
    if ($e.PageSettings.HardMarginX -lt 10 -and $e.PageSettings.HardMarginY -lt 10) {
         # Assume photo printer, try to use full page
         $printableArea = $e.PageBounds
    }

    # Determine orientation
    if ($img.Width -gt $img.Height) {
        $e.PageSettings.Landscape = $true
        # Swap printable area dimensions for calculation if page wasn't already landscape
        # (Note: changing PageSettings inside PrintPage might be too late for some drivers, 
        # but usually works for the drawing context)
    }

    # Calculate Scale to FIT
    $ratioX = $printableArea.Width / $img.Width
    $ratioY = $printableArea.Height / $img.Height
    $ratio = [Math]::Min($ratioX, $ratioY)

    $newWidth = $img.Width * $ratio
    $newHeight = $img.Height * $ratio

    # Center the image
    $posX = $printableArea.Left + ($printableArea.Width - $newWidth) / 2
    $posY = $printableArea.Top + ($printableArea.Height - $newHeight) / 2

    # Draw
    $e.Graphics.DrawImage($img, $posX, $posY, $newWidth, $newHeight)
    
    $img.Dispose()
})

# Handle potential orientation set before print
$tempImg = [System.Drawing.Image]::FromFile($ImagePath)
if ($tempImg.Width -gt $tempImg.Height) {
    $pd.DefaultPageSettings.Landscape = $true
}
$tempImg.Dispose()

$pd.Print()
