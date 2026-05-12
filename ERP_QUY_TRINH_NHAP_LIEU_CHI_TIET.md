# Hướng Dẫn Nhập Liệu Và Quy Trình Nghiệp Vụ ERP NovaTech

> Tài liệu này mô tả cách vận hành hệ thống ERP phân phối thiết bị SmartHome của NovaTech theo luồng nghiệp vụ end-to-end: CRM -> Báo giá -> Đơn bán -> Hóa đơn/Thanh toán -> Xuất kho/Giao hàng -> Tồn kho. Mục tiêu là nhập dữ liệu đúng điểm phát sinh, để hệ thống tự sinh các chứng từ sau đó.

---

## 1. Nguyên Tắc Vận Hành Chung

### 1.1. Dữ liệu chỉ nhập một lần tại nguồn

Người dùng không nhập lại cùng một thông tin ở nhiều phân hệ. Ví dụ:

- Thông tin khách hàng tiềm năng nhập tại CRM Lead.
- Danh sách sản phẩm tư vấn nhập tại Lead hoặc Quotation.
- Khi khách chấp nhận báo giá, hệ thống tự tạo Customer, Sales Order, Invoice và Delivery Order theo điều kiện nghiệp vụ.

### 1.2. Chứng từ sau được sinh từ chứng từ trước

Luồng chuẩn:

```text
Lead
  -> Quotation
  -> Sales Order
  -> Customer Invoice
  -> Payment hoặc Credit Terms
  -> Delivery Order
  -> Stock Deduction
```

Không nên tạo thủ công Sales Order, Invoice hoặc Delivery Order nếu chúng đã có nguồn từ báo giá. Tạo thủ công chỉ dùng cho trường hợp ngoại lệ hoặc dữ liệu lịch sử.

### 1.3. Các trường tự động không nhập tay

Các trường sau được hệ thống tính hoặc cập nhật:

- `subtotal`, `tax_amount`, `total_amount`
- `estimated_profit`, `profit_margin_percent`
- `quantity_available`
- `quantity_reserved`
- `credit_used`
- trạng thái chứng từ phát sinh từ nút chuyển bước
- customer được tạo từ lead khi cần
- delivery order phát sinh từ sales order đủ điều kiện

---

## 2. Chuẩn Bị Master Data

Trước khi chạy luồng nghiệp vụ, cần có dữ liệu nền.

### 2.1. Products

Nhập tại Master Data -> Products.

Thông tin cần có:

- SKU
- Tên sản phẩm
- Danh mục sản phẩm
- Đơn vị tính
- Giá bán (`list_price`)
- Giá vốn (`cost_price`)
- Reorder level và reorder quantity
- Cờ IoT/serial nếu sản phẩm cần quản lý thiết bị

Lưu ý:

- Giá vốn không được lớn hơn giá bán.
- Với thiết bị SmartHome có bảo hành, nên bật yêu cầu serial/MAC để phục vụ vòng đời thiết bị.

### 2.2. Warehouses và Bin Locations

Nhập tại Master Data -> Warehouses và Bin Locations.

Tối thiểu nên có:

- Kho Hà Nội
- Kho TP. Hồ Chí Minh
- Kho bảo hành

Mỗi kho cần có bin/location để hỗ trợ nhập kho, xuất kho và kiểm kê.

### 2.3. Customers

Khách hàng có thể được tạo thủ công tại Master Data -> Customers hoặc tự sinh khi lead/báo giá được chấp nhận.

Các trường quan trọng:

- Customer type: `B2B` hoặc `B2C`
- Payment terms: `NET30`, `NET45`, `NET60`, `COD`, `Prepaid`
- Credit limit cho khách B2B
- Địa chỉ giao hàng và thanh toán

### 2.4. Suppliers

Nhập tại Master Data -> Suppliers.

Các trường quan trọng:

- Loại nhà cung cấp
- Lead time trung bình
- Payment terms
- Preferred supplier
- Quality rating

---

## 3. Quy Trình CRM

