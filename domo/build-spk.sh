#!/bin/sh
# Builds dist/domo-0.1.0.spk. Needs node/npm and a 256px + 72px PNG icon.
set -e; cd "$(dirname "$0")"; rm -rf build dist; mkdir -p build/pkg dist
cp -r server.js package.json config.example.json providers public build/pkg/
(cd build/pkg && npm install --omit=dev --no-audit --no-fund)
tar -czf build/package.tgz -C build/pkg .
cp spk/INFO.template build/INFO; cp -r spk/scripts spk/conf build/
cp icons/PACKAGE_ICON.PNG icons/PACKAGE_ICON_256.PNG build/ 2>/dev/null || echo "Add icons/PACKAGE_ICON.PNG (72px) and PACKAGE_ICON_256.PNG"
(cd build && tar -cf ../dist/domo-0.1.0.spk INFO package.tgz scripts conf PACKAGE_ICON*.PNG 2>/dev/null || tar -cf ../dist/domo-0.1.0.spk INFO package.tgz scripts conf)
echo "Built dist/domo-0.1.0.spk"
