#!/usr/bin/env bash
set -e

# --- S3 Studio Release & Publish Script ---
# Script tự động build và đẩy bản phát hành (Release) lên GitHub Releases
# Yêu cầu biến GH_TOKEN hoặc GITHUB_TOKEN trong file .env hoặc biến môi trường

echo "=========================================================="
echo "🚀 S3 STUDIO AUTO PUBLISH & RELEASE TO GITHUB"
echo "=========================================================="

# 1. Tải biến môi trường từ file .env (nếu tồn tại)
if [ -f ".env" ]; then
  echo "📄 Đang tải biến môi trường từ file .env..."
  export $(grep -v '^#' .env | xargs)
fi

# 2. Kiểm tra GH_TOKEN / GITHUB_TOKEN
if [ -z "$GH_TOKEN" ]; then
  if [ -n "$GITHUB_TOKEN" ]; then
    export GH_TOKEN="$GITHUB_TOKEN"
  else
    echo ""
    echo "❌ Lỗi: Không tìm thấy GH_TOKEN hoặc GITHUB_TOKEN!"
    echo "👉 Vui lòng tạo GitHub Personal Access Token (có quyền 'repo') và thêm vào file .env ở thư mục gốc:"
    echo "   GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    echo ""
    exit 1
  fi
fi

# 3. Đồng bộ phiên bản từ .env (nếu có APP_VERSION)
node scripts/sync-version.js
VERSION=$(node -p "require('./package.json').version")
echo "📌 Phiên bản chuẩn bị phát hành: v${VERSION}"

# 4. Xác định mục tiêu build (Mặc định: cả --mac và --win nếu không có tham số)
TARGETS="$@"
if [ -z "$TARGETS" ]; then
  TARGETS="--mac --win"
fi
echo "🎯 Mục tiêu build & upload: ${TARGETS}"

# 5. Dọn dẹp thư mục cũ & Build giao diện web Vite
echo ""
echo "🧹 [1/2] Đang dọn dẹp thư mục cũ và biên dịch giao diện Web (Vite Build)..."
rm -rf release dist
npm run build

# 6. Build Electron & tự động đẩy lên GitHub Releases
echo ""
echo "☁️ [2/2] Đang đóng gói Electron và tải lên GitHub Releases (publish: always)..."
npx electron-builder ${TARGETS} --publish always

echo ""
echo "=========================================================="
echo "🎉 HOÀN TẤT PHÁT HÀNH PHIÊN BẢN v${VERSION}!"
echo "🔗 Kiểm tra ngay tại: https://github.com/hongsonvu0622-stack/s3-studio/releases"
echo "=========================================================="
