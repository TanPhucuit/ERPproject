# Hướng Dẫn Nhập Liệu Nhanh - NovaTech ERP

Tài liệu này dùng để nhập liệu nhanh trên web NovaTech ERP. Mục tiêu là thao tác đúng luồng nghiệp vụ, không nhập tay các số liệu hệ thống tự tính.

## 1. Quy Tắc Chung

- Dữ liệu bắt buộc thường có dấu `*` hoặc là dropdown cần chọn.
- Mã chứng từ như `QT`, `SO`, `INV`, `PO`, `VB` thường để trống để hệ thống tự sinh.
- Không nhập tay tồn kho tổng hợp nếu có thể phát sinh từ nghiệp vụ.
- Không sửa trực tiếp `Stock Levels` và `Stock in Bins` để thay thế nhập/xuất/chuyển kho.
- Các số tiền tổng như subtotal, tax, total, profit nên để hệ thống tính từ dòng sản phẩm khi form có hỗ trợ dòng hàng.
- Sau khi tạo/sửa chứng từ, kiểm tra lại danh sách và dashboard để chắc số liệu đã cập nhật.

Luồng chính nên nhập theo thứ tự:

```text
Master Data -> CRM/Sales/Purchase -> Inventory -> Accounting
```

## 2. Dashboard

Dashboard chủ yếu để xem nhanh số liệu, không phải nơi nhập chứng từ.

Cách dùng:

- Vào `Dashboard`.
- Kiểm tra Net Revenue, Active Orders, Total Customers, Available Stock.
- Dùng các nút quick action nếu có: New Order, New Customer.
- Nếu số liệu chưa mới, bấm `Refresh Data`.

## 3. Master Data

Vào `Master Data`, chọn tab cần nhập, bấm nút `New ...`, điền form rồi `Save`.

### Categories

Dùng để phân loại sản phẩm.

Trường cần nhập:

- `Category Name`: tên nhóm sản phẩm.
- `Parent Category`: chọn nếu là nhóm con.

Ví dụ: Control Hubs, Cameras & Vision, Power & Energy.

### Products

Dùng để tạo danh mục sản phẩm bán/mua/kho.

Trường cần nhập:

- `SKU`: mã sản phẩm, không trùng.
- `Product Name`: tên sản phẩm.
- `Category`: nhóm sản phẩm.
- `Unit of Measure`: thường là `pcs`.
- `List Price`: giá bán.
- `Cost Price`: giá vốn.
- `Warranty Period (days)`: số ngày bảo hành.
- `Repair Fee`: phí sửa khi hết hạn bảo hành.
- `Status`: Active/Inactive.
- `Description`: mô tả nếu cần.

### Customers

Dùng để tạo khách hàng trực tiếp, ngoài luồng lead.

Trường cần nhập:

- `Customer Name`.
- `Customer Type`: Individual hoặc Company.
- `Company Name`, `Tax ID` nếu là công ty.
- `Email`, `Phone`, `Address`.
- `Status`.

Lưu ý: customer cũng có thể tự sinh khi accept quotation của lead.

### Suppliers

Dùng để tạo nhà cung cấp.

Trường cần nhập:

- `Supplier Name`.
- `Contact Name`, `Contact Email`, `Contact Phone`.
- `Address`.
- `Tax ID`.
- `Status`.

### Supplier Products

Dùng để khai báo nhà cung cấp bán sản phẩm nào và giá mua bao nhiêu.

Trường cần nhập:

- `Supplier`.
- `Product`.
- `Supplier SKU`.
- `Supplier Price`.

Lưu ý: RFQ/PO cần dữ liệu Supplier Product để chọn sản phẩm mua.

### Users

Dùng để tạo tài khoản nhân sự.

Trường cần nhập:

- `Username`.
- `Full Name`.
- `Email`.
- `Role`: Admin, Sales, Purchasing, Warehouse, Accountant, Manager.
- `Status`.
- `Password`: nhập đơn giản cho demo nếu cần.

### Warehouses

Dùng để tạo kho.