### 3.1. Tạo Lead Do Sales Đề Xuất

Vào CRM -> Tạo Lead mới.

Nhập:

- Tên công ty/khách hàng
- Người liên hệ
- Email và số điện thoại
- Địa chỉ
- Nguồn lead khác `Yêu cầu tự động`
- Sales owner
- Giá trị ước tính
- Nhu cầu/sản phẩm quan tâm nếu đã biết
- Ghi chú nghiệp vụ

Ý nghĩa:

- Lead này thuộc trách nhiệm chăm sóc của sales owner.
- Khi tạo báo giá từ lead này, sales hiện tại/người tạo chứng từ sẽ là người tạo báo giá.

### 3.2. Tạo Lead Tự Yêu Cầu

Vào CRM -> Tạo Lead mới.

Chọn nguồn:

- `Yêu cầu tự động`

Quy tắc:

- Không cần chọn sales owner.
- Hệ thống xem đây là lead do khách tự gửi yêu cầu.
- Có thể tự tạo báo giá mẫu cố định dựa trên sản phẩm mặc định/hệ thống.

Nên nhập:

- Tên khách hàng/công ty
- Email
- Số điện thoại
- Địa chỉ
- Nhu cầu mô tả trong ghi chú

### 3.3. Chăm Sóc Lead

Trong CRM, dùng Activity để ghi nhận:

- Cuộc gọi
- Email
- Meeting
- Site survey
- Follow-up
- Ghi chú nội bộ

Nguyên tắc:

- Mọi tương tác quan trọng phải được ghi vào Activity.
- Không lưu thông tin chăm sóc rải rác ở ghi chú cá nhân ngoài hệ thống.

### 3.4. Chuyển Giai Đoạn Lead

Luồng giai đoạn:

```text
New -> Site Survey -> Proposition -> Won/Lost
```

Ý nghĩa:

- `New`: mới tiếp nhận.
- `Site Survey`: đang khảo sát/đánh giá nhu cầu.
- `Proposition`: đã có giải pháp hoặc báo giá.
- `Won`: khách đồng ý mua.
- `Lost`: không tiếp tục.

Khi lead chuyển sang `Won`, hệ thống có thể đảm bảo Customer được tạo/link từ lead nếu chưa có.

---

## 4. Quy Trình Báo Giá

### 4.1. Tạo Báo Giá Từ CRM Lead

Trong CRM, chọn Lead -> Tạo Báo giá.

Nhập:

- Danh sách sản phẩm
- Số lượng
- Đơn giá
- Chiết khấu nếu có
- Thuế suất
- Ngày hiệu lực
- Ghi chú

Không nhập:

- Tổng tiền
- Lợi nhuận
- Thuế tiền mặt

Các trường này được hệ thống tính từ dòng sản phẩm.

### 4.2. Tạo Báo Giá Trong Sales

Vào Sales -> Quotations -> Tạo mới.

Dùng khi:

- Báo giá không xuất phát từ lead.
- Báo giá cho customer đã có sẵn.
- Cần nhập dữ liệu lịch sử.

Quy tắc:

- Báo giá phải có ít nhất một dòng sản phẩm.
- Báo giá phải gắn với Lead hoặc Customer.
- Nếu gắn với Lead chưa có Customer, khi báo giá được chấp nhận hệ thống sẽ tự tạo Customer từ Lead.

### 4.3. Chuyển Trạng Thái Báo Giá

Trạng thái chuẩn:

```text
Draft -> Sent -> Accepted/Rejected/Expired
```

Khi bấm Advance từ `Draft`:

- Hệ thống chuyển báo giá sang `Sent`.

Khi bấm Accept từ `Sent`:

- Hệ thống chuyển báo giá sang `Accepted`.
- Hệ thống tự chạy workflow tạo chứng từ bán hàng.

---

## 5. Khi Khách Chấp Nhận Báo Giá

Khi Quotation chuyển sang `Accepted`, hệ thống thực hiện các bước sau.

### 5.1. Đảm Bảo Customer

