#!/usr/bin/env bash
# Ставит Blender 4.2 LTS в ~/tools/blender (нужен доступ к download.blender.org).
set -e
[ -x "$HOME/tools/blender/blender" ] && { echo "Blender уже есть"; exit 0; }
mkdir -p "$HOME/tools" && cd "$HOME/tools"
curl -sSL -o blender.tar.xz https://download.blender.org/release/Blender4.2/blender-4.2.3-linux-x64.tar.xz
tar -xf blender.tar.xz && rm blender.tar.xz && mv blender-4.2.3-linux-x64 blender
"$HOME/tools/blender/blender" -b --version | head -1
