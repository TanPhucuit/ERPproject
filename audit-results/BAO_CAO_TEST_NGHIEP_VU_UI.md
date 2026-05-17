# Báo Cáo Test Quy Trình Nghiệp Vụ UI

Ngày test: 2026-05-17  
Môi trường: https://er-pproject-three.vercel.app/app/  
Tài khoản test: `admin@erp.local`  
Công cụ: Playwright headless Chromium

## Tóm Tắt

Đã tự động đăng nhập và kiểm tra các module chính:

- CRM
- Sales
- Purchase
- Inventory
- Accounting
- Master Data

Kết quả chính:

- Không phát hiện trang trắng hoặc React runtime crash trong lượt test này.
- Không có network failure trong lượt audit chính.
- Có 5 lỗi High ảnh hưởng trực tiếp tới logic nghiệp vụ.
- Có 1 lỗi Medium liên quan trạng thái chuyển kho.
- Payment form và một số Master Data form đã tốt hơn: không còn lộ các field tính tự động lớn như `credit_used`, `total_spent`, `current_occupancy` trong form tạo mới.

## Lỗi Ưu Tiên Cao

### 1. CRM vẫn còn trạng thái `quoted`

Mức độ: High  
Khu vực: CRM Lead

Bằng chứng UI:

```text
All Statuses
new
quoted
won
lost
```

Lỗi nghiệp vụ:

Theo quy trình đã chốt, Lead chỉ có 3 stage:

```text
new
won
lost
```

`quoted` là trạng thái cũ, làm sai pipeline vì quotation không được biến lead thành trạng thái trung gian. Lead chỉ chuyển:

- `new -> won` khi accept quotation đầu tiên
- `new -> lost` khi reject quotation đầu tiên

Tác động:

- Báo cáo pipeline sai.
- Có nguy cơ logic accept/reject quotation không nhất quán.
- Người dùng có thể hiểu nhầm rằng lead được phép ở trạng thái thứ tư.

Khuyến nghị:

- Xóa `quoted` khỏi filter/status UI.
- Dọn dữ liệu `lead_stages` chỉ còn `new`, `won`, `lost`.
- Nếu DB còn lead `quoted`, migrate về `new` hoặc trạng thái phù hợp.

### 2. RFQ form chưa có chọn supplier

Mức độ: High  
Khu vực: Purchase RFQ

Bằng chứng UI modal:

```text
Create new RFQ
RFQ #
Issued Date
Closing Date
PRODUCTS (0)
No products added. Use search above to add products to RFQ.
Total Estimated Cost:
Notes
Cancel
Create RFQ
```

Lỗi nghiệp vụ:

RFQ đúng phải có:

- product lines
- danh sách supplier nhận RFQ
- supplier quotation/price/lead time/MOQ nếu có
- supplier được chọn

Form hiện tại có product section nhưng không có supplier selection. Như vậy RFQ không thể thực hiện đúng vai trò "Request for Quotation" vì không biết gửi cho supplier nào và không tạo được `rfq_supplier_quotations`.

Tác động:

- Không so sánh được báo giá nhà cung cấp.
- Không tạo được PO từ supplier được chọn một cách đúng nghiệp vụ.
- Dữ liệu RFQ thiếu quan hệ supplier.

Khuyến nghị:

- Thêm section chọn nhiều supplier trong RFQ form.
- Khi lưu RFQ, tạo `rfq_lines`.
- Với mỗi supplier được chọn, tạo dòng `rfq_supplier_quotations`.
- Cho phép nhập giá supplier, lead time, MOQ và chọn supplier thắng.

### 3. Stock Transfer form thiếu Source Warehouse

Mức độ: High  
Khu vực: Inventory Transfer

Bằng chứng UI modal:

```text
Create Stock Transfer
Transfer Type
Transfer between bins
Ship to customer
Source Bin
New stock
N-03 - North Warehouse
A-01 - Main Warehouse
...
Destination Bin
A-01 - Main Warehouse
A-02 - Main Warehouse
...
```

Lỗi nghiệp vụ:

Yêu cầu nghiệp vụ là form transfer phải có dropdown:

- source warehouse
- source bin location
- destination warehouse
- destination bin location
- product
- quantity
- status

Hiện form chỉ chọn source bin, trong label có kèm warehouse, nhưng không có field source warehouse riêng.

Tác động:

- Không đủ rõ để cập nhật `stock_level` theo warehouse.
- Khó lọc bin theo warehouse.
- Dễ chọn nhầm bin giữa các kho.

Khuyến nghị:

- Thêm dropdown `Source Warehouse`.
- Khi chọn source warehouse, chỉ hiển thị bin thuộc warehouse đó.
- Product list nên lọc theo tồn trong source warehouse/bin.

### 4. Stock Transfer form thiếu Destination Warehouse

Mức độ: High  
Khu vực: Inventory Transfer

Lỗi nghiệp vụ:

Tương tự source warehouse, destination warehouse phải là field riêng. Hiện form chỉ cho chọn destination bin từ danh sách toàn bộ bin.

Tác động:

- Không rõ hàng được chuyển tới kho nào.
- Không kiểm soát được bin đích theo warehouse.
- Có thể cập nhật sai warehouse stock level.

Khuyến nghị:

- Thêm dropdown `Destination Warehouse`.
- Khi chọn destination warehouse, chỉ hiển thị bin đích của warehouse đó.

### 5. Stock Transfer form thiếu Status

Mức độ: High  
Khu vực: Inventory Transfer

Bằng chứng:

Modal transfer không có field status.

Lỗi nghiệp vụ:

Theo quy trình hiện tại, transfer cần status:

```text
draft -> success
```

Ý nghĩa:

- `draft`: hàng đang vận chuyển, tính vào `quantity_in_transit`.
- `success`: chuyển hoàn tất, trừ source bin và cộng destination bin.

Tác động:

- Không phân biệt phiếu đang vận chuyển với phiếu đã hoàn tất.
- Không có điểm nghiệp vụ để cập nhật `quantity_in_transit`.
- Có nguy cơ vừa tạo phiếu đã cập nhật tồn thực tế sai thời điểm.

Khuyến nghị:

- Thêm status field: `draft`, `success`.
- Khi status là `draft`, cập nhật `quantity_in_transit`, chưa cộng khả dụng vào bin đích.
- Khi chuyển sang `success`, trừ source bin, cộng destination bin, giảm in-transit.

## Lỗi Mức Trung Bình

### 6. Stock Transfer form không có trạng thái `success`

Mức độ: Medium  
Khu vực: Inventory Transfer

Lỗi nghiệp vụ:

Do form không có status, người dùng cũng không có lựa chọn `success`.

Tác động:

- Quy trình `draft -> success` không thể thao tác rõ ràng từ UI.
- Tester/người dùng không xác nhận được thời điểm hoàn tất transfer.

Khuyến nghị:

- Bổ sung dropdown status hoặc action button `Mark Success`.

## Các Điểm Đã Pass

### Auth

Đăng nhập tự động thành công với:

```text
admin@erp.local
```

### Sales Quotation Form

Form quotation đã có validation tốt hơn:

```text
Source lead is required
At least one product is required
```

Không thấy option "No lead" trong modal hiện tại. Đây là đúng với quy trình quotation phải gắn với lead.

### Quotation List

Ở dữ liệu hiện tại, quotation đang hiển thị status:

```text
accepted
```

Không thấy `draft/sent` trong danh sách quotation ở lượt test này.

### RFQ Product Validation

RFQ form chặn lưu rỗng:

```text
RFQ must have at least one product line.
```

Điểm còn thiếu là supplier selection.

### Accounting Payment Form

Payment form có các trường nghiệp vụ chính:

```text
Payment For
Document
Payment Date
Payment Method
Amount
Source Account
Target Account
```

Đây là đúng hướng để cập nhật thanh toán thay vì nhập tay paid amount trực tiếp trong invoice.

### Master Data Forms

Không thấy các field tính tự động sau trong form tạo mới:

- `Credit Used`
- `Total Spent`
- `Average Response`
- `Quality Rating`
- `Current Occupancy`

Đây là điểm tốt so với các file phân tích cũ.

## Nhận Xét Theo Quy Trình End-To-End

### Lead -> Quotation -> Won/Lost

Luồng chưa hoàn toàn sạch vì CRM vẫn còn `quoted`. Cần dọn triệt để để đảm bảo lead chỉ có `new`, `won`, `lost`.

### RFQ -> Supplier Quote -> PO

Luồng chưa đạt vì RFQ thiếu supplier selection. Đây là lỗi lớn nhất ở Purchase vì RFQ mất ý nghĩa so sánh nhà cung cấp.

### Stock Transfer -> In Transit -> Success

Luồng chưa đạt vì form thiếu warehouse dropdown và status. Đây là lỗi lớn nhất ở Inventory vì ảnh hưởng trực tiếp tới `stock_in_bin`, `stock_level`, `quantity_in_transit`.

### Payment -> Invoice Paid Amount -> Credit Used

UI Payment đã có form riêng. Cần test sâu thêm ở lớp dữ liệu để xác nhận post payment có cập nhật invoice và công nợ đúng hay không.

## File Bằng Chứng

Các file audit đã sinh:

- `audit-results/ui-business-audit-20260517031736.json`
- `audit-results/ui-page-snapshot.json`
- `audit-results/ui-deep-business-audit.json`
- `audit-results/ui-forms-extra-audit.json`

## Ưu Tiên Sửa

1. Xóa trạng thái `quoted` khỏi CRM lead.
2. Dọn DB lead stages chỉ còn `new`, `won`, `lost`.
3. Thêm supplier selection vào RFQ form và lưu `rfq_supplier_quotations`.
4. Sửa Stock Transfer form theo đúng field: source warehouse/bin, destination warehouse/bin, product, quantity, status.
5. Bổ sung xử lý `draft -> success` cho transfer và cập nhật `quantity_in_transit`.
6. Test lại payment post ở database để chắc invoice/customer credit cập nhật đúng.