Trường cần nhập:

- `Warehouse Name`.
- `Address`.
- `Status`.

### Bin Locations

Dùng để tạo vị trí trong kho.

Trường cần nhập:

- `Warehouse`.
- `Bin Code`: ví dụ `W1-B01`.
- `Bin Name`.
- `Status`.

Lưu ý: muốn chuyển/đặt hàng vào vị trí kho thì phải có bin location.

## 4. CRM

CRM có 2 tab chính: `Leads` và `Activities`.

### Leads

Vào `CRM -> Leads -> New Lead`.

Trường cần nhập:

- `Source`: Website, Referral, Phone, Email, Event, Auto Request, Other.
- `Customer / Company Name`.
- `Contact Name`.
- `Email`.
- `Phone`.
- `Tax ID`.
- `Address`.
- `Probability (%)`.
- `Sales Owner`.
- `Notes`.

Stage lead chỉ có:

```text
new, won, lost
```

Quy tắc:

- Lead mới tạo là `new`.
- Lead chuyển `won` khi quotation đầu tiên được accept.
- Lead chuyển `lost` khi quotation đầu tiên bị reject.
- Lead đã `won` được xem là customer, không tạo quotation mới cho lead đó nữa.

### Tạo Quotation Từ Lead

Trong danh sách lead:

1. Chọn lead đang `new`.
2. Bấm `Tạo báo giá`.
3. Thêm ít nhất 1 sản phẩm.
4. Nhập quantity, unit price, discount nếu có.
5. Kiểm tra tổng tiền.
6. Bấm `Create Quotation`.

Lưu ý: quotation không có sản phẩm sẽ không hợp lệ.

### Activities

Dùng để ghi nhận lịch sử chăm sóc lead.

Cách nhập:

1. Ở lead, bấm `Record Activity`.
2. Chọn loại hoạt động: Call, Email, Meeting, Demo, Follow-up.
3. Nhập mô tả.
4. Chọn người thực hiện nếu cần.
5. Bấm `Save Activity`.

## 5. Sales

Sales có các tab:

- `Sales Orders`
- `Quotations`
- `Warranty Sales Orders`
- `Sales Returns`

### Quotations

Dùng để quản lý báo giá bán.

Cách tạo:

1. Vào `Sales -> Quotations`.
2. Bấm `New Quotation`.
3. Chọn Lead hoặc Customer theo form.
4. Thêm sản phẩm.
5. Nhập quantity, unit price, discount.
6. Kiểm tra subtotal, tax, total, estimated profit.
7. Bấm `Create`.

Nút xử lý:

- `Accept`: khách đồng ý báo giá, có thể sinh sales order/customer theo nghiệp vụ.
- `Reject`: khách từ chối báo giá, lead liên quan chuyển lost nếu là quotation đầu tiên.

### Sales Orders

Dùng để tạo/xem đơn bán.

Cách tạo:

1. Vào `Sales -> Sales Orders`.
2. Bấm `New Sales Order`.
3. Chọn `Customer`.
4. Thêm sản phẩm.
5. Nhập quantity và unit price.
6. Kiểm tra profit nếu có.
7. Bấm `Create`.

Lưu ý:

- Đơn bán sẽ giữ hàng/reserve hàng theo tồn khả dụng.
- Delivery order thường được tạo để phục vụ giao hàng.

### Warranty Sales Orders

Dùng cho bảo hành/sửa chữa sau bán.

Cách tạo:

1. Vào `Sales -> Warranty Sales Orders`.
2. Bấm `New Warranty Sales Order`.
3. Chọn sales order đã giao.
4. Chọn sản phẩm cần bảo hành.
5. Nhập số lượng và ghi chú.
6. Bấm `Create Warranty Order`.

Tình huống:

- Nếu còn trong thời hạn bảo hành: warranty status là `in_warranty`, phí sửa bằng 0.
- Nếu hết hạn bảo hành: warranty status là `expired`, hệ thống tính repair fee theo sản phẩm.

### Sales Returns

Dùng khi khách trả hàng.