Nếu báo giá đã có Customer:

- Dùng Customer đó.

Nếu báo giá chỉ có Lead:

- Hệ thống tạo Customer từ thông tin Lead.
- Hệ thống link Customer ngược lại Lead và Quotation.

Thông tin lấy từ Lead:

- Tên công ty
- Loại khách hàng
- Người liên hệ
- Email
- Số điện thoại
- Địa chỉ thanh toán/giao hàng
- Mã số thuế

### 5.2. Kiểm Tra Công Nợ B2B

Với khách hàng B2B:

- Hệ thống kiểm tra `credit_used` và `credit_limit`.
- Nếu công nợ đã vượt ngưỡng rủi ro, hệ thống chặn tạo đơn mới và yêu cầu thu tiền/xem xét trước.

### 5.3. Kiểm Tra Tồn Kho

Hệ thống kiểm tra tồn kho khả dụng:

```text
available = quantity_on_hand - quantity_reserved
```

Nếu đủ hàng:

- Hệ thống chọn kho phù hợp.
- Tiếp tục tạo Sales Order.

Nếu thiếu hàng:

- Hệ thống chặn xác nhận.
- Bộ phận mua hàng/kho phải bổ sung hàng trước.

### 5.4. Tự Tạo Sales Order

Sales Order được tạo từ Quotation.

Hệ thống copy:

- Customer
- Lead nếu có
- Sản phẩm
- Số lượng
- Đơn giá
- Chiết khấu
- Thuế
- Sales person/người tạo

Trạng thái mặc định:

- `Confirmed`

### 5.5. Tự Tạo Invoice

Sau khi Sales Order được tạo, hệ thống tự tạo Customer Invoice.

Invoice lấy:

- Customer
- Sales Order
- Tổng tiền
- Thuế
- Payment terms
- Ngày hóa đơn
- Ngày đến hạn

Nếu payment terms là:

- `COD`
- `Prepaid`

thì invoice cần được thanh toán trước khi mở yêu cầu giao hàng.

Nếu payment terms là:

- `NET30`
- `NET45`
- `NET60`

thì hệ thống có thể mở giao hàng ngay và theo dõi công nợ sau.

---

## 6. Quy Trình Thanh Toán Và Công Nợ

### 6.1. Invoice

Vào Accounting -> Customer Invoices.

Trạng thái:

```text
Draft/Pending -> Paid
```

Nguyên tắc:

- Invoice tự sinh từ Sales Order không nên nhập lại thủ công.
- Chỉ chỉnh sửa khi có sai lệch nghiệp vụ rõ ràng.

### 6.2. Customer Payment

Khi khách thanh toán:

- Ghi nhận payment vào hệ thống.
- Payment cần gắn với invoice.

Hệ thống tự:

- Cộng `paid_amount`.
- Chuyển invoice sang `partial_paid` nếu trả một phần.
- Chuyển invoice sang `paid` nếu trả đủ.
- Nếu invoice `COD/Prepaid` đã paid, hệ thống tự mở Delivery Order.

### 6.3. Khách Trả Sau

Với `NET30`, `NET45`, `NET60`:

- Không cần chờ payment mới giao hàng.
- Invoice vẫn nằm trong công nợ phải thu.
- `credit_used` của customer được cập nhật theo invoice chưa thanh toán.

---

## 7. Quy Trình Xuất Kho Và Giao Hàng

### 7.1. Delivery Order Tự Sinh

Delivery Order được hệ thống tạo khi:

- Sales Order đã confirmed.
- Hàng đủ tồn kho.
- Điều khoản thanh toán cho phép giao, hoặc invoice đã paid.

Delivery Order có:

- Sales Order liên quan
- Customer
- Kho được chọn
- Ngày giao dự kiến
- Dòng sản phẩm cần giao

### 7.2. Reserve Stock

Khi Delivery Order được tạo, hệ thống giữ hàng:

```text
quantity_reserved tăng theo số lượng cần giao
quantity_available giảm tương ứng
```

