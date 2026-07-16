# 🚀 S3 Studio v1.0.0 — Official First Release

**S3 Studio** là ứng dụng máy bàn (Desktop Application) quản lý kho lưu trữ đối tượng S3 cross-platform mạnh mẽ, hiện đại và bảo mật hàng đầu. Phiên bản ra mắt chính thức **v1.0.0** mang đến trải nghiệm làm việc siêu tốc, hỗ trợ đa nền tảng (macOS & Windows) và tương thích tuyệt đối với cả AWS S3 tiêu chuẩn lẫn mọi hệ thống lưu trữ S3-Compatible (MinIO, Ceph RGW, DigitalOcean Spaces, Cloudflare R2,...).

---

## 🌟 TỔNG HỢP CÁC TÍNH NĂNG NỔI BẬT TRONG PHIÊN BẢN v1.0.0

### 1. 🔑 Quản Lý Tài Khoản & Kết Nối Đa Cấu Hình (Multi-Profile Management)
- **Tương thích toàn diện**: Hỗ trợ kết nối linh hoạt tới AWS S3 cũng như mọi máy chủ S3 riêng (MinIO, Ceph RGW, DigitalOcean Spaces, Cloudflare R2, v.v.) thông qua tùy chỉnh Endpoint URL.
- **Nhập nhanh từ Rclone (`rclone.conf`)**: Tự động nhận dạng và import toàn bộ danh sách cấu hình S3 từ Rclone chỉ với 1 cú nhấp chuột.
- **Tối ưu hóa kết nối mạng nội bộ & riêng tư**:
  - Hỗ trợ bật/tắt **Path-Style Addressing (`forcePathStyle`)** theo chuẩn máy chủ cục bộ (`http://endpoint/bucket/object`).
  - Tùy chọn bỏ qua kiểm tra chứng chỉ SSL/TLS tự ký (**Self-Signed SSL**) cho hệ thống nội bộ.
  - Giá trị vùng (`Region`) chuẩn hóa mặc định là **`default`**, tương thích hoàn hảo với mọi hệ thống S3-Compatible mà không cần cấu hình phức tạp.
- **Kiểm tra kết nối (`Test Connection`)**: Công cụ kiểm tra nhanh thông số xác thực trước khi lưu Profile.

---

### 2. 🗂️ Trình Quản Lý Bucket & Đối Tượng (Bucket & Object Explorer)
- **Điều hướng mượt mà**: Giao diện cây thư mục phân cấp rõ ràng, tích hợp thanh đường dẫn (Breadcrumbs) có thể nhấp chuột để di chuyển tức thì.
- **Tìm kiếm tức thì**: Thanh tìm kiếm nhanh giúp lọc danh sách Bucket và Object trong tích tắc.
- **Quản lý Bucket toàn diện**:
  - Tạo mới Bucket nhanh chóng với tùy chỉnh Region.
  - Xem và quản lý trạng thái **Versioning** của Bucket (xem trạng thái `Enabled`/`Suspended` và hỗ trợ kích hoạt/tạm dừng).
  - Xóa Bucket an toàn kèm cơ chế bảo vệ xác nhận 2 bước.
- **Hiển thị thông số chi tiết**: Bảng danh sách tệp tin hiển thị trực quan kích thước chuẩn hóa, loại nội dung (`Content-Type`), Storage Class, ETag, mã Version ID (nếu bật Versioning) và ngày chỉnh sửa cuối (`Last Modified`).
- **Thao tác nhanh trên tệp tin**: Kéo-thả tệp (`Drag & Drop Upload`), sao chép đường dẫn S3 Key, sao chép URL đối tượng và tạo thư mục ảo (`Prefix`) linh hoạt.

---

### 3. ⚡ Động Cơ Truyền Tải Siêu Tốc & Hàng Đợi Song Song (Parallel Transfer Engine)
- **Tải nhiều tệp & Thư mục cùng lúc (Bulk & Folder Transfer)**:
  - Chọn hàng loạt tệp tin qua checkbox để tải về cùng lúc (`Bulk Download`) chỉ với 1 lần chọn thư mục đích.
  - Tải xuống và tải lên **nguyên thư mục (`Folder Upload / Download`)**, tự động đệ quy và giữ nguyên hoàn hảo cấu trúc thư mục con.
