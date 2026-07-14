# 🚀 S3 Studio

**S3 Studio** là ứng dụng máy tính nền tảng đa hệ điều hành (macOS, Windows, Linux) được thiết kế chuyên nghiệp, hiện đại với giao diện Glassmorphism (Cyber Dark Mode) giúp quản lý, duyệt dữ liệu và cấu hình lưu trữ đối tượng **S3 Object Storage** một cách trực quan và mạnh mẽ nhất.

---

## ✨ Tính Năng Nổi Bật

### 🌐 1. Quản lý Đa Cấu Hình (Multi-Profile Management)
- **Hỗ trợ mọi nhà cung cấp S3:** Kết nối mượt mà với AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces, Wasabi, Backblaze B2, hoặc bất kỳ hệ thống S3-compatible nào.
- **Nhập nhanh từ Rclone:** Hỗ trợ nhập (Import) tự động danh sách cấu hình trực tiếp từ tệp `rclone.conf` chỉ với 1 cú nhấp chuột.
- **Kiểm tra kết nối tức thời:** Kiểm tra độ phản hồi và xác thực thông tin đăng nhập trước khi kết nối.

### 📁 2. Trình Duyệt Dữ Liệu Trực Quan (Visual Object Explorer)
- **Cấu trúc thư mục ảo tốc độ cao:** Duyệt qua hàng nghìn đối tượng theo dạng cây thư mục mượt mà, hỗ trợ phân trang hiệu năng cao.
- **Tìm kiếm tức thì:** Tìm kiếm đối tượng siêu nhanh theo tiền tố (Prefix search).
- **Thao tác tệp tin đa dạng:**
  - Tạo mới Bucket và tạo thư mục ảo.
  - Tải lên (Upload) và Tải xuống (Download) hàng loạt tệp tin cùng lúc.
  - Sao chép (Copy), Di chuyển & Đổi tên (Move / Rename) đối tượng dễ dàng giữa các thư mục hoặc bucket.
  - Xóa đối tượng an toàn với hộp thoại xác nhận.

### ⚡ 3. Quản Lý Hàng Đợi Chuyền Tải (Transfer Queue & Concurrency)
- **Hàng đợi ngầm mạnh mẽ:** Theo dõi chính xác tiến độ tải lên/tải xuống của từng tập tin (phần trăm hoàn thành, dung lượng, tốc độ).
- **Tùy chỉnh đa luồng (Concurrency Level):** Cho phép điều chỉnh số luồng tải đồng thời từ 1 đến 20 luồng tùy thuộc vào băng thông mạng.
- **Hủy & Dọn dẹp:** Dễ dàng hủy tác vụ đang chạy hoặc dọn dẹp lịch sử chuyền tải đã hoàn thành.

### 🕒 4. Quản Lý Lịch Sử & Phiên Bản (Object Versioning & History)
- **Xem lịch sử phiên bản:** Hiển thị danh sách đầy đủ tất cả các phiên bản (Versions) của từng tệp tin trong Bucket có bật Versioning.
- **Phục hồi (Restore / Rollback):** Khôi phục lại phiên bản cũ của đối tượng chỉ với 1 thao tác bấm nút.
- **Tải xuống bản cũ:** Tải trực tiếp bất kỳ phiên bản lịch sử nào về máy tính.
- **Quản lý Delete Marker:** Nhận diện và xóa bỏ dấu chuẩn bị xóa (Delete Marker) để làm sống lại tệp tin.

### 🛠️ 5. Quản Lý Bucket Nâng Cao (Advanced Bucket Management)
- **Bucket Policy Editor:** Trình soạn thảo JSON syntax highlighting chuyên nghiệp cho phép xem và cập nhật Bucket Policy.
- **Cấu hình ACL (Access Control List):** Phân quyền truy cập chi tiết cho từng Bucket hoặc từng Đối tượng (Private, Public Read, Public Read-Write,...).
- **Vòng Đời Dữ Liệu (Lifecycle Rules):** Thiết lập các quy tắc tự động hóa dọn dẹp hoặc chuyển tầng lưu trữ tệp tin hết hạn theo thời gian.
- **CORS Configuration:** Cấu hình chính sách chia sẻ tài nguyên giữa các tên miền (Cross-Origin Resource Sharing) chuẩn JSON.

