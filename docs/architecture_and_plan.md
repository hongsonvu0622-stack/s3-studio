# S3 Studio - Architecture & Implementation Plan

> **Tài liệu Kế hoạch Triển khai & Kiến trúc Hệ thống S3 Studio**
> Đăng tải & cập nhật: 2026-07-13

---

## 1. Mục tiêu Dự án (Project Goals)

**S3 Studio** là ứng dụng Desktop đa nền tảng (chạy mượt mà trên **macOS** và **Windows**), được tối ưu hóa đặc biệt cho **Ceph Object Gateway (RADOS Gateway - RGW)** và Amazon S3 / S3-compatible storage (MinIO, Cloudflare R2, Wasabi, DigitalOcean Spaces,...).

Ứng dụng sở hữu giao diện hiện đại (**Vibrant Dark Mode / Glassmorphism**), mang lại trải nghiệm chuyên nghiệp vượt trội so với các công cụ truyền thống như S3 Browser.

---

## 2. Kiến trúc & Framework Tối ưu (Architecture & Tech Stack)

### 2.1 Lựa chọn Framework
- **Desktop Engine**: **Electron** (Hỗ trợ đóng gói `.dmg` / `.app` cho macOS và `.exe` cho Windows).
- **Frontend UI**: **React 18 + Vite + Tailwind CSS + Lucide Icons** (Đảm bảo hiệu năng UI siêu nhạy, hiệu ứng mượt mà).
- **Core S3 / Ceph Engine**: **Node.js Main Process + AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/lib-storage`)**.

### 2.2 Tại sao đây là lựa chọn tối ưu nhất?
1. **Truyền tải trực tiếp qua Node.js Streams (Zero Memory Bloat)**:
   - Thay vì tải file vào bộ nhớ trình duyệt (dễ gây crash khi gặp file vài GB), toàn bộ luồng I/O được thực hiện trực tiếp trên Node.js Main Process thông qua `fs.createReadStream` / `fs.createWriteStream`.
2. **Tương thích hoàn hảo với Ceph RGW**:
   - Hỗ trợ **Path-Style Addressing (`forcePathStyle: true`)** theo chuẩn Ceph RGW (`http://server:8080/bucket/object`).
   - Cấu hình động `https.Agent` cho phép bỏ qua kiểm tra chứng chỉ tự ký (`rejectUnauthorized: false`) trong các cụm Ceph nội bộ.
3. **Hiệu năng Đa luồng Song song (Multi-threaded & Concurrent Queue)**:
   - Hàng đợi (Transfer Queue) điều phối upload/download N tập tin song song cùng lúc mà không làm nghẽn UI Renderer.

---

## 3. Danh sách Tính Năng Toàn diện (Comprehensive Features)

### 3.1 Quản lý Đa Tài khoản (Multi-Account & Cluster Switcher)
- Thêm, sửa, xóa danh sách tài khoản / cụm S3 hoặc Ceph RGW.
- Lưu trữ cấu hình Access Key, Secret Key, Region, Endpoint URL, và các tùy chọn đặc thù (`Force Path Style`, `Ignore SSL`).
- Thanh chuyển đổi tài khoản nhanh (Quick Account Switcher) ngay trên Header ứng dụng.

### 3.2 Trình duyệt Bucket & Quản lý Phiên bản (Bucket & Object Versioning Explorer)
- **Quản lý Bucket**: Liệt kê, tạo mới, xóa Bucket.
- **Trình duyệt Tập tin**:
  - Điều hướng đường dẫn Breadcrumb theo S3 Prefix.
  - Tìm kiếm, lọc theo tên, sắp xếp theo kích thước và ngày cập nhật.
  - Tạo Presigned URL (đường dẫn chia sẻ tạm thời có hạn dùng).
- **Quản lý Phiên bản (Versioning)**:
  - Toggle **Show Versions**: Khi bật, hiển thị danh sách lịch sử tất cả phiên bản của từng object (`VersionId`, cờ `Latest`, cờ `DeleteMarker`).
  - Khôi phục phiên bản cũ (**Restore Previous Version**) chỉ với 1 nhấp chuột.
  - Xóa vĩnh viễn một `VersionId` cụ thể hoặc gỡ bỏ `DeleteMarker`.

### 3.3 Các Mô-đun Quản lý Nâng cao (Advanced Management Modals)
- **Versioning Configuration**: Bật / Tạm dừng (Enable / Suspend) chế độ Versioning của Bucket.
- **ACL Editor**: Cấu hình Access Control List (`private`, `public-read`,...) cho Bucket & Object.
- **Bucket Policy Editor**: Trình chỉnh sửa JSON syntax với mẫu chuẩn cho S3 / Ceph RGW.
- **Lifecycle Configuration**: Quản lý quy tắc tự động chuyển đổi tầng lưu trữ hoặc xóa tập tin cũ / phiên bản cũ (Noncurrent versions) sau N ngày.
- **CORS Editor**: Cấu hình Cross-Origin Resource Sharing.

### 3.4 Trình Quản lý Truyền tải Đa luồng (Multi-Threaded Concurrent Transfer Manager)
- Upload / Download nhiều file cùng lúc chạy song song (có thể tùy chỉnh số luồng đồng thời: 3, 5, 10...).
- Tự động chia part (Multipart Upload) cho từng file lớn chạy song song.
- Bảng Transfer Queue hiển thị: Tổng tiến độ %, tốc độ truyền tải thời gian thực (MB/s), trạng thái chi tiết và nút Tạm dừng / Hủy.

---

## 4. Cấu trúc Thư mục Dự án

```
s3-tool/
├── docs/
│   └── architecture_and_plan.md   # Tài liệu kiến trúc & kế hoạch
├── electron/
│   ├── main.js                    # Main Process: Window & IPC Handler
│   ├── preload.js                 # Secure IPC Bridge
│   └── s3Service.js               # Node.js S3 / Ceph RGW Engine & Queue
├── src/
│   ├── index.css                  # Tailwind CSS & Global Dark Glassmorphism Styles
│   ├── main.jsx                   # React Entry Point
│   ├── App.jsx                    # Core Application Layout
│   └── components/
│       ├── Header.jsx             # Top bar + Quick Account Switcher
│       ├── ProfileModal.jsx       # Multi-Account Connection Manager
│       ├── BucketList.jsx         # Sidebar Bucket Explorer
│       ├── ObjectExplorer.jsx     # Main File & Versioning Explorer
│       ├── VersioningModal.jsx    # Bucket Versioning Toggle Modal
│       ├── AclModal.jsx           # Bucket/Object ACL Editor
│       ├── PolicyEditorModal.jsx  # Bucket Policy JSON Editor
│       ├── LifecycleModal.jsx     # Lifecycle Rules Manager
│       ├── CorsModal.jsx          # CORS Configuration Modal
│       ├── PresignedUrlModal.jsx  # Presigned URL Generator
│       └── TransferQueue.jsx      # Bottom Dock Multi-threaded Transfer Queue
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```
