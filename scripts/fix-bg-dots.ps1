Add-Type -AssemblyName System.Drawing

$path = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\assets\cassweb-background.png"))
$zipPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\PNG CASSWEB.zip"))
$extract = Join-Path $env:TEMP "cassweb-bg-restore"
if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
New-Item -ItemType Directory -Path $extract -Force | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $extract -Force
$original = Get-ChildItem $extract -Filter "*.png" | Select-Object -First 1
Copy-Item $original.FullName $path -Force

$src = New-Object System.Drawing.Bitmap $path
$bmp = New-Object System.Drawing.Bitmap $src.Width, $src.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($src, 0, 0)
$src.Dispose()
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$spacing = 56.0
$w = $bmp.Width
$h = $bmp.Height

function Test-PointInTriangle([double]$px, [double]$py, [double]$x1, [double]$y1, [double]$x2, [double]$y2, [double]$x3, [double]$y3) {
  function Sign([double]$ax, [double]$ay, [double]$bx, [double]$by, [double]$cx, [double]$cy) {
    return ($ax - $cx) * ($by - $cy) - ($bx - $cx) * ($ay - $cy)
  }
  $d1 = Sign $px $py $x1 $y1 $x2 $y2
  $d2 = Sign $px $py $x2 $y2 $x3 $y3
  $d3 = Sign $px $py $x3 $y3 $x1 $y1
  $hasNeg = ($d1 -lt 0) -or ($d2 -lt 0) -or ($d3 -lt 0)
  $hasPos = ($d1 -gt 0) -or ($d2 -gt 0) -or ($d3 -gt 0)
  return -not ($hasNeg -and $hasPos)
}

function Draw-Dot([System.Drawing.Graphics]$graphics, [double]$x, [double]$y, [int]$alpha) {
  foreach ($layer in @(@{R=8.0;A=0.22},@{R=4.8;A=0.55},@{R=2.3;A=1.0})) {
    $a = [Math]::Max(0, [Math]::Min(255, [int][Math]::Round($alpha * $layer.A)))
    if ($a -lt 4) { continue }
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($a, 20, 108, 255))
    $r = $layer.R
    $graphics.FillEllipse($brush, [single]($x - $r), [single]($y - $r), [single]($r * 2), [single]($r * 2))
    $brush.Dispose()
  }
}

function Repair-Corner(
  [System.Drawing.Graphics]$graphics,
  [double]$cx, [double]$cy,
  [double]$p2x, [double]$p2y,
  [double]$p3x, [double]$p3y,
  [bool]$fromTopRight
) {
  $tri = New-Object System.Drawing.Drawing2D.GraphicsPath
  $tri.AddPolygon(@(
    [System.Drawing.PointF]::new([single]$cx, [single]$cy),
    [System.Drawing.PointF]::new([single]$p2x, [single]$p2y),
    [System.Drawing.PointF]::new([single]$p3x, [single]$p3y)
  ))
  $graphics.SetClip($tri)

  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.Point]::new([int]$cx, [int]$cy),
    [System.Drawing.Point]::new([int]$p3x, [int]$p3y),
    [System.Drawing.Color]::FromArgb(255, 0, 6, 22),
    [System.Drawing.Color]::FromArgb(255, 0, 1, 7)
  )
  $graphics.FillRectangle($grad, 0, 0, $w, $h)
  $grad.Dispose()

  $maxDist = [Math]::Max(
    [Math]::Sqrt([Math]::Pow($p2x - $cx, 2) + [Math]::Pow($p2y - $cy, 2)),
    [Math]::Sqrt([Math]::Pow($p3x - $cx, 2) + [Math]::Pow($p3y - $cy, 2))
  )

  for ($i = 0; $i -le 15; $i++) {
    for ($j = 0; $j -le 15; $j++) {
      if ($fromTopRight) {
        $x = $cx - 42 - ($i + $j) * ($spacing * 0.7071068)
        $y = $cy + 42 + ($i - $j) * ($spacing * 0.7071068)
      } else {
        $x = $cx + 42 + ($i + $j) * ($spacing * 0.7071068)
        $y = $cy - 42 - ($i - $j) * ($spacing * 0.7071068)
      }
      if (-not (Test-PointInTriangle $x $y $cx $cy $p2x $p2y $p3x $p3y)) { continue }
      $dist = [Math]::Sqrt([Math]::Pow($x - $cx, 2) + [Math]::Pow($y - $cy, 2))
      $fade = 1.0 - [Math]::Min(1.0, $dist / $maxDist)
      if ($fade -lt 0.1) { continue }
      Draw-Dot $graphics $x $y ([int][Math]::Round(235 * [Math]::Pow($fade, 0.9)))
    }
  }

  $graphics.ResetClip()
  $tri.Dispose()
}

# Use in-bounds corner coordinates (3840x2160 -> max index 3839,2159)
Repair-Corner $g ($w - 1) 0 ($w - 1) 520 3140 0 $true
Repair-Corner $g 0 ($h - 1) 740 ($h - 1) 0 1570 $false

$g.Dispose()
$tmp = "$path.tmp.png"
$bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Move-Item -Path $tmp -Destination $path -Force
Remove-Item $extract -Recurse -Force -ErrorAction SilentlyContinue
Write-Output "Fixed dots: $path"
