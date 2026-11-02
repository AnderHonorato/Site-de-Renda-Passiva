# Gera duas imagens JPG de teste (sem dado pessoal) com System.Drawing (Windows).
# Uso: pwsh -File gerar-jpg.ps1 -Saida <pasta>
param([string]$Saida = ".\amostras")
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $Saida | Out-Null

function Salvar-Jpg($bmp, $caminho, [int]$qualidade) {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $p = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$qualidade)
  $bmp.Save($caminho, $codec, $p)
}

# 1) foto.jpg: 320x240 colorida, com formas e um texto curto
$b = New-Object System.Drawing.Bitmap 320, 240
$g = [System.Drawing.Graphics]::FromImage($b)
$g.Clear([System.Drawing.Color]::FromArgb(255, 240, 244, 250))
$g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 220, 90, 60))), 30, 30, 120, 120)
$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 40, 120, 200))), 160, 90, 130, 110)
$f = New-Object System.Drawing.Font('Arial', 18, [System.Drawing.FontStyle]::Bold)
$g.DrawString('IMAGEM DE TESTE', $f, [System.Drawing.Brushes]::Black, 40, 190)
$g.Dispose()
Salvar-Jpg $b (Join-Path $Saida 'foto.jpg') 80
$b.Dispose()

# 2) texto-escaneado.jpg: texto preto sobre branco, 1240x400, para simular um documento escaneado
$b = New-Object System.Drawing.Bitmap 1240, 400
$g = [System.Drawing.Graphics]::FromImage($b)
$g.Clear([System.Drawing.Color]::White)
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$f = New-Object System.Drawing.Font('Arial', 40, [System.Drawing.FontStyle]::Regular)
$g.DrawString('Relatorio de teste numero 2026', $f, [System.Drawing.Brushes]::Black, 40, 60)
$g.DrawString('Este texto existe apenas como imagem.', $f, [System.Drawing.Brushes]::Black, 40, 160)
$g.DrawString('Codigo de verificacao ABC 12345', $f, [System.Drawing.Brushes]::Black, 40, 260)
$g.Dispose()
Salvar-Jpg $b (Join-Path $Saida 'texto-escaneado.jpg') 85
$b.Dispose()
Write-Host "JPGs gerados em $Saida"
