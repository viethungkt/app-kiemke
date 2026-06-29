# HƯỚNG DẪN TRIỂN KHAI & ĐỒNG BỘ ỨNG DỤNG KIỂM KÊ
## CÔNG TY TNHH TM-SX HUỆ LINH

Tài liệu này hướng dẫn chi tiết cách đưa ứng dụng kiểm kê vật tư hiện tại lên chạy trực tiếp trên **điện thoại (iOS, Android)** và **máy tính (PC)**, đồng thời cấu hình **đồng bộ hóa dữ liệu thời gian thực** về chung một tệp **Google Sheets**.

---

## 📋 TỔNG QUAN GIẢI PHÁP
Ứng dụng kiểm kê được thiết kế theo mô hình **PWA (Progressive Web App)** kết hợp **Offline-first**:
1. **Triển khai lên Web**: Đưa toàn bộ mã nguồn lên **GitHub Pages** (miễn phí, bảo mật HTTPS bắt buộc đối với tính năng quét camera và PWA).
2. **Cài đặt làm App**: Người dùng thiết bị iOS, Android hoặc PC truy cập đường link và cài đặt ứng dụng thẳng vào màn hình chính (không cần qua App Store hay CH Play).
3. **Đồng bộ hóa dữ liệu**: Sử dụng một tệp **Google Sheets** làm cơ sở dữ liệu trung tâm. Dữ liệu từ tất cả các thiết bị sẽ đồng bộ thông qua **Google Apps Script**.

---

## 🛠️ BƯỚC 1: ĐƯA ỨNG DỤNG LÊN GITHUB PAGES
Tài khoản GitHub của bạn là: `https://github.com/viethungkt`. Hãy thực hiện các bước sau để xuất bản ứng dụng lên web:

