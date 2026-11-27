#!/usr/bin/env bash
# يبني نسخة المعاينة داخل Claude: الدخول بحساب Claude والحفظ في مساحة Claude الخاصة
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist-preview && cp -r site dist-preview
rm -f dist-preview/_headers dist-preview/robots.txt dist-preview/admin.html dist-preview/reset.html dist-preview/assets/js/pages/admin.js dist-preview/assets/js/pages/reset.js
sed -i "s/authProvider: 'auto'/authProvider: 'claude'/" dist-preview/assets/js/config.js
cp dist-preview/app.html dist-preview/index.html
rm -f dist-preview/assets/js/pages/login.js dist-preview/assets/css/pages.css.bak
echo "built dist-preview"