Điều này ngăn cùng một tồn kho bị bán cho nhiều đơn.

### 7.3. Chuyển Trạng Thái Delivery

Trong Inventory -> Delivery Orders.

Luồng:

```text
Draft -> Ready -> Done
```

Khi chuyển sang `Done`:

- Hệ thống cập nhật trạng thái giao hàng.
- Hệ thống trừ tồn kho.
- Hệ thống giảm reserved stock.

### 7.4. Nguyên Tắc Kho

Không chỉnh tay số lượng tồn kho để phản ánh bán hàng.

Tồn kho chỉ nên thay đổi qua:

- Goods Receipt
- Delivery Order
- Stock Transfer
- Inventory Adjustment

---

## 8. Quy Trình Mua Hàng

### 8.1. Khi Nào Tạo RFQ

Tạo RFQ khi:

- Tồn kho thiếu.
- Sản phẩm dưới reorder level.
- Cần mua cho dự án.
- Cần so sánh giá nhiều nhà cung cấp.

RFQ nên gửi tối thiểu ba nhà cung cấp nếu có thể.

### 8.2. Tạo Purchase Order

Purchase Order được tạo sau khi chọn nhà cung cấp.

Nhập:

- Supplier
- RFQ liên quan nếu có
- Ngày đặt hàng
- Ngày cần giao
- Dòng sản phẩm
- Giá mua
- Thuế
- Ghi chú

### 8.3. Goods Receipt

Khi hàng về:

- Tạo Goods Receipt từ Purchase Order.
- Kiểm số lượng.
- Kiểm chất lượng.
- Với thiết bị IoT, quét serial/MAC nếu cần.
- Khi hoàn tất nhập kho, tồn kho tăng.

---

## 9. Quy Trình Kiểm Kê Và Điều Chỉnh Kho

### 9.1. Khi Nào Kiểm Kê

Thực hiện khi:

- Kiểm kê định kỳ.
- Nghi ngờ lệch tồn.
- Có hàng hỏng/thất thoát.
- Sau đợt nhập/xuất lớn.

### 9.2. Inventory Adjustment

Nhập:

- Kho
- Ngày kiểm kê
- Lý do
- Dòng sản phẩm và số lượng chênh lệch

Khi post/approve:

- Hệ thống cập nhật tồn kho theo chênh lệch.
- Ghi nhận ngày kiểm kê gần nhất.

---

## 10. Quy Trình IoT Lifecycle Và Bảo Hành

### 10.1. Đăng Ký Thiết Bị

Với thiết bị SmartHome:

- Ghi serial number.
- Ghi MAC address/IMEI nếu có.
- Gắn sản phẩm.
- Gắn customer sau khi bán.
- Ghi ngày bắt đầu/kết thúc bảo hành.

### 10.2. Cảnh Báo Bảo Hành

Hệ thống có thể quét thiết bị sắp hết hạn bảo hành.

Kết quả dùng cho:

- Chăm sóc khách hàng.
- Gia hạn bảo hành.
- Tạo cơ hội bán thêm.

---

## 11. Ma Trận Trách Nhiệm Theo Phòng Ban

| Phòng ban | Việc nhập chính | Không nên nhập tay |
|---|---|---|
| Sales | Lead, Activity, Quotation | Sales Order/Invoice nếu đã sinh từ Quotation |
| Sales Manager | Duyệt/chấp nhận báo giá, theo dõi pipeline | Tồn kho, công nợ |
| Warehouse | Goods Receipt, Delivery Order status, Adjustment | Giá bán, báo giá, invoice |
| Purchasing | RFQ, Purchase Order | Tồn kho bán ra, invoice khách hàng |
| Accounting | Invoice ngoại lệ, Payment, Credit/Debit Notes | Delivery line, stock quantity |
| Admin/Master Data | Product, Customer, Supplier, Warehouse | Chứng từ giao dịch hằng ngày |

---

## 12. Các Tình Huống Thường Gặp

### 12.1. Khách tự gửi yêu cầu qua website

