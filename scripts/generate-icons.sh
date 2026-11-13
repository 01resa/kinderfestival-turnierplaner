#!/bin/bash

# Skript zum Generieren der PWA Icons
# Benötigt: ImageMagick oder eine Alternative
# 
# Führe dieses Skript aus, um die notwendigen Icons zu generieren:
# chmod +x scripts/generate-icons.sh
# ./scripts/generate-icons.sh

set -e

# Überprüfe, ob ImageMagick installiert ist
if ! command -v convert &> /dev/null; then
    echo "ImageMagick ist nicht installiert."
    echo "Installiere es mit:"
    echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  Mac: brew install imagemagick"
    echo "  Windows: Lade von https://imagemagick.org herunter"
    exit 1
fi

# Erstelle Icons-Verzeichnis
mkdir -p static/icons

# Basispfad
BASE_DIR="$(dirname "$0")/.."
SOURCE_IMAGE="${BASE_DIR}/static/logo.png"

# Wenn keine Quelldatei existiert, erstelle ein Platzhalter-Icon
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Keine Quell-Icon-Datei gefunden: $SOURCE_IMAGE"
    echo "Erstelle Platzhalter-Icons..."
    
    # Erstelle ein einfaches Platzhalter-Icon mit Canvas
    # (Dies erfordert eine manuelle Implementierung oder eine andere Methode)
    echo "Bitte füge eine logo.png Datei im static/ Verzeichnis hinzu."
    echo "Oder lade Icons von https://favicon.io/ herunter."
    exit 1
fi

# Icon-Größen
SIZES=(16 32 48 64 72 96 120 128 144 152 180 192 384 512 1024)

# Android Chrome Icons
echo "Generiere Android Chrome Icons..."
for size in 48 72 96 128 144 152 192 384 512; do
    convert "$SOURCE_IMAGE" -resize ${size}x${size}! -quality 100 "${BASE_DIR}/static/icons/android-chrome-${size}x${size}.png"
    echo "  Erstellt: android-chrome-${size}x${size}.png"
done

# Apple Touch Icons
echo "Generiere Apple Touch Icons..."
for size in 57 60 72 76 114 120 128 144 152 167 180 192 512 1024; do
    convert "$SOURCE_IMAGE" -resize ${size}x${size}! -quality 100 "${BASE_DIR}/static/icons/apple-touch-icon-${size}x${size}.png"
    echo "  Erstellt: apple-touch-icon-${size}x${size}.png"
done

# Standard Favicons
echo "Generiere Favicons..."
for size in 16 32; do
    convert "$SOURCE_IMAGE" -resize ${size}x${size}! -quality 100 "${BASE_DIR}/static/icons/favicon-${size}x${size}.png"
    echo "  Erstellt: favicon-${size}x${size}.png"
done

# Microsoft Tiles
echo "Generiere Microsoft Tiles..."
for size in 70 144 150 310 310x150 310x310; do
    if [[ "$size" == *"x"* ]]; then
        width=${size%"x"*}
        height=${size#*"x"}
        convert "$SOURCE_IMAGE" -resize ${width}x${height}! -quality 100 "${BASE_DIR}/static/icons/mstile-${size}.png"
    else
        convert "$SOURCE_IMAGE" -resize ${size}x${size}! -quality 100 "${BASE_DIR}/static/icons/mstile-${size}.png"
    fi
    echo "  Erstellt: mstile-${size}.png"
done

# Safari Pinned Tab
echo "Generiere Safari Pinned Tab Icon..."
convert "$SOURCE_IMAGE" -resize 20x20! -quality 100 -colorspace Gray "${BASE_DIR}/static/icons/safari-pinned-tab.svg"
echo "  Erstellt: safari-pinned-tab.svg"

# ICO Datei (multi-size)
echo "Generiere ICO Datei..."
convert \
    "${BASE_DIR}/static/icons/favicon-16x16.png" \
    "${BASE_DIR}/static/icons/favicon-32x32.png" \
    -colors 256 \
    "${BASE_DIR}/static/favicon.ico"
echo "  Erstellt: favicon.ico"

# App Icon (PWA)
echo "Generiere PWA Icons..."
cp "${BASE_DIR}/static/icons/android-chrome-192x192.png" "${BASE_DIR}/static/pwa-192x192.png"
cp "${BASE_DIR}/static/icons/android-chrome-512x512.png" "${BASE_DIR}/static/pwa-512x512.png"
echo "  Erstellt: pwa-192x192.png, pwa-512x512.png"

echo ""
echo "Alle Icons wurden erfolgreich generiert!"
echo "Platzhalter-Icons für Material Design 3:"
echo "  - https://favicon.io/ (kostenloser Generator)"
echo "  - https://realfavicongenerator.net/ (umfassend)"
echo "  - https://maskable.app/ (für adaptive Icons)"
