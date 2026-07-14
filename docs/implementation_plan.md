# Kế hoạch Triển khai: S3 Studio (Cross-Platform S3/Ceph Browser Desktop App)

Xây dựng ứng dụng Desktop đa nền tảng (chạy mượt mà trên **macOS** và **Windows**) chuyên sâu cho **Ceph Object Gateway (RADOS Gateway - RGW)** và Amazon S3, hỗ trợ **Multi-Account**, **Bucket Versioning**, và **Truyền tải Đa luồng Song song (Multi-threaded Concurrent Transfers)** với giao diện hiện đại, chuyên nghiệp.

## User Review Required

> [!IMPORTANT]
> **Các tính năng trọng tâm được tối ưu:**
> - **Ceph Object Gateway (RGW):** Hỗ trợ `forcePathStyle: true` và tùy chọn bỏ qua SSL Verification cho các cụm Ceph nội bộ dùng chứng chỉ tự ký.
> - **Quản lý Đa tài khoản (Multi-Account):** Chuyển đổi nhanh chóng giữa nhiều cluster / tài khoản S3 chỉ với 1 click.
> - **Quản lý Phiên bản (Bucket Versioning):** Bật/Tắt/Suspend Versioning cho Bucket, chế độ "Show Versions" để xem danh sách lịch sử phiên bản (`VersionId`, `IsLatest`, `DeleteMarker`), khôi phục phiên bản cũ hoặc xóa vĩnh viễn phiên bản cụ thể.
> - **Truyền tải Đa luồng (Multi-threaded Concurrent Transfers):** Cho phép chọn/kéo thả nhiều file hoặc cả thư mục để upload/download cùng lúc. Điều phối số luồng song song (Concurrency level: 3, 5, 10... luồng đồng thời) kết hợp Multipart Upload chia part chạy song song cho từng file lớn.

## Các Tính Năng Chính Sẽ Xây Dựng

1. **Quản lý Đa Tài khoản & Kết nối Ceph/S3 (Multi-Account & Connection Manager)**
   - Lưu trữ an toàn nhiều Profile kết nối: Tên Profile, Endpoint URL, Access Key, Secret Key, Region.
   - Tùy chọn Ceph RGW: `Force Path Style` & `Ignore SSL Certificate Verification`.
   - Chuyển đổi siêu nhanh giữa các tài khoản ngay trên thanh Header/Sidebar.

2. **Trình duyệt Bucket & Quản lý Phiên bản Object (S3 / Ceph Explorer & Versioning)**
   - **Danh sách Bucket:** Tạo mới, Xóa Bucket, Xem thông số cơ bản.
   - **Chế độ xem Tập tin & Phiên bản (Versioning View):**
     - Điều hướng Breadcrumb theo cây thư mục Prefix.
     - **Toggle "Show Versions":**
       - Khi tắt: Hiển thị các object phiên bản mới nhất (Latest).
       - Khi bật: Liệt kê toàn bộ lịch sử phiên bản của từng object kèm `VersionId`, cờ `Latest`, và `DeleteMarker`.
     - **Thao tác Versioning:** Khôi phục phiên bản cũ (Restore Version), xóa vĩnh viễn một `VersionId` cụ thể hoặc xóa cờ `DeleteMarker` để khôi phục tập tin đã xóa.
   - Tạo Presigned URL chia sẻ nhanh tập tin.

3. **Quản lý Nâng cao cho Ceph RGW & S3 (Management Tabs / Modals)**
   - **Versioning Settings Modal:** Bật/Tạm dừng (Enable / Suspend) chế độ Versioning của Bucket.
   - **ACL & Permissions:** Cấu hình Access Control List cho Bucket & Object.
   - **Bucket Policy Editor:** Trình soạn thảo JSON Policy chuẩn S3/Ceph RGW với các mẫu có sẵn.
   - **Lifecycle Configuration:** Cấu hình quy tắc vòng đời (kể cả quy tắc tự động dọn dẹp các phiên bản cũ Noncurrent Versions sau N ngày).
   - **CORS Editor:** Cấu hình Cross-Origin Resource Sharing.