### Cách A: Upload thủ công trên giao diện Web (Nhanh nhất)
1. Truy cập [github.com/new](https://github.com/new) và đăng nhập tài khoản.
2. Tạo một Repository mới:
   - **Repository name**: `app-kiemke` (hoặc tên tùy chọn)
   - Chế độ: **Public**
   - Không cần tích chọn README, .gitignore hay license.
   - Nhấn **Create repository**.
3. Ở trang mới hiện ra, tìm dòng *"uploading an existing file"* và nhấp vào đó.
4. Kéo và thả toàn bộ các file trong thư mục dự án của bạn vào vùng tải lên. Các file cần thiết bao gồm:
   - `index.html`
   - `app.js`
   - `auth.js`
   - `data_kho.js`
   - `data_nhansu.js`
   - `data_vattu.js`
   - `manifest.json`
   - `sw.js`
   - `icon-192.png`, `icon-512.png`
5. Chờ các file tải lên xong, nhập thông điệp commit (ví dụ: `Initial commit`) rồi nhấn **Commit changes**.

### Cách B: Sử dụng Git Command Line (Nếu máy đã cài Git)
Chạy các lệnh sau tại thư mục dự án trên máy tính của bạn:
```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/viethungkt/app-kiemke.git
git push -u origin main
```

### 🌐 Bật tính năng GitHub Pages để lấy link chạy App:
1. Tại giao diện Repository `app-kiemke` trên GitHub, nhấp vào tab **Settings** (Cài đặt) ở thanh công cụ phía trên.
2. Ở menu bên trái, tìm và nhấp chọn mục **Pages**.
3. Tại phần **Build and deployment** -> **Source**, giữ nguyên là `Deploy from a branch`.
4. Tại phần **Branch**, đổi từ `None` thành `main` (hoặc `master`), thư mục chọn `/ (root)`.
5. Nhấn **Save** (Lưu).
6. Đợi khoảng 1 - 2 phút, tải lại trang. Bạn sẽ thấy một khung màu xanh lá cây chứa đường link trang web hoạt động, có dạng:
   👉 **`https://viethungkt.github.io/app-kiemke/`**

*Từ lúc này, bất kỳ ai có đường link trên đều có thể truy cập ứng dụng từ PC hoặc điện thoại.*

---

## 📱 BƯỚC 2: CÀI ĐẶT APP LÊN ĐIỆN THOẠI & PC (PWA)

Nhờ công nghệ PWA, ứng dụng có thể chạy ngoại tuyến và quét mã QR trực tiếp qua camera của điện thoại.

### 🍏 Trên điện thoại iPhone / iPad (iOS)
* Bạn bắt buộc phải sử dụng trình duyệt **Safari** mặc định trên iOS để cài đặt ứng dụng.
1. Mở **Safari** và truy cập đường link ứng dụng của bạn: `https://viethungkt.github.io/app-kiemke/`.
2. Nhấn nút **Chia sẻ (Share)** (biểu tượng hình vuông có mũi tên chỉ lên ở thanh công cụ phía dưới màn hình).
3. Cuộn danh sách xuống và nhấp chọn **Thêm vào MH chính (Add to Home Screen)**.
4. Nhập tên ứng dụng hiển thị (ví dụ: `Kiểm Kê HL`) rồi nhấn **Thêm (Add)** ở góc trên bên phải.
5. Ứng dụng sẽ xuất hiện trên màn hình chính của iPhone với biểu tượng logo riêng. Khi mở ra, ứng dụng sẽ chạy toàn màn hình (không có thanh địa chỉ trình duyệt) giống hệt một app native.

### 🤖 Trên điện thoại Android (Samsung, Xiaomi, Oppo...)
1. Mở trình duyệt **Google Chrome** và truy cập đường link ứng dụng.
2. Thường trình duyệt sẽ hiển thị một thông báo ở cuối màn hình: **"Thêm Kiểm Kê HL vào Màn hình chính"** hoặc biểu tượng tải xuống. Nhấp vào đó để cài đặt.
3. Nếu không thấy thông báo tự động: Nhấp vào biểu tượng **3 dấu chấm** ở góc trên bên phải trình duyệt Chrome -> chọn **Cài đặt ứng dụng (Install App)** hoặc **Thêm vào Màn hình chính**.
4. Xác nhận cài đặt. Ứng dụng sẽ xuất hiện trên màn hình nền điện thoại.

### 💻 Trên máy tính PC / Laptop (Windows, macOS)
1. Sử dụng trình duyệt **Google Chrome** hoặc **Microsoft Edge** truy cập đường link app.
2. Trên thanh địa chỉ (URL bar) ở góc bên phải, bạn sẽ thấy biểu tượng **Cài đặt ứng dụng** (hình màn hình máy tính kèm mũi tên đi xuống).
3. Nhấp vào biểu tượng đó và chọn **Cài đặt (Install)**.
4. Ứng dụng sẽ được cài đặt và tạo lối tắt (shortcut) trên màn hình Desktop của PC.

---

## 🔄 BƯỚC 3: CẤU HÌNH ĐỒNG BỘ DỮ LIỆU QUA GOOGLE SHEETS

Để dữ liệu kiểm kê từ tất cả các máy (iOS, Android, PC) tự động đồng bộ về một tệp dữ liệu chung, ta sử dụng **Google Sheets** làm máy chủ lưu trữ.

### 1. Tạo tệp Google Sheet
1. Truy cập [Google Sheets](https://sheets.google.com) và tạo một Trang tính mới trống.
2. Đặt tên cho trang tính (Ví dụ: `Dữ liệu Kiểm kê Huệ Linh`).
3. Đổi tên trang tính con đầu tiên (Sheet Name) thành: **`KiemKe`** *(Lưu ý: Viết hoa đúng chữ K và không có dấu)*.

### 2. Dán mã Google Apps Script
1. Trên thanh menu của Google Sheets, nhấp vào **Tiện ích mở rộng (Extensions)** -> Chọn **Apps Script**.
2. Xóa toàn bộ đoạn code mặc định có sẵn trong khung soạn thảo.
3. Sao chép và dán chính xác đoạn code dưới đây vào:

```javascript
// =====================================================================
// Google Apps Script — App Kiểm Kê Vật Tư Huệ Linh ERP Bravo
// Paste toàn bộ code này vào Apps Script, Deploy > Web app > Anyone
// =====================================================================

function doPost(e){
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    // Ping test để kiểm tra kết nối từ app
    if(data.action === 'ping'){
      var shPing = ss.getSheetByName('KiemKe') || ss.insertSheet('KiemKe');
      shPing.appendRow([new Date(), 'PING', '— Kết nối thành công từ App Kiểm Kê Huệ Linh']);
      return ok();
    }

    var p = data.record;

    // Lấy sheet KiemKe
    var sh = ss.getSheetByName('KiemKe') || ss.insertSheet('KiemKe');
    
    // Tìm dòng đã tồn tại theo ID để cập nhật, nếu không thấy thì thêm mới
    var lastRow = sh.getLastRow();
    var rowToEdit = -1;
    if(lastRow > 1){
      var ids = sh.getRange(2, 1, lastRow-1, 1).getValues().flat();
      var idx = ids.indexOf(p.id);
      if(idx >= 0){
        rowToEdit = idx + 2; // 1-based index và bù dòng tiêu đề
      }
    }
    
    // Tạo tiêu đề cột nếu sheet trống
    if(lastRow === 0){
      sh.appendRow(['ID', 'Ngày kiểm', 'Mã Kho', 'Vị trí', 'Mã ERP Final', 'Mã Barcode Final',
        'Tên vật tư', 'ĐVT', 'Phân loại', 'Nhóm hàng', 'Mã cũ',
        'Số lượng thực đếm', 'Tình trạng', 'Hạn sử dụng', 'Ghi chú', 'Người kiểm', 'Mã NV người kiểm', 'Đồng bộ lúc']);
    }
    
    var rowValues = [
      p.id,
      p.ngay,
      p.kho,
      p.vitri,
      p.ma_erp,
      p.ma_qr,
      p.ten_hang,
      p.dvt,
      p.loai,
      p.nhom,
      p.ma_cu,
      p.so_luong,
      p.tinh_trang,
      p.hsd || '',
      p.ghichu || '',
      p.nguoi_kiem,
      p.nguoi_kiem_ma,
      p.sync_time
    ];
    
    if(rowToEdit >= 2){
      sh.getRange(rowToEdit, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sh.appendRow(rowValues);
    }

    return ok();
  } catch(err) {
    return ContentService.createTextOutput('ERROR: ' + err.message);
  }
}

function ok(){ return ContentService.createTextOutput('OK'); }

function doGet(e){ return ContentService.createTextOutput('App Kiểm Kê Huệ Linh — GAS đang hoạt động. Dùng POST để gửi dữ liệu.'); }
```

4. Nhấp vào biểu tượng **Lưu dự án (Save project)** (hình đĩa mềm) hoặc ấn tổ hợp phím `Ctrl + S`.

### 3. Deploy (Triển khai) mã Apps Script dưới dạng Web App
1. Nhấp vào nút **Triển khai (Deploy)** ở góc trên bên phải -> Chọn **Triển khai mới (New deployment)**.
2. Ở cửa sổ hiện ra, nhấp vào biểu tượng **Bánh răng cài đặt** cạnh dòng "Chọn loại" -> Chọn **Ứng dụng web (Web app)**.
3. Cấu hình các thông tin sau:
   - **Mô tả (Description)**: `Triển khai API App Kiểm Kê`
   - **Thực thi dưới danh nghĩa (Execute as)**: Chọn **Tôi (Địa chỉ email của bạn)**.
   - **Ai có quyền truy cập (Who has access)**: Chọn **Bất kỳ ai (Anyone)**.
4. Nhấn nút **Triển khai (Deploy)**.
5. Một thông báo yêu cầu cấp quyền xuất hiện (do script cần ghi dữ liệu vào Sheet của bạn), nhấp vào **Cấp quyền truy cập (Authorize access)**.
6. Chọn tài khoản Google của bạn -> Nhấp chọn **Advanced** (Nâng cao) ở góc dưới -> Nhấp vào dòng **Go to Untitled project (unsafe)** hoặc **Đi tới Dự án không có tiêu đề (không an toàn)** -> Nhấp **Cho phép (Allow)**.
7. Đợi quá trình tạo hoàn tất, Google sẽ cung cấp cho bạn một đường link **URL ứng dụng web (Web app URL)** (có đuôi `/exec`).
8. Hãy **Sao chép (Copy)** đường link này.

---

## ⚙️ BƯỚC 4: LIÊN KẾT APP VỚI GOOGLE SHEETS

Sau khi đã có link Web App Apps Script, hãy cấu hình nó trên các thiết bị để bắt đầu đồng bộ.

1. Mở ứng dụng kiểm kê đã cài đặt trên thiết bị (PC, iOS, Android).
2. Đăng nhập với tài khoản **Admin** (Tài khoản mặc định: `admin`, mật khẩu: `admin123`).
3. Truy cập vào mục **Cấu hình** (Settings) ở menu bên trái.
4. Tại phần **Chế độ hoạt động**, chọn **Đồng bộ Google Sheets**.
5. Dán đường link Web App URL đã copy ở Bước 3 vào ô **URL Google Apps Script**.
6. Nhấp vào nút **Kiểm tra kết nối**.
   - Nếu hệ thống báo: *"Đã kết nối thành công. Vui lòng mở Google Sheets kiểm tra dòng PING."* -> Cấu hình thành công.
   - Bạn mở lại trang Google Sheets, nếu thấy có một dòng chứa chữ `PING` xuất hiện là hoàn tất.
7. Thực hiện tương tự trên các thiết bị khác (iPhone, Android, PC của nhân viên khác) bằng cách dán chung một đường link Web App URL này vào phần cấu hình của họ.

---

## 💡 HƯỚNG DẪN SỬ DỤNG CHO NHÂN VIÊN
Khi đã kết nối thành công:
* **Chế độ Offline**: Nhân viên có thể đi vào các vùng kho sóng yếu hoặc mất mạng để kiểm kê bình thường. Dữ liệu sẽ lưu tạm vào bộ nhớ máy (Local Storage) và hiển thị dòng cảnh báo *"Chưa đồng bộ"*.
* **Khi có mạng (Wifi/4G)**: Vào menu **Lịch sử** hoặc nhấn vào nút **Đồng bộ ngay** ở đầu trang. Hệ thống sẽ tự động đẩy toàn bộ dữ liệu kiểm kê chưa đồng bộ lên Google Sheets.
* **Đối chiếu số liệu**: Dữ liệu trên Google Sheet có thể tải về dưới dạng file Excel để đối chiếu trực tiếp với phần mềm Bravo hoặc nhập trực tiếp (Import CSV) vào Bravo.
