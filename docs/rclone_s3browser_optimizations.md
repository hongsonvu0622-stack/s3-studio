# Tối ưu hóa S3 Studio theo chuẩn S3 Browser & Rclone

> Tài liệu phân tích và tích hợp các tính năng cao cấp từ **S3 Browser** và **Rclone** vào **S3 Studio** dành riêng cho hệ thống **Ceph Object Gateway (RGW)** và **Amazon S3**.

---

## 1. Học hỏi từ S3 Browser (UI/UX & Quản trị S3 Chuyên sâu)

### 1.1 Khả năng Quản lý Tác vụ & Giới hạn Băng thông (Bandwidth Throttling)
- **Vấn đề thực tế**: Khi tải lên/xuống các tập tin lớn vài trăm GB với tốc độ tối đa, đường truyền mạng nội bộ (hoặc VPN tới Ceph cluster) có thể bị nghẽn hoàn toàn.
- **Giải pháp trong S3 Studio**:
  - Tích hợp bộ kiểm soát tốc độ (Bandwidth Throttle / Speed Limit) cho phép cấu hình giới hạn băng thông tối đa (ví dụ `10 MB/s`, `50 MB/s`, hoặc `Unlimited`).

### 1.2 Phân quyền ACL chi tiết & Xuất/Nhập cấu hình
- Hỗ trợ nhập/xuất (Export / Import) cấu hình kết nối tài khoản an toàn để chia sẻ nhanh trong nhóm DevOps / SysAdmin.

---

## 2. Học hỏi từ Rclone (Core Engine & Data Integrity)

Rclone được mệnh danh là "Swiss Army Knife" của quản lý Cloud Storage nhờ engine xử lý luồng cực kỳ bền bỉ và chính xác. S3 Studio áp dụng các kỹ thuật cốt lõi sau từ Rclone:

### 2.1 Tính Toàn vẹn Dữ liệu (Data Integrity & MD5 / ETag Checksum Verification)
- **Cơ chế Rclone**: Rclone luôn xác thực mã băm (`ETag` / MD5) sau mỗi tác vụ upload để đảm bảo không sai lệch dù chỉ 1 byte.
- **Áp dụng trong S3 Studio**:
  - Sau khi hoàn thành upload từng tập tin, hệ thống kiểm tra `ETag` trả về từ Ceph RGW / S3 để xác nhận dữ liệu toàn vẹn 100%.

### 2.2 Dynamic Multipart Chunk Size (Tự động điều chỉnh kích thước Part theo dung lượng)
- **Cơ chế Rclone (`--s3-chunk-size`)**: Với tập tin khổng lồ (từ vài GB đến vài TB), nếu giữ `partSize` cố định 5MB sẽ vượt quá giới hạn 10.000 parts của giao thức S3.
- **Áp dụng trong S3 Studio**:
  - Thuật toán tự động tính toán `partSize` theo dung lượng tập tin:
    - File < 100 MB: `5 MB / part`
    - File 100 MB - 1 GB: `10 MB / part`
    - File 1 GB - 10 GB: `25 MB / part`
    - File > 10 GB: `64 MB - 128 MB / part`

### 2.3 Cơ chế Thử lại Tự động (Automatic Retry with Exponential Backoff)
- Khi kết nối tới Ceph cluster bị rớt gói tin hoặc gặp HTTP `500 / 503 Slow Down`, Worker tự động thử lại tác vụ với độ trễ lũy thừa (Backoff delay: 1s -> 2s -> 4s -> 8s) giúp truyền tải không bị ngắt quãng nửa chừng.

### 2.4 Trình Nhập Cấu hình trực tiếp từ `rclone.conf` (Rclone Config Importer)
- S3 Studio hỗ trợ đọc và nhập tự động các profile `type = s3` từ file cấu hình `~/.config/rclone/rclone.conf` của người dùng, giúp chuyển đổi từ Rclone CLI sang giao diện đồ họa S3 Studio chỉ trong 1 giây.

---

## 3. Tối ưu Trải nghiệm Kéo thả & Truyền tải Siêu tốc (Drag & Drop + Multi-threaded Upload Engine)

### 3.1 Kéo thả tập tin trực tiếp từ Finder/Explorer (Native Drag & Drop)
- Hỗ trợ kéo thả tập tin trực tiếp từ macOS Finder / Windows Explorer vào cửa sổ duyệt Bucket của S3 Studio.
- Sử dụng API Electron `webUtils.getPathForFile` để lấy chính xác đường dẫn tuyệt đối của tập tin trên hệ thống file một cách bảo mật.

### 3.2 Bộ phân loại luồng thông minh (SINGLE STREAM vs MULTIPART 8 LUỒNG)
- **Tập tin < 15 MB**: Được đánh dấu chế độ **`SINGLE STREAM`**, truyền tải một lần duy nhất với header `ContentLength` đầy đủ giúp tối ưu độ trễ (nhanh gấp 3-5 lần so với khởi tạo Multipart).
- **Tập tin ≥ 15 MB**: Được đánh dấu chế độ **`⚡ MULTIPART (8 LUỒNG)`**, tự động chia thành các part song song đẩy qua 8 kết nối HTTP đồng thời (`queueSize: 8`) kết hợp bộ đệm đọc I/O 4MB (`highWaterMark: 4MB`).
- **Hiển thị trực quan**: Nhãn trạng thái chế độ (`SINGLE STREAM` màu xanh biển / `⚡ MULTIPART (8 LUỒNG)` màu tím huy hiệu) được hiển thị rõ ràng ngay bên cạnh tên tập tin trong Hàng đợi.

### 3.3 Tự động Làm mới Màn hình (Auto-Refetch trên IPC event `transfer-completed`)
- Khi một tác vụ tải lên hoàn tất, tiến trình Main gửi ngay sự kiện `transfer-completed` tới Renderer.
- Giao diện tự động kiểm tra Bucket hiện tại và làm mới danh sách tập tin lập tức, không yêu cầu người dùng thao tác bấm nút làm mới thủ công.

### 3.4 Trực quan hóa Tiến trình từng Chunk (Visual Chunks Grid)
- Đối với các tác vụ `MULTIPART`, hệ thống tính toán chính xác tổng số phần (`totalParts`) và số phần đã hoàn tất (`completedParts`).
- Hiển thị thanh lưới trực quan dưới mỗi tác vụ lớn:
  - **Khối xanh lá (`bg-emerald-400`)**: Các phần đã hoàn tất tải lên thành công.
  - **Khối tím nhấp nháy (`bg-purple-400 animate-pulse`)**: Các phần đang được 8 luồng song song truyền tải tại thời điểm thực.
  - **Khối xám tối (`bg-border`)**: Các phần đang chờ trong hàng đợi.