### 🔗 6. Chia Sẻ & Đường Dẫn Tạm Thời (Presigned & Public URLs)
- **Tạo Presigned URL bảo mật:** Tạo đường dẫn chia sẻ tạm thời cho đối tượng với thời hạn hết hạn tùy chỉnh linh hoạt (từ 15 phút, 1 giờ, 24 giờ đến 7 ngày).
- **Lấy Public URL:** Lấy nhanh đường dẫn truy cập công khai cho các bucket mở và sao chép thẳng vào Clipboard.

### 🔄 7. Tự Động Cập Nhật Ngầm (Smart Auto-Updater)
- **Cơ chế cập nhật tự động bằng Shell:** Tự động kiểm tra bản phát hành mới từ GitHub Releases khi khởi chạy ứng dụng.
- **Tải ngầm trong nền:** Tải tệp cập nhật mới không gây ảnh hưởng hay gián đoạn đến quá trình làm việc.
- **Cài đặt siêu nhanh:** Chỉ cần bấm "Khởi động lại ngay", ứng dụng sẽ tự động thay thế và nâng cấp phiên bản mới chỉ trong 2 giây.

---

## 🍏 Hướng Dẫn Dành Cho Người Dùng macOS & Cách Xử Lý Lỗi Gatekeeper ("App is damaged")

Khi tải tệp cài đặt (`.dmg` hoặc `.zip`) từ GitHub Releases và mở lần đầu tiên trên máy Mac (đặc biệt là các phiên bản macOS Ventura, Sonoma, Sequoia), do ứng dụng mã nguồn mở được đóng gói dưới dạng tự ký (**Ad-hoc signed** / chưa qua đăng ký trả phí Apple Developer $99/năm), tính năng bảo mật **Gatekeeper** của macOS có thể chặn lại và hiển thị thông báo:

> **⚠️ "S3 Studio.app is damaged and can't be opened. You should move it to the Trash."**  
> *(hoặc: "S3 Studio.app không thể mở được vì không thể xác minh nhà phát triển")*

Đây là cơ chế bảo vệ mặc định của macOS đối với ứng dụng tải ngoài Mac App Store. Bạn chỉ cần thực hiện **1 lần duy nhất** theo một trong hai cách dưới đây để cấp quyền cho ứng dụng hoạt động vĩnh viễn:

### 💡 Cách 1: Gỡ bỏ thuộc tính cách ly bằng Terminal (Khuyên dùng - Nhanh nhất)

1. Mở tệp `.dmg`, kéo biểu tượng **S3 Studio** thả vào thư mục **Applications** (Ứng dụng).
2. Nhấn tổ hợp phím `Command (⌘) + Space`, gõ `Terminal` và nhấn **Enter** để mở trình lệnh.
3. Dán dòng lệnh sau vào Terminal và nhấn **Enter**:
   ```bash
   sudo xattr -cr "/Applications/S3 Studio.app"
   ```
4. Nhập mật khẩu máy Mac của bạn (lưu ý: khi gõ mật khẩu, các ký tự sẽ ẩn không hiển thị trên màn hình, bạn cứ gõ chính xác rồi nhấn **Enter**).
5. Khởi chạy lại **S3 Studio** bình thường từ Launchpad hoặc thư mục Applications!

---

### 💡 Cách 2: Mở quyền thông qua Cài Đặt Hệ Thống (System Settings)

1. Khi mở ứng dụng lần đầu và gặp thông báo chặn, hãy nhấn nút **Cancel** (Hủy) hoặc **Done** (Xong).
2. Mở **System Settings** (Cài đặt hệ thống) trên máy Mac -> Chọn mục **Privacy & Security** (Quyền riêng tư & Bảo mật).
3. Cuộn xuống khu vực **Security** (Bảo mật), bạn sẽ thấy dòng thông báo:  
   *"S3 Studio.app was blocked from use because it is not from an identified developer"* (S3 Studio đã bị chặn sử dụng vì không tới từ nhà phát triển xác định).
4. Nhấn vào nút **Open Anyway** (Vẫn mở).
5. Một hộp thoại xác nhận hiện ra, nhấn **Open** (Mở) và nhập mật khẩu/vân tay máy Mac để xác thực.
6. Ứng dụng sẽ mở lên thành công và từ các lần chạy sau sẽ không còn hỏi lại nữa!

---

## 📋 Yêu Cầu Hệ Thống
- **macOS:** macOS 10.13+ (Hỗ trợ tối ưu cho cả chip Apple Silicon M1/M2/M3/M4 và Intel).
- **Windows:** Windows 10 / 11 (64-bit hoặc ARM64).
- **Linux:** Ubuntu, Debian, Fedora (64-bit / AppImage / DEB).