1. Tạo Lead với nguồn `Yêu cầu tự động`.
2. Hệ thống/nhân viên tạo báo giá mẫu.
3. Gửi báo giá cho khách.
4. Nếu khách chấp nhận, chuyển báo giá sang `Accepted`.
5. Hệ thống tự tạo Customer, Sales Order, Invoice.
6. Nếu trả trước/COD, chờ thanh toán rồi giao.
7. Nếu trả sau, tạo Delivery Order ngay.

### 12.2. Sales tự đề xuất lead cho dự án

1. Sales tạo Lead và chọn owner.
2. Ghi activity chăm sóc.
3. Khảo sát và tư vấn.
4. Tạo báo giá từ Lead.
5. Gửi báo giá.
6. Khách accept.
7. Hệ thống tự tạo chứng từ bán hàng và kho.

### 12.3. Khách B2B vượt hạn mức công nợ

1. Khi accept báo giá hoặc tạo Sales Order, hệ thống kiểm tra công nợ.
2. Nếu vượt ngưỡng, hệ thống chặn tạo đơn.
3. Kế toán cần thu tiền hoặc quản lý tăng hạn mức.
4. Sau khi công nợ hợp lệ, tiếp tục xác nhận đơn.

### 12.4. Không đủ hàng

1. Hệ thống chặn xác nhận bán hàng.
2. Purchasing tạo RFQ.
3. Tạo Purchase Order.
4. Warehouse nhập hàng bằng Goods Receipt.
5. Sau khi tồn kho đủ, quay lại accept/confirm đơn.

---

## 13. Checklist Nhập Liệu Đúng Chuẩn

Trước khi tạo Lead:

- Có thông tin liên hệ tối thiểu.
- Có nguồn lead.
- Có sales owner nếu không phải yêu cầu tự động.

Trước khi tạo Quotation:

- Có sản phẩm.
- Có số lượng.
- Có giá bán.
- Có Lead hoặc Customer.

Trước khi accept Quotation:

- Lead/Customer có email hoặc tên rõ ràng.
- Sản phẩm tồn tại trong Master Data.
- Tồn kho đủ.
- Customer B2B không vượt công nợ.

Trước khi giao hàng:

- Invoice đã paid nếu `COD/Prepaid`.
- Delivery Order có warehouse.
- Delivery lines có sản phẩm và số lượng.

Trước khi trừ kho:

- Delivery đã sẵn sàng.
- Kho có quantity reserved hoặc on hand đủ.
- Chỉ chuyển `Done` khi hàng thực sự đã giao/xuất.

---

## 14. Quy Tắc Vàng Của Hệ Thống

1. Không nhập lại dữ liệu đã có từ chứng từ trước.
2. Không chỉnh tay số tồn để thay thế delivery/goods receipt.
3. Không tạo customer trùng nếu lead đã link customer.
4. Không tạo sales order thủ công nếu báo giá đã được chấp nhận.
5. Không giao hàng prepaid/COD nếu invoice chưa paid.
6. Không bỏ qua kiểm tra công nợ với khách B2B.
7. Không để báo giá không có dòng sản phẩm.
8. Không dùng ghi chú thay cho trường dữ liệu có cấu trúc.

---

## 15. Luồng Chuẩn Tóm Tắt

```text
CRM
  Tạo Lead
  Ghi Activity
  Tạo Quotation

Sales
  Draft Quotation
  Sent Quotation
  Accepted Quotation
  -> Auto Customer
  -> Auto Sales Order
  -> Auto Invoice

Accounting
  Nếu Prepaid/COD: ghi Payment trước
  Nếu NET terms: theo dõi công nợ

Inventory
  Auto Delivery Order
  Reserve stock
  Done Delivery
  Deduct stock

Analytics/Management
  Theo dõi doanh thu, công nợ, tồn kho, hiệu quả bán hàng
```

Tài liệu này nên được dùng làm chuẩn vận hành khi demo, nhập dữ liệu mẫu, hoặc phân công vai trò cho từng phòng ban trong đồ án.