- **Phân mảnh tự động đa luồng (Dynamic Multipart Upload & Download)**:
  - Tự động phát hiện kích thước tệp và áp dụng thuật toán phân mảnh tối ưu rclone (`calculateOptimalPartSize`) cho các tệp từ 15MB đến hàng chục GB.
  - Khởi chạy tối đa **8 luồng truyền tải song song (`queueSize: 8`)** giúp tận dụng tối ưu băng thông đường truyền internet/nội bộ.
- **Quản lý Hàng đợi (Transfer Queue & Live Monitor)**:
  - Theo dõi trực tiếp tiến độ thời gian thực (% hoàn thành, số byte đã chuyển, tốc độ truyền tải `MB/s`).
  - Hỗ trợ **Hủy tiến trình (`Cancel/Abort`)** ngay khi đang chạy, tự động gọi API `AbortMultipartUpload` để dọn dẹp các phần dữ liệu dở dang trên máy chủ S3, không làm thất thoát dung lượng.
- **Cơ chế tự động thử lại (`Exponential Backoff Retry`)**: Tự động phục hồi khi gặp sự cố ngắt quãng mạng và tự động dọn dẹp tệp tải dở/hỏng trên máy tính trước khi thử lại.

---

### 4. 🛡️ Bảo Mật & Trải Nghiệm Người Dùng (Safety & UI/UX)
- **Giao diện Dark Mode Studio**: Thiết kế hiện đại, độ tương phản cao, hiệu ứng mượt mà và thông báo nhạy bén (Toast alerts).
- **Cơ chế xác nhận 2 bước an toàn (`Two-Step Verification`)**: Áp dụng quy tắc bảo vệ nghiêm ngặt cho mọi thao tác nguy hiểm (xóa Bucket, xóa thư mục, xóa hàng loạt tệp tin), buộc người dùng xác nhận hoặc gõ chính xác tên để tránh tối đa các tai nạn mất mát dữ liệu.

---

### 5. 🔄 Cập Nhật Tự Động Tại Chỗ & Hỗ Trợ macOS Gatekeeper (In-Place Auto Update)
- **Tối ưu hóa cho macOS**: Chuyển đổi hoàn toàn cơ chế cập nhật từ `.dmg` sang gói nén `.zip` tải ngầm và tự động giải nén ghi đè tại chỗ (`In-Place Unzip`). Khắc phục triệt để lỗi Gatekeeper (*"App is damaged and can't be opened"*) trên macOS Ventura, Sonoma, Sequoia khi tải ứng dụng ngoài Mac App Store.
- **Tôn trọng quyết định người dùng**: Hệ thống kiểm tra bản cập nhật mới, hiển thị thông tin và **luôn hỏi ý kiến người dùng** để xác nhận trước khi tiến hành cập nhật ứng dụng.

---

## 🛠️ Hướng Dẫn Cài Đặt & Sử Dụng Nhanh

### Đối với Người dùng macOS (Apple Silicon M1/M2/M3 & Intel)
1. Tải về tệp cài đặt `.dmg` (hoặc `.zip`) từ trang Releases.
2. Kéo thả biểu tượng **S3 Studio.app** vào thư mục **Applications**.
3. *Lưu ý macOS Gatekeeper*: Nếu gặp thông báo chặn ứng dụng lần đầu, chỉ cần vào **System Settings > Privacy & Security** và nhấn **Open Anyway (Vẫn mở)**, hoặc nhấp chuột phải vào ứng dụng trong Applications -> chọn **Open**.

### Đối với Người dùng Windows
1. Tải về gói cài đặt `.exe` (Setup).
2. Nhấp đúp chuột và làm theo các bước cài đặt nhanh chóng.

---

*Cảm ơn bạn đã tin dùng S3 Studio! Mọi ý kiến đóng góp và báo lỗi vui lòng gửi tại GitHub Issues.*
