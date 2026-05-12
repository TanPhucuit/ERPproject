# Hướng Dẫn Chi Tiết Nhập Liệu Các Phân Hệ ERP

> Tài liệu này hướng dẫn cách nhập liệu cho từng phân hệ. Master Data được quản lý riêng, tài liệu này tập trung vào các chức năng nhập liệu chính.

---

## 📋 MỤC LỤC

1. [Phân Hệ Bán Hàng (Sales)](#phân-hệ-bán-hàng-sales)
2. [Phân Hệ Mua Hàng (Purchase)](#phân-hệ-mua-hàng-purchase)
3. [Phân Hệ CRM (Quản Lý Khách Hàng Tiềm Năng)](#phân-hệ-crm-quản-lý-khách-hàng-tiềm-năng)
4. [Phân Hệ Kế Toán (Accounting)](#phân-hệ-kế-toán-accounting)
5. [Phân Hệ Kho Bãi (Inventory)](#phân-hệ-kho-bãi-inventory)

---

## Phân Hệ Bán Hàng (Sales)

Phân hệ này quản lý quy trình bán hàng từ báo giá đến đơn hàng và giao hàng.

### 1. Báo Giá (Quotation)

**Mục đích**: Tạo báo giá (offer) gửi cho khách hàng để xin duyệt trước khi lập đơn hàng.

**Các trường nhập vào chi tiết:**

**Quotation # (Số báo giá)**
- Định dạng: Tự động tạo hoặc nhập thủ công (ví dụ: QT001, QT-2024-001)
- Ý nghĩa: Mã định danh duy nhất để phân biệt các báo giá
- Ví dụ: QT-2024-0001 cho báo giá đầu tiên của năm 2024

**Customer (Khách hàng)**
- Kiểu: Lựa chọn từ danh sách (Select dropdown)
- Ý nghĩa: Chọn khách hàng sẽ nhận báo giá này
- Ví dụ: Chọn "Công ty ABC" từ danh sách
- Yêu cầu: Bắt buộc phải chọn

**Lead (Cơ hội bán)**
- Kiểu: Lựa chọn từ danh sách (Optional)
- Ý nghĩa: Nếu báo giá này kèm theo một lead/cơ hội bán nào, hãy chọn
- Ví dụ: Chọn "Lead từ Trưởng phòng Sales - Dự án SmartHome"
- Ghi chú: Có thể để trống

**Quote Date (Ngày lập báo giá)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày tạo báo giá, thường là ngày hôm nay
- Ví dụ: 15/03/2024
- Yêu cầu: Bắt buộc nhập

**Expiry Date (Ngày hết hiệu lực)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày mà khách hàng phải quyết định, sau ngày này báo giá không còn hiệu lực
- Ví dụ: 30/03/2024 (thường là 2 tuần sau ngày lập báo giá)
- Ghi chú: Có thể để trống

**Subtotal (Tổng cộng chưa thuế)**
- Kiểu: Số tiền
- Ý nghĩa: Tổng giá trị tất cả sản phẩm/dịch vụ chưa tính thuế
- Ví dụ: 100,000,000 (tính VNĐ)
- Ghi chú: Thường được tính tự động từ các dòng chi tiết

**Discount (Chiết khấu)**
- Kiểu: Số tiền
- Ý nghĩa: Số tiền giảm giá (nếu có)
- Ví dụ: 5,000,000 (nếu cấp 5% giảm)
- Ghi chú: Có thể để trống nếu không có chiết khấu

**Tax (Thuế)**
- Kiểu: Số tiền
- Ý nghĩa: Tiền thuế VAT (10% giá trị sau chiết khấu)
- Ví dụ: 9,500,000 (10% của 95,000,000)
- Ghi chú: Thường được tính tự động

**Total (Tổng cộng)**
- Kiểu: Số tiền
- Ý nghĩa: Tổng tiền cuối cùng khách hàng phải trả (Subtotal - Discount + Tax)
- Ví dụ: 104,500,000
- Yêu cầu: Bắt buộc nhập
- Công thức: (Subtotal - Discount) + Tax

**Status (Trạng thái)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Tình trạng hiện tại của báo giá
- Các giá trị:
  - **Draft (Nháp)**: Báo giá mới tạo, chưa gửi
  - **Sent (Đã gửi)**: Gửi cho khách hàng rồi
  - **Accepted (Chấp nhận)**: Khách hàng đồng ý, có thể tạo đơn hàng
  - **Rejected (Từ chối)**: Khách hàng không đồng ý
  - **Expired (Hết hiệu lực)**: Quá ngày hết hạn

**Notes (Ghi chú)**
- Kiểu: Văn bản dài (Textarea)
- Ý nghĩa: Thông tin thêm về báo giá (điều khoản, yêu cầu đặc biệt, v.v.)
- Ví dụ: "Giá không bao gồm chi phí lắp đặt. Yêu cầu cọc 30% khi ký HĐ."

**Internal Notes (Ghi chú nội bộ)**
- Kiểu: Văn bản dài
- Ý nghĩa: Ghi chú chỉ cho nhân viên bán hàng, khách hàng không thấy
- Ví dụ: "Khách hàng đã mua 2 lần, vui vẻ. Có thể tăng điều khoản thanh toán."

---

### 2. Đơn Hàng Bán (Sales Order)

**Mục đích**: Xác nhận đơn hàng từ khách hàng, dùng để lên kế hoạch sản xuất/cung cấp và theo dõi giao hàng.

**Các trường nhập vào chi tiết:**

**Sales Order # (Số đơn hàng)**
- Định dạng: Tự động tạo hoặc nhập thủ công (ví dụ: SO001, SO-2024-001)
- Ý nghĩa: Mã định danh duy nhất cho đơn hàng
- Ví dụ: SO-2024-0001

**Customer (Khách hàng)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Khách hàng sẽ mua hàng
- Ví dụ: "Công ty ABC"
- Yêu cầu: Bắt buộc

**Quotation (Báo giá liên quan)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Nếu đơn hàng này dựa trên báo giá nào, hãy chọn (để theo dõi)
- Ví dụ: Chọn "QT-2024-0001"
- Ghi chú: Có thể để trống

**Order Date (Ngày lập đơn hàng)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày khách hàng đặt hàng
- Ví dụ: 25/03/2024
- Yêu cầu: Bắt buộc

**Required Delivery Date (Ngày giao hàng yêu cầu)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày khách hàng yêu cầu nhận hàng
- Ví dụ: 10/04/2024
- Ghi chú: Có thể để trống

**Actual Delivery Date (Ngày giao hàng thực tế)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày thực tế giao hàng cho khách hàng
- Ví dụ: 08/04/2024
- Ghi chú: Để trống nếu chưa giao. Cập nhật khi giao hàng xong

**Subtotal (Tổng cộng chưa thuế)**
- Ý nghĩa: Tổng giá trị hàng hóa chưa tính thuế
- Ví dụ: 200,000,000
- Ghi chú: Tính từ các dòng chi tiết

**Discount (Chiết khấu)**
- Ý nghĩa: Tổng chiết khấu (nếu có)
- Ví dụ: 10,000,000
- Ghi chú: Có thể để trống

**Tax (Thuế)**
- Ý nghĩa: Tiền thuế VAT
- Ví dụ: 19,000,000
- Ghi chú: Tính tự động

**Total (Tổng cộng)**
- Ý nghĩa: Tổng tiền khách hàng phải trả
- Ví dụ: 209,000,000
- Yêu cầu: Bắt buộc

**Sales Person (Người bán hàng)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Nhân viên bán hàng phụ trách đơn hàng này
- Ví dụ: Chọn "Nguyễn Văn A"
- Ghi chú: Dùng để theo dõi hiệu suất bán hàng

**Status (Trạng thái)**
- Kiểu: Lựa chọn từ danh sách
- Các giá trị:
  - **Draft (Nháp)**: Đơn hàng mới, chưa xác nhận
  - **Confirmed (Đã xác nhận)**: Khách hàng đã xác nhận, chuẩn bị sản xuất/cung cấp
  - **Partially Shipped (Giao một phần)**: Đã giao một phần hàng
  - **Shipped (Đã giao hết)**: Tất cả hàng đã gửi đi
  - **Delivered (Đã giao nhận)**: Khách hàng đã nhận hàng
  - **Cancelled (Hủy)**: Đơn hàng bị hủy

**Notes (Ghi chú)**
- Ý nghĩa: Các yêu cầu đặc biệt, chú thích về đơn hàng
- Ví dụ: "Yêu cầu giao vào sáng, không giao chiều. Liên hệ trước 30 phút."

---

## Phân Hệ Mua Hàng (Purchase)

Phân hệ này quản lý quy trình mua hàng từ tìm kiếm nhà cung cấp đến nhận hàng.

### 1. Yêu Cầu Báo Giá (RFQ - Request for Quotation)

**Mục đích**: Tạo yêu cầu báo giá gửi cho các nhà cung cấp để lấy giá, so sánh chọn nhà cung cấp tốt nhất.

**Các trường nhập vào chi tiết:**

**RFQ # (Số yêu cầu báo giá)**
- Định dạng: RFQ001, RFQ-2024-001, v.v.
- Ý nghĩa: Mã định danh cho yêu cầu báo giá
- Ví dụ: RFQ-2024-0001
- Yêu cầu: Bắt buộc

**Issued Date (Ngày phát hành)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày gửi yêu cầu báo giá cho nhà cung cấp
- Ví dụ: 01/03/2024
- Yêu cầu: Bắt buộc

**Closing Date (Ngày đóng)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Thời hạn nhà cung cấp phải trả lời báo giá
- Ví dụ: 08/03/2024 (7 ngày sau)
- Ghi chú: Có thể để trống

**Total Estimated Cost (Tổng chi phí dự kiến)**
- Kiểu: Số tiền
- Ý nghĩa: Ước tính tổng chi phí (dựa trên báo giá dự kiến)
- Ví dụ: 50,000,000
- Ghi chú: Để tham khảo, có thể để trống

**Status (Trạng thái)**
- Kiểu: Lựa chọn từ danh sách
- Các giá trị:
  - **Draft (Nháp)**: Yêu cầu mới, chưa gửi
  - **Sent (Đã gửi)**: Đã gửi cho nhà cung cấp
  - **Closed (Đã đóng)**: Hết hạn, bắt đầu đánh giá
  - **Cancelled (Hủy)**: Hủy yêu cầu

**Notes (Ghi chú)**
- Ý nghĩa: Yêu cầu đặc biệt, điều kiện, v.v.
- Ví dụ: "Cần giao trong 5 ngày. Kèm chứng chỉ chất lượng ISO."

---

### 2. Đơn Mua Hàng (Purchase Order)

**Mục đích**: Xác nhận đơn hàng với nhà cung cấp, dùng để nhận hàng và kiểm soát chi phí.

**Các trường nhập vào chi tiết:**

**PO # (Số đơn mua hàng)**
- Định dạng: PO001, PO-2024-001, v.v.
- Ý nghĩa: Mã định danh cho đơn mua hàng
- Ví dụ: PO-2024-0001
- Yêu cầu: Bắt buộc

**Supplier (Nhà cung cấp)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Chọn nhà cung cấp sẽ cung cấp hàng
- Ví dụ: "Công ty XYZ - Nhà cung cấp linh kiện"
- Yêu cầu: Bắt buộc

**RFQ (Yêu cầu báo giá)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Nếu đơn mua này dựa trên RFQ nào, chọn nó
- Ví dụ: "RFQ-2024-0001"
- Ghi chú: Có thể để trống

**PO Date (Ngày lập đơn mua)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày lập đơn mua hàng
- Ví dụ: 10/03/2024
- Yêu cầu: Bắt buộc

**Required Delivery Date (Ngày giao hàng yêu cầu)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày yêu cầu nhà cung cấp giao hàng
- Ví dụ: 20/03/2024
- Ghi chú: Có thể để trống

**Actual Delivery Date (Ngày giao hàng thực tế)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày thực tế nhà cung cấp giao hàng
- Ví dụ: 19/03/2024
- Ghi chú: Để trống nếu chưa giao, cập nhật khi giao xong

**Subtotal (Tổng cộng chưa thuế)**
- Ý nghĩa: Tổng giá trị hàng chưa tính thuế
- Ví dụ: 45,000,000

**Tax (Thuế)**
- Ý nghĩa: Tiền thuế VAT
- Ví dụ: 4,500,000

**Total (Tổng cộng)**
- Ý nghĩa: Tổng tiền phải trả cho nhà cung cấp
- Ví dụ: 49,500,000
- Yêu cầu: Bắt buộc

**Received Amount (Số tiền đã nhận)**
- Kiểu: Số tiền
- Ý nghĩa: Số tiền đã thanh toán cho nhà cung cấp
- Ví dụ: 24,750,000 (nếu thanh toán theo từng đợt)
- Ghi chú: Cập nhật khi thanh toán

**Status (Trạng thái)**
- Kiểu: Lựa chọn từ danh sách
- Các giá trị:
  - **Draft (Nháp)**: Đơn mua mới
  - **Confirmed (Đã xác nhận)**: Gửi cho nhà cung cấp
  - **Partial Received (Nhận một phần)**: Nhà cung cấp đã giao một phần
  - **Received (Đã nhận hết)**: Nhận hết hàng
  - **Cancelled (Hủy)**: Hủy đơn

**Notes (Ghi chú)**
- Ý nghĩa: Yêu cầu đặc biệt, điều kiện thanh toán, v.v.
- Ví dụ: "Thanh toán 50% khi ký HĐ, 50% khi giao hàng."

---

## Phân Hệ CRM (Quản Lý Khách Hàng Tiềm Năng)

Phân hệ này quản lý các khách hàng tiềm năng (Lead) và các cơ hội bán hàng.

### 1. Khách Hàng Tiềm Năng (Lead)

**Mục đích**: Lưu trữ thông tin về các khách hàng tiềm năng chưa chuyển đổi thành khách hàng thực tế.

**Các trường nhập vào chi tiết:**

**Lead Number (Mã khách hàng tiềm năng)**
- Định dạng: Tự động tạo (ví dụ: LEAD001, LEAD-2024-001)
- Ý nghĩa: Mã định danh cho lead
- Ví dụ: LEAD-2024-0001
- Ghi chú: Có thể không cần nhập nếu tự động tạo

**Company Name (Tên công ty)**
- Kiểu: Văn bản
- Ý nghĩa: Tên công ty của khách hàng tiềm năng
- Ví dụ: "Công ty Xây Dựng ABC"
- Yêu cầu: Bắt buộc

**Contact Person (Người liên hệ)**
- Kiểu: Văn bản
- Ý nghĩa: Tên người đại diện/người liên hệ
- Ví dụ: "Ông Nguyễn Văn A"
- Ghi chú: Có thể để trống

**Phone (Số điện thoại)**
- Kiểu: Văn bản
- Ý nghĩa: Số điện thoại liên hệ
- Ví dụ: "0901234567"
- Ghi chú: Có thể để trống

**Email (Email)**
- Kiểu: Email
- Ý nghĩa: Email liên hệ
- Ví dụ: "contact@abcxd.com"
- Yêu cầu: Bắt buộc (để gửi thông tin)

**Company Address (Địa chỉ công ty)**
- Kiểu: Văn bản dài
- Ý nghĩa: Địa chỉ công ty khách hàng
- Ví dụ: "123 Nguyễn Hữu Cảnh, Phường 22, Bình Thạnh, TP.HCM"
- Ghi chú: Có thể để trống

**Tax ID (Mã số thuế)**
- Kiểu: Văn bản
- Ý nghĩa: Mã số thuế công ty (nếu có)
- Ví dụ: "0123456789"
- Ghi chú: Có thể để trống

**Sales Person (Người bán hàng phụ trách)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Nhân viên bán hàng sẽ theo dõi lead này
- Ví dụ: "Trần Thị B"
- Ghi chú: Có thể để trống

**Stage (Giai đoạn)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Bước trong quy trình bán hàng
- Yêu cầu: Bắt buộc
- Các giá trị:
  - **New (Mới)**: Lead vừa tạo
  - **Site Survey (Khảo sát hiện trường)**: Đã liên hệ, chuẩn bị khảo sát
  - **Proposition (Đưa ra đề xuất)**: Đã khảo sát, đưa báo giá
  - **Won (Thắng)**: Lead chuyển thành khách hàng thực tế
  - **Lost (Thua)**: Lead từ bỏ, không mua

**Source (Nguồn lead)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Khách hàng tìm hiểu bạn từ kênh nào
- Các giá trị:
  - **Website (Website)**: Khách tìm thấy qua website
  - **Referral (Giới thiệu)**: Được giới thiệu bởi khách hàng cũ
  - **Showroom (Showroom)**: Khách đến xem tại showroom
  - **Architect Partner (Đối tác kiến trúc)**: Từ các kiến trúc sư
  - **Cold Call (Gọi lạnh)**: Bán hàng gọi điện tìm kiếm
  - **Social Media (Mạng xã hội)**: Tìm thấy qua Facebook, Instagram, v.v.

**Rating (Xếp hạng)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Mức độ khả năng khách sẽ mua
- Các giá trị:
  - **Hot (Nóng)**: Khả năng mua cao, cần theo dõi gần
  - **Warm (Ấm)**: Khả năng trung bình, có tiềm năng
  - **Cold (Lạnh)**: Khả năng mua thấp, chưa sẵn sàng

**Estimated Value (Giá trị ước tính)**
- Kiểu: Số tiền
- Ý nghĩa: Ước tính doanh số nếu lead này chuyển đổi
- Ví dụ: 500,000,000 (dự tính bán 500 triệu)
- Ghi chú: Có thể để trống

**Probability (%) (Xác suất (%)**
- Kiểu: Số từ 0-100
- Ý nghĩa: Xác suất khách sẽ mua (%)
- Ví dụ: 60 (tức 60% khả năng thành công)
- Ghi chú: Có thể để trống

**Expected Close Date (Ngày dự kiến đóng đơn)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày dự kiến khách sẽ quyết định mua/không mua
- Ví dụ: 30/04/2024
- Ghi chú: Có thể để trống

**Notes (Ghi chú)**
- Ý nghĩa: Thông tin thêm, lịch sử tương tác, v.v.
- Ví dụ: "Khách quan tâm gói SmartHome cao cấp. Yêu cầu tư vấn thêm về bảo hành."

---

## Phân Hệ Kế Toán (Accounting)

Phân hệ này quản lý các hóa đơn bán hàng, hóa đơn mua hàng, và các ghi chú điều chỉnh.

### 1. Hóa Đơn Bán Hàng (Customer Invoice)

**Mục đích**: Lưu trữ hóa đơn gửi cho khách hàng sau khi giao hàng, dùng để theo dõi thanh toán và kế toán.

**Các trường nhập vào chi tiết:**

**Invoice # (Số hóa đơn)**
- Định dạng: INV001, INV-2024-001, v.v.
- Ý nghĩa: Mã định danh cho hóa đơn
- Ví dụ: INV-2024-0001
- Yêu cầu: Bắt buộc

**Customer (Khách hàng)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Khách hàng sẽ thanh toán
- Ví dụ: "Công ty ABC"
- Yêu cầu: Bắt buộc

**Sales Order (Đơn hàng bán)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Đơn hàng bán nào tạo ra hóa đơn này
- Ví dụ: "SO-2024-0001"
- Ghi chú: Có thể để trống

**Invoice Date (Ngày lập hóa đơn)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày phát hành hóa đơn (thường là ngày giao hàng)
- Ví dụ: 08/04/2024
- Yêu cầu: Bắt buộc

**Due Date (Ngày thanh toán)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Hạn cuối khách hàng phải thanh toán
- Ví dụ: 08/05/2024 (30 ngày sau lập hóa đơn)
- Ghi chú: Có thể để trống

**Subtotal (Tổng cộng chưa thuế)**
- Kiểu: Số tiền
- Ý nghĩa: Tổng giá trị hàng chưa tính thuế
- Ví dụ: 200,000,000

**Tax (Thuế)**
- Kiểu: Số tiền
- Ý nghĩa: Tiền thuế VAT
- Ví dụ: 20,000,000

**Total (Tổng cộng)**
- Kiểu: Số tiền
- Ý nghĩa: Tổng tiền khách hàng phải trả
- Ví dụ: 220,000,000
- Yêu cầu: Bắt buộc

**Paid Amount (Số tiền đã thanh toán)**
- Kiểu: Số tiền
- Ý nghĩa: Số tiền khách hàng đã trả cho đến nay
- Ví dụ: 110,000,000 (nếu thanh toán một nửa)
- Ghi chú: Cập nhật khi khách hàng thanh toán

**Status (Trạng thái)**
- Kiểu: Lựa chọn từ danh sách
- Các giá trị:
  - **Draft (Nháp)**: Hóa đơn mới, chưa phát hành
  - **Issued (Đã phát hành)**: Phát hành cho khách hàng
  - **Sent (Đã gửi)**: Gửi cho khách hàng rồi
  - **Partial Paid (Thanh toán một phần)**: Khách hàng đã trả một phần
  - **Paid (Đã thanh toán)**: Khách hàng trả hết
  - **Overdue (Quá hạn)**: Quá hạn thanh toán
  - **Cancelled (Hủy)**: Hóa đơn bị hủy

**Payment Terms (Điều khoản thanh toán)**
- Kiểu: Văn bản
- Ý nghĩa: Cách thức thanh toán, v.v.
- Ví dụ: "Thanh toán 30% khi ký HĐ, 70% khi giao hàng" hoặc "Net 30"
- Ghi chú: Có thể để trống

**Description (Mô tả)**
- Kiểu: Văn bản dài
- Ý nghĩa: Ghi chú thêm về hóa đơn
- Ví dụ: "Giao hàng tại Phòng HCĐT công ty ABC"
- Ghi chú: Có thể để trống

---

### 2. Hóa Đơn Mua Hàng / Hóa Đơn Nhà Cung Cấp (Vendor Bill)

**Mục đích**: Lưu trữ hóa đơn từ nhà cung cấp, dùng để kiểm soát chi phí và xác nhận thanh toán.

**Các trường nhập vào chi tiết:**

**Bill # (Số hóa đơn)**
- Định dạng: BILL001, BILL-2024-001, v.v.
- Ý nghĩa: Mã định danh cho hóa đơn mua
- Ví dụ: BILL-2024-0001
- Yêu cầu: Bắt buộc

**Supplier (Nhà cung cấp)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Nhà cung cấp gửi hóa đơn
- Ví dụ: "Công ty XYZ"
- Yêu cầu: Bắt buộc

**Purchase Order (Đơn mua hàng)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Đơn mua hàng tương ứng
- Ví dụ: "PO-2024-0001"
- Ghi chú: Có thể để trống

**Bill Date (Ngày hóa đơn)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày nhà cung cấp phát hành hóa đơn
- Ví dụ: 19/03/2024
- Yêu cầu: Bắt buộc

**Due Date (Ngày thanh toán)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Hạn cuối thanh toán cho nhà cung cấp
- Ví dụ: 08/04/2024 (20 ngày sau)
- Ghi chú: Có thể để trống

**Subtotal (Tổng cộng chưa thuế)**
- Ý nghĩa: Tổng giá trị hàng chưa thuế
- Ví dụ: 45,000,000

**Tax (Thuế)**
- Ý nghĩa: Tiền thuế VAT
- Ví dụ: 4,500,000

**Total (Tổng cộng)**
- Ý nghĩa: Tổng tiền phải trả
- Ví dụ: 49,500,000
- Yêu cầu: Bắt buộc

**Paid Amount (Số tiền đã thanh toán)**
- Ý nghĩa: Số tiền đã trả cho nhà cung cấp
- Ví dụ: 24,750,000
- Ghi chú: Cập nhật khi thanh toán

**Status (Trạng thái)**
- Kiểu: Lựa chọn từ danh sách
- Các giá trị:
  - **Draft (Nháp)**: Hóa đơn mới
  - **Received (Đã nhận)**: Nhận được từ nhà cung cấp
  - **Verified (Xác thực)**: Kiểm tra và xác nhận
  - **Partial Paid (Thanh toán một phần)**: Đã trả một phần
  - **Paid (Đã thanh toán)**: Trả hết
  - **Overdue (Quá hạn)**: Quá hạn thanh toán
  - **Cancelled (Hủy)**: Hủy hóa đơn

**Notes (Ghi chú)**
- Ý nghĩa: Thông tin thêm
- Ví dụ: "Đã kiểm tra chất lượng, đạt tiêu chuẩn"
- Ghi chú: Có thể để trống

---

### 3. Ghi Chú Điều Chỉnh (Credit Notes & Debit Notes)

**Credit Note (Ghi chú có tín dụng):**
- Mục đích: Dùng để giảm tiền cho khách hàng (trường hợp trả lại hàng, sai hóa đơn, v.v.)

**Debit Note (Ghi chú có nợ):**
- Mục đích: Dùng để tăng tiền phải thu từ khách hàng hoặc tăng tiền phải trả cho nhà cung cấp

**Các trường nhập vào chi tiết:**

**Note # (Số ghi chú)**
- Định dạng: CN001, DN001, v.v.
- Ý nghĩa: Mã định danh cho ghi chú
- Ví dụ: "CN-2024-0001" hoặc "DN-2024-0001"
- Yêu cầu: Bắt buộc

**Customer / Supplier (Khách hàng / Nhà cung cấp)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Chọn khách hàng hoặc nhà cung cấp liên quan
- Ví dụ: "Công ty ABC" (nếu là credit note cho khách)
- Yêu cầu: Bắt buộc

**Reference Invoice/Bill (Hóa đơn/Hóa đơn mua tham chiếu)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Hóa đơn nào gây ra ghi chú này
- Ví dụ: "INV-2024-0001"
- Ghi chú: Có thể để trống

**Date (Ngày)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày lập ghi chú
- Ví dụ: 15/04/2024
- Yêu cầu: Bắt buộc

**Reason (Lý do)**
- Kiểu: Văn bản
- Ý nghĩa: Lý do phát hành ghi chú
- Ví dụ: "Trả lại 5 sản phẩm bị lỗi" hoặc "Chiết khấu thêm 2%"
- Yêu cầu: Bắt buộc

**Amount (Số tiền)**
- Kiểu: Số tiền
- Ý nghĩa: Số tiền điều chỉnh
- Ví dụ: 5,000,000
- Yêu cầu: Bắt buộc

**Status (Trạng thái)**
- Kiểu: Lựa chọn từ danh sách
- Các giá trị:
  - **Draft (Nháp)**: Ghi chú mới
  - **Issued (Đã phát hành)**: Phát hành cho đối tượng
  - **Applied (Đã áp dụng)**: Đã áp dụng vào hóa đơn

**Description (Mô tả)**
- Kiểu: Văn bản dài
- Ý nghĩa: Mô tả chi tiết về lý do
- Ví dụ: "Khách hàng trả lại hàng do không phù hợp. Đã kiểm tra lại, hàng còn nguyên vẹn. Phát hành credit note giảm 5 triệu."
- Ghi chú: Có thể để trống

---

## Phân Hệ Kho Bãi (Inventory)

Phân hệ này quản lý tồn kho, giao hàng, nhận hàng, và kiểm kê.

### 1. Mức Tồn Kho (Stock Level)

**Mục đích**: Theo dõi số lượng sản phẩm trong kho, cảnh báo khi hết hoặc sắp hết hàng.

**Các trường nhập vào chi tiết:**

**Warehouse (Kho)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Chọn kho lưu trữ sản phẩm
- Ví dụ: "Kho chính TP.HCM" hoặc "Kho Hà Nội"
- Yêu cầu: Bắt buộc

**Product (Sản phẩm)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Chọn sản phẩm cần quản lý
- Ví dụ: "Camera IP Wifi - Model X200"
- Yêu cầu: Bắt buộc

**Bin Location (Vị trí kho)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Vị trí trong kho (nếu có phân khu vực)
- Ví dụ: "A-01-01" (Khu A, Giá 01, Vị trí 01)
- Ghi chú: Có thể để trống

**On Hand (Số lượng có sẵn)**
- Kiểu: Số
- Ý nghĩa: Số lượng sản phẩm hiện có trong kho
- Ví dụ: 150 (đơn vị)
- Yêu cầu: Bắt buộc

**Reserved (Số lượng đã đặt)**
- Kiểu: Số
- Ý nghĩa: Số lượng đã bán nhưng chưa giao (tạm giữ)
- Ví dụ: 30 (30 cái được khách hàng đặt)
- Ghi chú: Có thể để trống

**Available (Số lượng có thể bán)**
- Kiểu: Số
- Ý nghĩa: Số lượng có thể bán = On Hand - Reserved
- Ví dụ: 120 (150 - 30)
- Ghi chú: Tính tự động, chỉ hiển thị

**In Transit (Số lượng đang chuyển)**
- Kiểu: Số
- Ý nghĩa: Số lượng đang vận chuyển từ nhà cung cấp
- Ví dụ: 50 (50 cái đang đón từ nhà cung cấp)
- Ghi chú: Có thể để trống

**Reorder Level (Mức tái lập)**
- Kiểu: Số
- Ý nghĩa: Khi tồn kho giảm xuống mức này, cần đặt hàng lại
- Ví dụ: 50 (khi dưới 50 cái, cần đặt hàng)
- Ghi chú: Có thể để trống

**Reorder Status (Trạng thái tái lập)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Tình trạng tồn kho
- Các giá trị:
  - **Normal (Bình thường)**: Tồn kho ổn định
  - **Low Stock (Hàng ít)**: Tồn kho dưới mức bình thường nhưng có thể bán
  - **Critical (Khẩn cấp)**: Tồn kho rất thấp, cần đặt hàng gấp
  - **Out of Stock (Hết hàng)**: Không còn hàng
- Ghi chú: Tính tự động dựa trên Reorder Level

**Last Counted (Lần kiểm kê cuối)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày kiểm kê lần cuối
- Ví dụ: 01/05/2024
- Ghi chú: Có thể để trống

---

### 2. Phiếu Giao Hàng (Delivery Order)

**Mục đích**: Ghi nhận các sản phẩm sẽ giao cho khách hàng từ kho.

**Các trường nhập vào chi tiết:**

**Reference (Số phiếu giao)**
- Định dạng: DO001, DO-2024-001, v.v.
- Ý nghĩa: Mã định danh cho phiếu giao
- Ví dụ: "DO-2024-0001"
- Yêu cầu: Bắt buộc

**Customer / Supplier (Khách hàng / Nhà cung cấp)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Chọn đối tượng sẽ nhận hàng
- Ví dụ: "Công ty ABC" (khách hàng)
- Ghi chú: Có thể để trống

**Warehouse (Kho)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Kho nào lấy hàng để giao
- Ví dụ: "Kho chính TP.HCM"
- Yêu cầu: Bắt buộc

**Scheduled Date (Ngày giao dự kiến)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày dự kiến giao hàng
- Ví dụ: 20/04/2024
- Ghi chú: Có thể để trống

**Status (Trạng thái)**
- Kiểu: Lựa chọn từ danh sách
- Các giá trị:
  - **Draft (Nháp)**: Phiếu mới tạo
  - **Ready (Sẵn sàng)**: Hàng đã chuẩn bị, sẵn sàng giao
  - **Done (Hoàn tất)**: Đã giao xong
- Yêu cầu: Bắt buộc

**Notes (Ghi chú)**
- Ý nghĩa: Thông tin giao hàng đặc biệt
- Ví dụ: "Giao sáng, không giao chiều. Liên hệ trước 30 phút."
- Ghi chú: Có thể để trống

---

### 3. Phiếu Nhập Kho (Goods Receipt)

**Mục đục**: Ghi nhận nhận hàng từ nhà cung cấp vào kho.

**Các trường nhập vào chi tiết:**

**Reference (Số phiếu nhập)**
- Định dạng: GR001, GR-2024-001, v.v.
- Ý nghĩa: Mã định danh cho phiếu nhập kho
- Ví dụ: "GR-2024-0001"
- Yêu cầu: Bắt buộc

**Supplier (Nhà cung cấp)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Nhà cung cấp gửi hàng
- Ví dụ: "Công ty XYZ"
- Ghi chú: Có thể để trống

**Warehouse (Kho)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Kho nào sẽ nhận hàng
- Ví dụ: "Kho chính TP.HCM"
- Yêu cầu: Bắt buộc

**Scheduled Date (Ngày nhận dự kiến)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày dự kiến nhận hàng
- Ví dụ: 19/03/2024
- Ghi chú: Có thể để trống

**Status (Trạng thái)**
- Kiểu: Lựa chọn từ danh sách
- Các giá trị:
  - **Draft (Nháp)**: Phiếu mới tạo
  - **Ready (Sẵn sàng)**: Hàng sẵn sàng nhập kho
  - **Done (Hoàn tất)**: Đã nhập kho xong
- Yêu cầu: Bắt buộc

**Notes (Ghi chú)**
- Ý nghĩa: Thông tin nhập hàng (hàng hỏng, thiếu, v.v.)
- Ví dụ: "Thiếu 5 cái do đổ khi vận chuyển. Nhà cung cấp đã đồng ý thay."
- Ghi chú: Có thể để trống

---

### 4. Kiểm Kê Kho (Stock Count)

**Mục đích**: Ghi nhận kết quả kiểm kê kho hàng thực tế so với sổ sách để tìm ra chênh lệch.

**Các trường nhập vào chi tiết:**

**Count # (Số kiểm kê)**
- Định dạng: COUNT001, COUNT-2024-001, v.v.
- Ý nghĩa: Mã định danh cho kiểm kê
- Ví dụ: "COUNT-2024-0001"
- Yêu cầu: Bắt buộc

**Warehouse (Kho)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Kho nào được kiểm kê
- Ví dụ: "Kho chính TP.HCM"
- Yêu cầu: Bắt buộc

**Bin Location (Vị trí kho)**
- Kiểu: Lựa chọn từ danh sách
- Ý nghĩa: Vị trí trong kho
- Ví dụ: "A-01-01"
- Yêu cầu: Bắt buộc

**Count Date (Ngày kiểm kê)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày thực hiện kiểm kê
- Ví dụ: 01/05/2024
- Ghi chú: Có thể để trống

**Last Adjusted (Lần điều chỉnh cuối)**
- Kiểu: Ngày tháng năm
- Ý nghĩa: Ngày điều chỉnh kho lần cuối
- Ví dụ: 25/04/2024
- Ghi chú: Để tham khảo, có thể để trống

**Status (Trạng thái)**
- Kiểu: Lựa chọn từ danh sách
- Các giá trị:
  - **Draft (Nháp)**: Kiểm kê mới, chưa hoàn tất
  - **Posted (Đăng ký)**: Kiểm kê hoàn tất, kết quả đã lưu
- Yêu cầu: Bắt buộc

**Notes (Ghi chú)**
- Ý nghĩa: Ghi nhận chênh lệch, vật phẩm bị hỏng, v.v.
- Ví dụ: "Thực tế có 148 cái, sổ sách 150 cái, thiếu 2 cái (coi như hỏng). Đã được kho xác nhận."
- Ghi chú: Có thể để trống

---

## 📝 QUI TẮC CHUNG KHI NHẬP LIỆU

### Các Trường Bắt Buộc (Required Fields)
Các trường này **PHẢI** nhập dữ liệu, không được bỏ trống:
- Mã định danh (Customer, Supplier, Warehouse, v.v.)
- Ngày tháng (Invoice Date, Order Date, v.v.) - thường là ngày hôm nay
- Tổng cộng (Total Amount)
- Trạng thái (Status)

### Các Trường Tính Tự Động
Những trường này hệ thống tính toán tự động, **KHÔNG CẦN** nhập:
- Available = On Hand - Reserved
- Outstanding Amount = Total Amount - Paid Amount
- Reorder Status (dựa trên Reorder Level)

### Quy Tắc Về Ngày Tháng
- Nhập đúng định dạng ngày/tháng/năm (DD/MM/YYYY hoặc MM/DD/YYYY tùy cài đặt)
- Ngày trong tương lai có thể nhập được
- Nên nhập ngày hôm nay cho các ngày tạo/lập phiếu

### Quy Tắc Về Số Tiền
- Nhập là số dương (không nhập dấu âm)
- Không cần nhập ký hiệu tiền tệ (VNĐ, $), chỉ nhập số
- Có thể nhập dấu phân cách (ví dụ: 1,000,000 hoặc 1000000 cùng được)

### Quy Tắc Về Chọn Từ Danh Sách (Dropdown)
- Nhất định phải chọn từ danh sách có sẵn
- Không được tự tạo mới từ màn hình form
- Nếu không thấy lựa chọn cần thiết, phải đến Master Data tạo trước

### Quy Tắc Về Trạng Thái (Status)
- Khi tạo mới: Luôn bắt đầu từ trạng thái **Draft (Nháp)**
- Sau khi hoàn tất: Chuyển sang trạng thái tiếp theo (Confirmed, Sent, v.v.)
- Không được bỏ qua bước nào - phải đi tuần tự
- Ví dụ: Draft → Confirmed → Shipped → Delivered (không được nhảy từ Draft sang Delivered)

---

## 💡 MẸO NHẬP LIỆU HIỆU QUẢ

1. **Kiểm tra Master Data trước**: Trước khi nhập liệu trong phân hệ chính, hãy chắc chắn đã tạo Master Data (Khách hàng, Nhà cung cấp, Sản phẩm, v.v.)

2. **Nhập theo quy trình**: 
   - Sales: Lead → Quotation → Sales Order → Invoice
   - Purchase: RFQ → Purchase Order → Goods Receipt → Vendor Bill
   - Inventory: Stock → Delivery/Receipt → Stock Count

3. **Sử dụng tính năng Link**: Liên kết giữa các document (ví dụ: Sales Order liên kết đến Quotation) để theo dõi dễ hơn

4. **Cập nhật Paid Amount**: Khi khách hàng hoặc nhà cung cấp thanh toán, cập nhật Paid Amount để theo dõi công nợ

5. **Ghi chú đầy đủ**: Càng ghi chú chi tiết, càng dễ quản lý sau này

6. **Kiểm tra Subtotal, Tax, Total**: Trước khi lưu, kiểm tra lại tính toán để tránh sai sót

---

## ⚠️ NHỮNG ĐIỀU CẦN TRÁNH

- ❌ Không nhập từ lệnh nước ngoài không có trong Master Data
- ❌ Không thay đổi mã định danh sau khi lưu
- ❌ Không nhập số âm cho số lượng hoặc tiền
- ❌ Không bỏ trống các trường bắt buộc
- ❌ Không nhập dữ liệu với định dạng sai (ví dụ: nhập chữ vào trường số)
- ❌ Không tạo các document trùng lặp

---

**Tài liệu này được cập nhật lần cuối: 11/05/2026**

Nếu có câu hỏi hoặc cần thêm chi tiết, vui lòng liên hệ bộ phận hỗ trợ ERP.