Cách tạo:

1. Vào `Sales -> Sales Returns`.
2. Bấm `New Sales Return`.
3. Chọn sales order đã delivered.
4. Chọn sản phẩm trả.
5. Nhập số lượng trả.
6. Nhập lý do trả hàng.
7. Bấm `Create Return`.

Sau khi tạo:

- Hệ thống tạo sales return.
- Hệ thống tạo refund request.
- Nếu nhận hàng trả về, vào Inventory/Goods Receipts để nhận lại hàng vào kho nếu workflow yêu cầu.

## 6. Purchase

Purchase có 2 tab:

- `Purchase Orders`
- `RFQs`

### RFQs

Dùng để hỏi giá nhà cung cấp.

Cách tạo:

1. Vào `Purchase -> RFQs`.
2. Bấm `New RFQ`.
3. Tìm sản phẩm cần mua.
4. Chọn supplier product phù hợp.
5. Nhập `Qty Required`.
6. Nhập `Delivery Date` nếu cần.
7. Thêm notes nếu có.
8. Bấm `Create`.

Nút xử lý:

- `Accept`: chọn RFQ và tạo/cho phép tạo purchase order.
- `Deny`: từ chối RFQ.

Lưu ý: muốn sản phẩm xuất hiện trong RFQ, cần khai báo `Supplier Products` trước.

### Purchase Orders

Dùng để đặt hàng nhà cung cấp.

Cách tạo trực tiếp nếu được phép:

1. Vào `Purchase -> Purchase Orders`.
2. Bấm `New Purchase Order`.
3. Chọn RFQ hoặc supplier theo form.
4. Thêm sản phẩm mua.
5. Nhập quantity và unit price.
6. Nhập expected arrival date nếu cần.
7. Bấm `Create`.

Lưu ý:

- PO có thể sinh từ RFQ accepted.
- Hàng về sẽ xử lý ở `Inventory -> Goods Receipts`.
- Vendor bill xử lý ở `Accounting -> Vendor Bills`.

## 7. Inventory

Inventory có các tab:

- `Stock Levels`
- `Stock in Bins`
- `Delivery Orders`
- `Goods Receipts`
- `Stock Transfers`

### Stock Levels

Dùng để xem tổng tồn theo warehouse/product.

Không nhập tay các trường:

- `On Hand`
- `Total Quantity`
- `Available`
- `New Quantity`
- `Reorder Status`

Nếu cần tăng/giảm tồn, dùng Goods Receipt, Delivery hoặc Stock Transfer.

### Stock in Bins

Dùng để xem sản phẩm đang nằm ở bin nào.

Không sửa trực tiếp để thay thế nghiệp vụ.

Nên kiểm tra:

- Product.
- Warehouse.
- Bin Location.
- Quantity.
- Available.

### Delivery Orders

Dùng để giao hàng cho khách.

Cách xử lý:

1. Vào `Inventory -> Delivery Orders`.
2. Chọn delivery order cần giao.
3. Nếu cần chọn bin chi tiết, dùng `Stock Transfers -> Ship to customer`.
4. Khi đủ điều kiện, bấm `Delivered`.

Lưu ý:

- Giao hàng thành công sẽ cập nhật trạng thái delivery/sales order.
- Không tự sửa tồn kho để mô phỏng giao hàng.

### Goods Receipts

Dùng để nhận hàng từ purchase order hoặc nhận hàng trả từ customer.

Cách tạo/nhận hàng mua:

1. Vào `Inventory -> Goods Receipts`.
2. Bấm `New Goods Receipt`.
3. Chọn `Purchase Order`.
4. Chọn receipt date.
5. Nhập notes nếu cần.
6. Bấm `Save`.
7. Khi hàng về, bấm `Receive`.

Sau khi receive:

- Hàng mới được cộng vào `newQuantity`.
- Muốn đưa vào bin cụ thể, dùng `Stock Transfers` với source là `New stock`.

### Stock Transfers

Dùng để chuyển hàng giữa bin/kho hoặc đưa hàng mới nhận vào bin.