4. **Trình Quản lý Truyền tải Đa luồng (Multi-Threaded Concurrent Transfer Queue)**
   - **Upload/Download Nhiều file đồng thời (Parallel Workers):**
     - Cho phép chọn hàng loạt file hoặc kéo thả cả thư mục.
     - Hàng đợi (Queue) tự động điều phối chạy **đồng thời N luồng (Concurrency Level: 3 - 10 luồng song song)**.
   - **Multipart Upload tốc độ cao:**
     - Tự động chia part (part size 5MB - 100MB+) cho file lớn, bản thân mỗi file lớn cũng chạy gửi nhiều part song song (`queueSize: 4`).
   - **Bảng theo dõi trực quan:**
     - Thanh tổng quan tiến độ hàng đợi (Total Queue Progress & Speed).
     - Chi tiết từng file: Tốc độ (KB/s, MB/s), Tiến độ %, Trạng thái (Pending, Uploading/Downloading, Completed, Failed), Nút Tạm dừng/Hủy.

## Proposed Changes

Cấu trúc dự án `s3-tool/`:

### Core Architecture & Workspace Setup

#### [NEW] [package.json](file:///Users/hongson/Documents/Codex/s3-tool/package.json)
Cấu hình Electron, Vite, React, `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `@aws-sdk/s3-request-presigner`, Tailwind CSS, Lucide Icons, P-Queue / Async Worker Queue.

#### [NEW] [electron/main.js](file:///Users/hongson/Documents/Codex/s3-tool/electron/main.js)
Main Process Electron: Quản lý cửa sổ, điều phối IPC cho S3/Ceph RGW và hàng đợi truyền tải đa luồng.

#### [NEW] [electron/s3Service.js](file:///Users/hongson/Documents/Codex/s3-tool/electron/s3Service.js)
Service xử lý S3/Ceph RGW API:
- Quản lý Client kết nối Ceph/S3 (`forcePathStyle`, SSL verification).
- Quản lý Bucket: `listBuckets`, `createBucket`, `deleteBucket`.
- Quản lý Object & Versioning: `listObjectsV2`, `listObjectVersions` (lấy danh sách versions & delete markers), `getBucketVersioning`, `putBucketVersioning`, `deleteObject` (với `VersionId`).
- Quản lý Policy/ACL/Lifecycle/CORS.
- Worker Queue đa luồng xử lý Upload/Download song song nhiều file cùng lúc.

### UI & Components (Renderer)

#### [NEW] [src/App.jsx](file:///Users/hongson/Documents/Codex/s3-tool/src/App.jsx)
Giao diện chính với Account Switcher, Sidebar Buckets, Main Explorer và Dock Transfer Manager.

#### [NEW] [src/components/ProfileModal.jsx](file:///Users/hongson/Documents/Codex/s3-tool/src/components/ProfileModal.jsx)
Modal quản lý danh sách tài khoản Ceph/S3.

#### [NEW] [src/components/ObjectExplorer.jsx](file:///Users/hongson/Documents/Codex/s3-tool/src/components/ObjectExplorer.jsx)
Bảng duyệt tập tin/thư mục Ceph S3 với Toggle **"Show Versions"**, hiển thị cột `Version ID`, trạng thái `Latest`/`DeleteMarker`, nút Khôi phục phiên bản (Restore) và Xóa vĩnh viễn Version.

#### [NEW] [src/components/VersioningModal.jsx](file:///Users/hongson/Documents/Codex/s3-tool/src/components/VersioningModal.jsx)
Modal bật/tắt/tạm dừng Bucket Versioning.

#### [NEW] [src/components/PolicyEditorModal.jsx](file:///Users/hongson/Documents/Codex/s3-tool/src/components/PolicyEditorModal.jsx)
Modal chỉnh sửa Bucket Policy chuẩn S3/Ceph RGW.

#### [NEW] [src/components/LifecycleModal.jsx](file:///Users/hongson/Documents/Codex/s3-tool/src/components/LifecycleModal.jsx)
Trình quản lý Lifecycle Rules (bao gồm rule dọn dẹp Noncurrent Versions).

#### [NEW] [src/components/AclModal.jsx](file:///Users/hongson/Documents/Codex/s3-tool/src/components/AclModal.jsx)
Trình chỉnh sửa quyền truy cập Access Control List cho Bucket và Object.

#### [NEW] [src/components/TransferQueue.jsx](file:///Users/hongson/Documents/Codex/s3-tool/src/components/TransferQueue.jsx)
Bảng điều khiển hàng đợi truyền tải đa luồng: Tùy chỉnh số luồng song song (Concurrency setting), hiển thị tổng tiến độ hàng đợi và tốc độ từng file đang transfer.

## Verification Plan

### Automated Tests / Dev Verification
- Chạy ứng dụng bằng `npm run dev`.
- Kiểm thử luồng Upload nhiều file đồng thời và thao tác Toggle Show Versions / Restore Version.
