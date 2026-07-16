#!/bin/bash

# ==========================================================
# 🔐 S3 STUDIO SELF-SIGNED CERTIFICATE GENERATOR
# ==========================================================
# Script tự động tạo chứng chỉ tự ký (Self-Signed Certificate)
# dùng cho electron-builder (ký số Windows .exe & macOS .app)
# ==========================================================

mkdir -p certs

CERT_DIR="certs"
PFX_FILE="${CERT_DIR}/win-cert.pfx"
CRT_FILE="${CERT_DIR}/s3studio-cert.crt"
KEY_FILE="${CERT_DIR}/s3studio-private.key"
CERT_PASSWORD="s3studio_secure_password_2026"
SUBJ="/CN=S3 Studio Self-Signed/O=S3 Studio/C=VN"

echo "🔐 [Self-Cert] Đang kiểm tra / tạo chứng chỉ tự ký tại thư mục ${CERT_DIR}..."

if [ -f "$PFX_FILE" ] && [ -f "$CRT_FILE" ]; then
  echo "✅ [Self-Cert] Chứng chỉ tự ký đã tồn tại: ${PFX_FILE}"
else
  echo "⚡ [Self-Cert] Đang khởi tạo Private Key RSA 4096-bit & Chứng chỉ gốc X.509 (thời hạn 10 năm)..."
  
  # 1. Tạo Private Key & Certificate .crt
  openssl req -x509 -newkey rsa:4096 -keyout "$KEY_FILE" -out "$CRT_FILE" -days 3650 -nodes -subj "$SUBJ" 2>/dev/null
  
  if [ $? -ne 0 ]; then
    echo "❌ [Self-Cert] Lỗi khi tạo chứng chỉ bằng OpenSSL. Hãy đảm bảo máy đã cài đặt OpenSSL."
    exit 1
  fi

  # 2. Đóng gói thành file .pfx cho Windows Code Signing
  echo "📦 [Self-Cert] Đóng gói vào chứng chỉ PKCS#12 (${PFX_FILE})..."
  openssl pkcs12 -export -out "$PFX_FILE" -inkey "$KEY_FILE" -in "$CRT_FILE" -passout "pass:${CERT_PASSWORD}" 2>/dev/null

  if [ $? -ne 0 ]; then
    echo "❌ [Self-Cert] Lỗi khi xuất file .pfx."
    exit 1
  fi

  echo "🎉 [Self-Cert] Đã tạo thành công bộ chứng chỉ tự ký!"
  echo "   📁 Private Key: ${KEY_FILE}"
  echo "   📁 Root Cert  : ${CRT_FILE} (Có thể cài vào Windows/macOS Trusted Root để tin cậy)"
  echo "   📁 Code Signing PFX: ${PFX_FILE}"
fi

# 3. Kiểm tra và cập nhật biến môi trường vào .env
if [ -f ".env" ]; then
  if ! grep -q "CSC_LINK=" .env; then
    echo "" >> .env
    echo "# Code Signing Certificate (Self-Signed)" >> .env
    echo "CSC_LINK=certs/win-cert.pfx" >> .env
    echo "CSC_KEY_PASSWORD=${CERT_PASSWORD}" >> .env
    echo "✅ [Self-Cert] Đã tự động thêm CSC_LINK & CSC_KEY_PASSWORD vào file .env."
  else
    echo "ℹ️ [Self-Cert] File .env đã có biến CSC_LINK. Đang giữ nguyên cấu hình hiện tại."
  fi
else
  echo "# Code Signing Certificate (Self-Signed)" > .env
  echo "CSC_LINK=certs/win-cert.pfx" >> .env
  echo "CSC_KEY_PASSWORD=${CERT_PASSWORD}" >> .env
  echo "✅ [Self-Cert] Đã tạo file .env mới với cấu hình CSC_LINK & CSC_KEY_PASSWORD."
fi

# 4. Hỗ trợ import chứng chỉ vào macOS Keychain (Tùy chọn cho người dùng Mac)
if [ "$(uname -s)" = "Darwin" ]; then
  echo ""
  echo "🍎 [macOS Tip] Để macOS chấp nhận chữ ký số nội bộ (không báo lỗi Gatekeeper trên máy bạn):"
  echo "   Chạy lệnh sau để thêm chứng chỉ vào keychain và tin cậy:"
  echo "   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${CRT_FILE}"
fi

echo ""
echo "=========================================================="
echo "🎯 Cấu hình hoàn tất! Từ nay khi chạy 'npm run release',"
echo "   electron-builder sẽ tự động lấy chứng chỉ này để ký số cho ứng dụng."
echo "=========================================================="
