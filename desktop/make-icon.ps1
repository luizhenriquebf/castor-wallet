$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore, WindowsBase

[xml]$logo = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot '../dist/assets/logo.svg')
$geometry = [System.Windows.Media.Geometry]::Parse([string]$logo.svg.path.d).Clone()
$geometry.Transform = [System.Windows.Media.MatrixTransform]::new(
    [System.Windows.Media.Matrix]::new(0.76, 0, 0, 0.76, 34, 9))
$visual = [System.Windows.Media.DrawingVisual]::new()
$context = $visual.RenderOpen()
$foreground = [System.Windows.Media.SolidColorBrush]::new(
    [System.Windows.Media.ColorConverter]::ConvertFromString('#204f40'))
$background = [System.Windows.Media.SolidColorBrush]::new(
    [System.Windows.Media.ColorConverter]::ConvertFromString('#f6f7f4'))
$context.DrawRoundedRectangle($background, $null, [System.Windows.Rect]::new(0, 0, 256, 256), 45, 45)
$context.DrawGeometry($foreground, $null, $geometry)
$context.Close()

$bitmap = [System.Windows.Media.Imaging.RenderTargetBitmap]::new(
    256, 256, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
$bitmap.Render($visual)
$encoder = [System.Windows.Media.Imaging.PngBitmapEncoder]::new()
$encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bitmap))
$png = [System.IO.MemoryStream]::new()
$encoder.Save($png)

# A single 256px PNG image in an ICO container for Windows and NSIS.
$icon = [System.IO.BinaryWriter]::new([System.IO.File]::Create((Join-Path $PSScriptRoot 'icon.ico')))
try {
    $icon.Write([uint16]0)
    $icon.Write([uint16]1)
    $icon.Write([uint16]1)
    $icon.Write([byte[]](0, 0, 0, 0))
    $icon.Write([uint16]1)
    $icon.Write([uint16]32)
    $icon.Write([uint32]$png.Length)
    $icon.Write([uint32]22)
    $icon.Write($png.ToArray())
} finally {
    $icon.Dispose()
    $png.Dispose()
}