Cách chuyển giữa bin:

1. Vào `Inventory -> Stock Transfers`.
2. Bấm `New Stock Transfer`.
3. Chọn `Transfer Type = Transfer between bins`.
4. Chọn `Source Warehouse`.
5. Chọn `Source Bin`.
6. Chọn `Product`.
7. Nhập `Quantity`.
8. Chọn `Destination Warehouse`.
9. Chọn `Destination Bin`.
10. Bấm `Save Transfer`.

Cách đưa hàng mới nhận vào bin:

1. Chọn source warehouse có `newQuantity`.
2. Ở `Source Bin`, chọn `New stock (from received goods)` hoặc `Unbinned received stock`.
3. Chọn product.
4. Nhập quantity.
5. Chọn destination warehouse/bin.
6. Bấm `Save Transfer`.

Cách xuất hàng cho delivery:

1. Chọn `Transfer Type = Ship to customer`.
2. Chọn delivery order.
3. Với từng sản phẩm, chọn warehouse và bin có đủ available.
4. Bấm `Save Transfer`.

Lưu ý quan trọng:

- Stock transfer không cần status và không cần xác nhận sau.
- Ngay khi tạo transfer, hệ thống cộng/trừ hàng thẳng vào bin tương ứng.
- Không nhập quantity lớn hơn available ở source bin.

## 8. Accounting

Accounting có các tab:

- `Customer Invoices`
- `Vendor Bills`
- `Credit Notes`
- `Debit Notes`
- `Refund Requests`
- `Payments`
- `Accounts`

### Customer Invoices

Dùng để ghi nhận hóa đơn bán hàng.

Cách tạo:

1. Vào `Accounting -> Customer Invoices`.
2. Bấm `New Customer Invoice`.
3. Chọn `Sales Order`.
4. Nhập `Invoice Date`.
5. Nhập `Due Date` nếu có.
6. Nhập `Net Amount`, `Tax Amount`, `Total`.
7. Chọn status: Sent, Partial Paid, Paid, Overdue, Cancelled.
8. Bấm `Save`.

Nút thường dùng:

- `Pay`: tạo payment cho invoice.
- `Cancel`: hủy invoice nếu chưa ảnh hưởng nghiệp vụ đã đóng.
- Export/PDF nếu có nút tải.

### Vendor Bills

Dùng để ghi nhận hóa đơn nhà cung cấp.

Cách tạo:

1. Vào `Accounting -> Vendor Bills`.
2. Bấm `New Vendor Bill`.
3. Chọn `Purchase Order`.
4. Nhập `Bill Date`.
5. Nhập `Due Date`.
6. Nhập `Subtotal`, `Tax Amount`, `Total`.
7. Chọn status: Posted, Partial Paid, Paid, Overdue, Cancelled.
8. Bấm `Save`.

Nút thường dùng:

- `Pay`: thanh toán cho vendor bill.
- `Cancel`: hủy bill nếu hợp lệ.

### Credit Notes

Dùng để giảm trừ công nợ khách hàng theo invoice.

Cách tạo:

1. Vào `Accounting -> Credit Notes`.
2. Bấm `New Credit Note`.
3. Chọn `Reference Invoice`.
4. Nhập `Reason`.
5. Nhập `Amount`.
6. Bấm `Save`.

### Debit Notes

Dùng để ghi giảm/điều chỉnh công nợ nhà cung cấp theo vendor bill.

Cách tạo:

1. Vào `Accounting -> Debit Notes`.
2. Bấm `New Debit Note`.
3. Chọn `Reference Bill`.
4. Nhập `Reason`.
5. Nhập `Amount`.
6. Bấm `Save`.

### Refund Requests

Dùng để theo dõi yêu cầu hoàn tiền từ sales return.

Cách tạo:

- Không tạo thủ công từ tab này.
- Refund request được tạo tự động khi tạo `Sales Return`.

Cách xử lý:

1. Vào `Accounting -> Refund Requests`.
2. Chọn refund request cần trả.
3. Bấm `Refund`.
4. Nhập payment date, amount, source account, target account.
5. Bấm `Create Payment`.

### Payments

Dùng để ghi nhận thu tiền khách hàng, trả tiền nhà cung cấp, hoặc hoàn tiền.

Cách tạo trực tiếp:

1. Vào `Accounting -> Payments`.
2. Bấm `New Payment`.
3. Chọn `Payment For`: Customer Invoice hoặc Vendor Bill.
4. Chọn `Document`.
5. Nhập `Payment Date`.
6. Chọn `Payment Method`.
7. Nhập `Amount`.
8. Chọn `Source Account` và `Target Account` nếu không phải cash.
9. Nhập notes nếu cần.
10. Bấm `Save` hoặc `Create Payment`.

Quy tắc tài khoản:

- Thu tiền invoice: tiền vào tài khoản công ty.
- Trả vendor bill: tiền đi từ tài khoản công ty sang tài khoản supplier.
- Refund: tiền đi từ tài khoản công ty sang tài khoản customer.
- Cash payment không cần source/target account.

### Accounts

Dùng để quản lý tài khoản tiền mặt/ngân hàng.

Cách tạo:

1. Vào `Accounting -> Accounts`.
2. Bấm `New Account`.
3. Nhập `Account Number`.
4. Nhập `Bank`.
5. Nhập `Account Name`.
6. Nhập `Balance`.
7. Bấm `Save`.

Lưu ý:

- Hệ thống có thể tự tạo account mặc định cho customer, lead, supplier, user.
- Opening balance nên nhập trước khi bắt đầu giao dịch.
- Sau khi có payment, balance sẽ thay đổi theo hướng tiền.

## 9. Luồng Nhập Liệu Nhanh Theo Nghiệp Vụ

### Luồng bán hàng chuẩn

```text
Master Data: Product + Customer
-> Sales: New Sales Order
-> Accounting: Customer Invoice
-> Accounting: Payment
-> Inventory: Delivery Order / Ship to customer / Delivered
```

### Luồng lead đến bán hàng

```text
CRM: New Lead
-> CRM: Tạo báo giá
-> Sales: Accept Quotation
-> Lead thành Won, customer được tạo/link
-> Sales Order
-> Invoice
-> Delivery
```

### Luồng mua hàng chuẩn

```text
Master Data: Supplier + Supplier Product
-> Purchase: New RFQ
-> Accept RFQ
-> Purchase Order
-> Accounting: Vendor Bill
-> Accounting: Pay Vendor Bill
-> Inventory: Goods Receipt / Receive
-> Inventory: Stock Transfer từ New stock vào bin
```

### Luồng chuyển kho

```text
Inventory: Stock Transfers
-> chọn source warehouse/bin/product
-> chọn destination warehouse/bin
-> nhập quantity
-> Save Transfer
-> kiểm tra Stock in Bins và Stock Levels
```

### Luồng bảo hành

```text
Sales Order đã Delivered
-> Sales: Warranty Sales Orders
-> chọn sales order và sản phẩm
-> hệ thống xác định còn/hết hạn bảo hành
-> nếu hết hạn, có thể tạo invoice phí sửa chữa
```

### Luồng khách trả hàng

```text
Sales Order đã Delivered
-> Sales: Sales Returns
-> chọn sản phẩm trả và lý do
-> hệ thống tạo Refund Request
-> Inventory nhận hàng trả nếu cần
-> Accounting hoàn tiền qua Refund
```

## 10. Checklist Sau Khi Nhập

Sau mỗi nghiệp vụ lớn, kiểm tra nhanh:

- CRM: lead stage có đúng `new/won/lost` không.
- Sales: quotation/SO có đủ dòng sản phẩm không.
- Purchase: RFQ/PO có đúng supplier product không.
- Inventory: stock in bin không âm, available đúng sau transfer/delivery/receipt.
- Accounting: invoice/bill/payment có đúng status và balance tài khoản không.
- Dashboard: số liệu tổng quan có cập nhật không.

