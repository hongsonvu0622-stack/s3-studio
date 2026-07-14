# Kế hoạch & Phân tích Kỹ thuật: Tính năng Mount Disk (Gắn kết S3 Bucket làm Ổ đĩa cục bộ)

Tính năng **Mount Disk** cho phép người dùng ánh xạ (mount) một **S3 Bucket** thành một ổ đĩa ảo hoặc thư mục cục bộ ngay trên **macOS** (ví dụ `/Volumes/MyS3Bucket`) và **Windows** (ví dụ ổ `Z:\` hoặc `D:\S3Mount`). Người dùng có thể thao tác trực tiếp với các tập tin S3 bằng **Finder (macOS)**, **File Explorer (Windows)**, hoặc các phần mềm chỉnh sửa (Word, Excel, Photoshop, Premiere, VS Code...) giống hệt như một ổ cứng di động gắn qua cổng USB.

---

## 1. Phân tích & Đánh giá các Giải pháp Kỹ thuật (Technical Feasibility Evaluation)

Để mount một object storage (S3) thành hệ thống tập tin POSIX/NTFS cục bộ, chúng ta cần một trình điều khiển FUSE (Filesystem in Userspace). Dưới đây là 3 phương án kỹ thuật khả thi cho ứng dụng Electron Desktop:

| Tiêu chí | Phương án 1: `Rclone Mount` (Khuyến nghị ⭐⭐⭐⭐⭐) | Phương án 2: Node.js Native FUSE (`fuse-native`) | Phương án 3: `Goofys` / `S3FS-FUSE` CLI |
| :--- | :--- | :--- | :--- |
| **Hỗ trợ Đa nền tảng (macOS + Windows)** | **Hoàn hảo**. Hỗ trợ `macFUSE` / `FUSE-T` (macOS) và `WinFsp` (Windows). | Rất khó. C++ addons thường gãy build khi đổi version Node/Electron, Windows hỗ trợ rất kém. | Hạn chế. `Goofys` rất nhanh trên Linux/macOS nhưng khó chạy trên Windows (cần WSL/Cygwin). |
| **Hiệu năng & Bộ nhớ đệm (Caching)** | **Xuất sắc**. Cung cấp hệ thống `VFS Cache Mode` (`full`, `writes`, `minimal`) tối ưu cực tốt khi mở/chỉnh sửa file lớn. | Kém. Mọi thao tác I/O đi qua cầu nối C++ ↔ V8 Engine của Node.js gây nghẽn cổ chai lớn. | Khá tốt trên macOS, nhưng thiếu hệ thống cache toàn diện cho các thao tác đọc/ghi ngẫu nhiên. |
| **Độ ổn định & Tương thích S3** | **Tuyệt đối**. Đã được kiểm chứng bởi hàng triệu hệ thống, xử lý tốt rớt mạng, multipart, path-style, custom endpoint. | Dễ gây treo ứng dụng (Deadlock/Freeze Finder) nếu xử lý lỗi mạng không hoàn hảo. | Tốt, tuy nhiên không xử lý linh hoạt được nhiều chuẩn S3 custom bằng Rclone. |
| **Khối lượng code trong S3 Studio** | **Nhẹ nhàng & Sạch sẽ**. Electron chỉ đóng vai trò Process Controller (`child_process.spawn`) và quản lý cấu hình. | Cực kỳ phức tạp, phải tự viết toàn bộ logic phân mảnh, cache, inode mapping. | Trung bình, nhưng phải duy trì nhiều binary riêng biệt cho từng hệ điều hành. |

### -> KẾT LUẬN & LỰA CHỌN: Phương án 1 (`Rclone Mount Engine`)
Chúng ta sẽ sử dụng kiến trúc **Rclone Mount** làm lõi xử lý cho tính năng Mount Disk vì:
1. S3 Studio **đã có sẵn hệ sinh thái và sự tương thích với `rclone.conf`**, việc tích hợp thêm `rclone mount` là bước đi liền mạch, tận dụng tối đa sức mạnh có sẵn.
2. Đảm bảo an toàn, không gây crash hoặc treo (freeze) ứng dụng chính khi mạng chập chờn.
3. Người dùng có thể dùng VFS Cache để làm việc trực tiếp với tệp S3 tốc độ cao như ổ cứng SSD nội bộ.

---

## 2. Kiến trúc Hệ thống & Yêu cầu Môi trường (System Architecture & Prerequisites)

### 2.1. Yêu cầu hệ thống trên máy Người dùng (Prerequisites)
Vì công nghệ ảo hóa ổ đĩa yêu cầu driver ở tầng hệ thống (Userspace Filesystem Driver), ứng dụng sẽ tự động kiểm tra và hướng dẫn người dùng nếu còn thiếu:
- **Trên macOS**: Cần cài đặt **macFUSE** (hoặc **FUSE-T** - không cần Kernel Extension, rất thân thiện trên Apple Silicon M1/M2/M3/M4).
- **Trên Windows**: Cần cài đặt **WinFsp** (Windows File System Proxy - chuẩn công nghiệp cho ổ ảo trên Windows).
- **Rclone Binary**:
  - Electron kiểm tra `rclone` đã có trong `PATH` hệ thống chưa (`rclone version`).
  - *Tùy chọn tương lai*: Nếu chưa có, ứng dụng có thể bấm nút tự tải binary `rclone` nhúng trực tiếp vào thư mục dữ liệu `~/.gemini/antigravity-ide/bin/`.

### 2.2. Luồng xử lý kỹ thuật (Mount Flow & IPC Controller)
1. **Khởi tạo (Prepare)**:
   - Khi người dùng bấm **Mount** Bucket `my-data` từ Profile `demo-s3`, Electron `diskMountService.js` tự động sinh một cấu hình tạm thời cho rclone (hoặc truyền qua biến môi trường để bảo mật Secret Key).
2. **Thực thi lệnh (Execution)**:
   - Lệnh thực thi cơ bản:
     ```bash
     # macOS:
     rclone mount ":s3,provider=AWS,env_auth=false,access_key_id=AKIA...,secret_access_key=SECRET...,endpoint=https://...:bucket-name" /Volumes/S3-BucketName --vfs-cache-mode full --vfs-cache-max-size 10G --dir-cache-time 5m --daemon
     
     # Windows:
     rclone mount ":s3,...:bucket-name" Z: --vfs-cache-mode full --vfs-cache-max-size 10G --dir-cache-time 5m
     ```
3. **Quản lý Vòng đời Tiến trình (Lifecycle Management)**:
   - Lưu `PID`, `Bucket`, `MountPoint`, `Status` vào bảng theo dõi tiến trình trong `diskMountService.js`.
   - Lắng nghe `stdout/stderr` để phát hiện lỗi (ví dụ: `Address already in use`, `Permission denied`, `mountpoint not empty`).
4. **Ngắt kết nối an toàn (Unmount)**:
   - **macOS**: Gọi `umount /Volumes/S3-BucketName` hoặc `diskutil unmount /Volumes/S3-BucketName`.
   - **Windows**: Gọi gián đoạn tiến trình (Ctrl+C / taskkill an toàn cho PID rclone mount).

---

## 3. Kế hoạch Triển khai Chi tiết (Implementation Plan)

### Bước 1: Xây dựng Backend Service (`electron/diskMountService.js`)
- Tạo service chuyên trách `DiskMountService`:
  - `checkPrerequisites()`: Kiểm tra `rclone` và FUSE driver (`macFUSE`/`WinFsp`) trên máy.
  - `mountBucket(options)`: Nhận `profile`, `bucketName`, `mountPoint`, `cacheMode`, `readOnly`. Sinh tham số và chạy `child_process.spawn('rclone', ['mount', ...])`.
  - `unmountBucket(mountId)`: Thực hiện unmount ổ đĩa an toàn.
  - `listActiveMounts()`: Trả về danh sách các ổ đĩa S3 đang được mount và trạng thái.
  - `openInFileManager(mountPoint)`: Gọi `shell.openPath(mountPoint)` để mở ngay Finder/File Explorer cho người dùng thấy ổ đĩa.

### Bước 2: Đăng ký IPC Handlers & Preload Bridge
- Cập nhật `electron/main.js` & `electron/preload.cjs`:
  - `s3:checkMountPrerequisites`
  - `s3:mountDisk`
  - `s3:unmountDisk`
  - `s3:getActiveMounts`
  - `s3:openMountInFileManager`

### Bước 3: Thiết kế Giao diện Người dùng (`UI/UX Layout`)
1. **Nút truy cập nhanh**:
   - Thêm nút **`[ 💾 Mount Ổ đĩa (Mount Disk) ]`** trên Header Bar bên cạnh nút Quản lý Tài khoản.
   - Hoặc thêm icon ổ đĩa (`HardDrive`) trong menu chuột phải của mỗi Bucket trên Sidebar.
2. **Hộp thoại Quản lý Ổ đĩa ảo (`src/components/DiskMountModal.jsx`)**:
   - **Thẻ Kiểm tra Hệ thống (System Status Banner)**:
     - Hiển thị trạng thái: `Rclone CLI: Đã sẵn sàng v1.68.0` | `FUSE Driver: Đã cài đặt macFUSE`.
     - Nếu thiếu, hiển thị cảnh báo rõ ràng kèm hướng dẫn cài đặt nhanh (VD: `brew install --cask macfuse` hoặc `winget install WinFsp.WinFsp`).
   - **Form Cấu hình Mount Mới**:
     - Chọn Bucket (từ danh sách Buckets của Profile hiện tại).
     - Đường dẫn điểm gắn (Mount Point): Mặc định tự gợi ý `/Volumes/S3-{BucketName}` (macOS) hoặc ổ chữ cái rảnh như `Z:` (Windows). Có nút duyệt chọn folder khác.
     - Chế độ Cache (`VFS Cache Mode`):
       - `Full (Khuyến nghị)`: Tối ưu cho làm việc văn phòng, chỉnh sửa trực tiếp, xem phim.
       - `Writes`: Chỉ cache khi ghi.
       - `Minimal`: Tiết kiệm ổ cứng cục bộ nhất.
     - Tùy chọn: `Chỉ đọc (Read-Only)`.
   - **Bảng Danh sách Ổ đĩa đang Hoạt động (Active Mounts Table)**:
     - Các cột: `Bucket`, `Điểm gắn (Mount Point)`, `Chế độ Cache`, `Thời gian`, `Hành động`.
     - Các nút hành động:
       - **Mở thư mục (Open in Finder/Explorer)** 📂
       - **Ngắt kết nối (Unmount)** ⏏️

---

## 4. Các Vấn đề cần Lưu ý & Đánh giá Rủi ro (Risk Assessment & User Review)

> [!IMPORTANT]
> **Quyền truy cập FUSE và macOS Security:** Trên macOS hiện đại (macOS Ventura, Sonoma, Sequoia), việc cài đặt `macFUSE` lần đầu yêu cầu người dùng vào *System Settings -> Privacy & Security -> Allow system software from developer Benjamin Fleischer*. Sử dụng **FUSE-T** là giải pháp thay thế tuyệt vời vì chạy trên giao thức NFS cục bộ không cần Kernel Extension.

> [!WARNING]
> **Tắt ứng dụng khi ổ đĩa đang Mount:** Khi người dùng tắt hoàn toàn S3 Studio, tiến trình `rclone mount` nếu chạy dạng con (`spawn`) có thể bị ngắt. Trong `main.js` tại sự kiện `app.on('before-quit')`, chúng ta cần tự động gọi `unmountBucket` cho tất cả ổ đĩa đang gắn để đảm bảo không bị lỗi `Disk not ejected properly` trên macOS hoặc treo file trên Windows.

> [!TIP]
> **Dung lượng Cache cục bộ:** Chế độ `vfs-cache-mode full` sẽ lưu tạm các tệp được mở xuống ổ cứng của người dùng. Chúng ta sẽ đặt mặc định giới hạn `--vfs-cache-max-size 10G` và `--dir-cache-time 5m` để không làm đầy ổ cứng của người dùng khi duyệt các Bucket khổng lồ vài Terabyte.

---

## 5. Câu hỏi xác nhận dành cho Bạn (Next Steps & Feedback)
Bạn đánh giá thế nào về bản kế hoạch và phương án sử dụng **Rclone Mount Engine** này?
Nếu bạn đồng ý với định hướng kiến trúc trên, chúng ta có thể bắt đầu bước vào giai đoạn thực thi theo từng bước (Backend Service -> IPC -> UI Modal)!
