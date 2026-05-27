# Quy Trình Nghiệp Vụ Chuẩn - NovaTech ERP

## 1. Nguyên Tắc Chung

Các chứng từ phải đi theo dòng dữ liệu:


Lead -> Quotation -> Customer -> Sales Order -> Invoice -> Delivery -> Stock

RFQ -> Purchase Order -> Goods Receipt -> Stock In Bin -> Stock Level

Stock Transfer -> Stock In Bin -> Stock Level


## 2. CRM Lead

Lead chỉ có 3 stage:


new -> won
new -> lost
```

Ý nghĩa:

- `new`: lead mới tạo, chưa chốt mua hoặc từ chối.
- `won`: lead đã chấp nhận quotation đầu tiên và trở thành customer.
- `lost`: lead đã từ chối quotation đầu tiên.

Quy tắc:

- Khi tạo lead mới, stage mặc định luôn là `new`.
- Không sử dụng các stage cũ như `site_survey`, `proposition`, `qualified`, `contacted`.
- Lead chỉ chuyển `won` khi accept quotation đầu tiên.
- Lead chỉ chuyển `lost` khi reject quotation đầu tiên.
- Khi lead đã `won`, hệ thống phải tạo hoặc link customer tương ứng.
- Lead đã `won` không được tạo quotation mới nữa, vì lúc này đối tượng đã là customer.

3. Quotation

Quotation là báo giá dành cho lead còn ở stage `new`.

Điều kiện tạo quotation:

- Phải chọn lead hợp lệ.
- Lead không được ở stage `won`.
- Phải có ít nhất một dòng sản phẩm.
- Mỗi dòng sản phẩm phải có product, quantity, unit price.
- Tổng tiền, thuế, lợi nhuận không nhập tay mà tính từ dòng sản phẩm.

Luồng xử lý:


Create Quotation
  -> Customer accepts
     -> Quotation accepted
     -> Lead becomes won
     -> Customer is created/linked
     -> Sales Order can be generated

Create Quotation
  -> Customer rejects
     -> Quotation rejected
     -> Lead becomes lost
```


## 4. Customer

 tự sinh từ lead khi quotation được accept.

Khi tạo customer từ lead, hệ thống lấy:
- company name
- contact person
- phone
- email
- address
- tax id nếu có
- customer type nếu có

Quy tắc:

- Khi lead đã thành customer, giao dịch tiếp theo đi theo customer/sales order, không quay lại tạo quotation cho lead.


5. Sales Order

Sales Order là chứng từ xác nhận bán hàng sau khi quotation được accept hoặc tạo trực tiếp cho customer trong trường hợp ngoại lệ.

Điều kiện:

- Phải có customer.
- Phải có sản phẩm.
- Phải kiểm tra tồn kho khả dụng.

Khi Sales Order được xác nhận:

- Hệ thống ghi nhận sản phẩm đã nằm trong đơn hàng.
- Số lượng đó được tính vào `quantity_reserved`.
- `quantity_available` giảm tương ứng.

Công thức:

quantity_reserved = tổng số lượng sản phẩm trong sales order chưa giao xong
quantity_available = quantity_on_hand - quantity_reserved


 6. Invoice 

Invoice được tạo từ Sales Order hoặc nhập thủ công trong trường hợp ngoại lệ.

Quy tắc:

- Invoice lấy customer, amount, tax, payment terms từ Sales Order.
- Payment phải cập nhật `paid_amount`.
- Công nợ customer tính từ invoice chưa thanh toán.

Với payment terms:

- Trả trước/COD: cần thanh toán trước khi giao hàng.
- Công nợ B2B: cho phép giao theo hạn mức, nhưng phải kiểm tra `credit_limit`.

 7. Delivery Và Xuất Kho

Delivery dùng để giao hàng cho customer.

Khi giao hàng thành công:

- Trừ số lượng thực tế khỏi `stock_in_bin`.
- Giảm `quantity_reserved`.
- Cập nhật lại `stock_level`.
- Cập nhật lại occupancy của bin và warehouse.


 8. Purchase RFQ

RFQ dùng để tạo báo giá từ nhà cung cấp khi cần mua hàng.

Điều kiện tạo RFQ:

- Phải có ít nhất một sản phẩm cần mua.
- Mỗi dòng có product, quantity required, required delivery date nếu có.
- Có danh sách supplier nhận yêu cầu báo giá.

 RFQ gồm:

- thông tin RFQ
- danh sách sản phẩm cần mua
- danh sách supplier báo giá
- giá, lead time, MOQ nếu supplier phản hồi
- supplier được chọn

Sau khi chọn supplier phù hợp, hệ thống tạo Purchase Order.

 9. Purchase Order

Purchase Order là đơn mua gửi cho supplier. Tự động sinh khi doanh nghiệp accept báo giá RFQ 

Điều kiện:

- Có supplier.
- Có sản phẩm.
- Có số lượng và giá mua.
- Có ngày đặt hàng và ngày cần nhận nếu có.


## 10. Goods Receipt Và Nhập Kho

Goods Receipt ghi nhận hàng nhập từ supplier vào kho. Tự sinh khi có purchase order tự chuyển trạng thái thành delivering khi thanh toán vendor bill

Khi nhập kho, bắt buộc xác định:

- warehouse
- bin location
- product
- quantity received
- serial/MAC nếu là thiết bị IoT cần quản lý định danh

Khi Goods Receipt hoàn tất:

- Tạo hoặc cập nhật `stock_in_bin`.
- Tự động tạo hoặc cập nhật `stock_level` tương ứng.
- Cập nhật `quantity_on_hand`.
- Cập nhật occupancy của bin và warehouse.



## 11. Stock In Bin

`stock_in_bin` là nguồn sự thật của tồn kho theo vị trí.

Mỗi bản ghi thể hiện:

- product nào
- nằm ở warehouse nào
- nằm ở bin nào
- số lượng bao nhiêu

Khi một `stock_in_bin` được sinh ra, hệ thống phải tự sinh hoặc cập nhật `stock_level` tương ứng.

Công thức:


stock_level.quantity_on_hand =
  SUM(stock_in_bin.quantity theo product + warehouse + bin)

stock_level.quantity_reserved =
  SUM(sales order quantity chưa giao xong)

stock_level.quantity_in_transit =
  SUM(stock transfer quantity đang chưa hoàn tất)

stock_level.quantity_available =
  quantity_on_hand - quantity_reserved

 12. Stock Transfer

Stock Transfer dùng để chuyển hàng giữa warehouse/bin.

Form transfer cần có:

- source warehouse
- source bin location
- destination warehouse
- destination bin location
- product
- quantity

Stock Transfer không có status và không cần bước xác nhận.
Ngay khi người dùng tạo transfer thành công:

- Trừ quantity khỏi source bin.
- Cộng quantity vào destination bin.
- Cập nhật `stock_level` của source và destination.
- Cập nhật occupancy của các bin liên quan.

Quy tắc:

- Không cho tạo transfer nếu source bin không đủ `available`.
- Không cho chọn cùng một bin làm source và destination.
- Không tính transfer nội bộ vào `quantity_in_transit`, vì không còn trạng thái đang vận chuyển.
- `quantity_in_transit` chỉ dùng cho hàng thật sự đang vận chuyển theo chứng từ giao/nhận chưa hoàn tất, không dùng cho stock transfer nội bộ đã post ngay.

13. Inventory Adjustment

Inventory Adjustment dùng khi kiểm kê phát hiện chênh lệch.

Điều kiện:

- Có warehouse.
- Có bin location.
- Có product.
- Có số lượng hệ thống và số lượng kiểm kê thực tế.
- Có lý do điều chỉnh.

Khi adjustment được post:

- Cập nhật `stock_in_bin`.
- Cập nhật `stock_level`.
- Ghi nhận ngày kiểm kê cuối.

Quy tắc:

- Adjustment chỉ dùng cho chênh lệch thực tế, không dùng thay cho nhập/xuất/chuyển kho.

14. Bảo Hành

Với sản phẩm SmartHome/IoT cần quản lý serial hoặc MAC:

- Khi nhập kho, quét serial/MAC.
- Khi bán/giao hàng, serial/MAC được gắn với customer.
- Bảo hành bắt đầu từ ngày bán hoặc ngày giao tùy quy định.
- mỗi sản phẩm có thời hạn bảo hành và phí bảo hành riêng
Tạo đơn bảo hành  : 
			nếu còn trong hạn bảo hành -> không tính phí cho sản phẩm đó
			nếu hết hạn bảo hành -> tính phí bảo hành cho sản phẩm đó
đơn bảo hành : gồm đơn hàng, chọn các sản phẩm cần bảo hành trong đơn đó với số lượng
-> tự sinh ra delivery order, invoice như quy trình nghiệp vụ sale_order

## 15. Vai Trò Phòng Ban

Sales:

- tạo lead
- chăm sóc lead
- tạo quotation
- accept/reject theo phản hồi khách

Warehouse:

- goods receipt
- delivery
- stock transfer
- inventory adjustment

Purchasing:

- tạo RFQ
- chọn supplier
- tạo Purchase Order

Accounting:

- quản lý invoice
- ghi nhận payment
- theo dõi công nợ

Admin/Master Data:

- product
- warehouse
- bin location
- supplier
- customer ngoại lệ
- user và cấu hình hệ thống

## 16. Quy Tắc Không Được Vi Phạm

- Không tạo quotation cho lead đã `won`.
- Không accept quotation không có sản phẩm.
- Không dùng lại các stage lead cũ ngoài `new`, `won`, `lost`.
- Không nhập tay `stock_level` nếu đã có nghiệp vụ sinh ra `stock_in_bin`.
- Không sửa tồn kho trực tiếp để thay cho nhập kho, xuất kho hoặc chuyển kho.
- Không nhập tay các trường tổng hợp có thể tính được.
- Không tạo customer trùng từ cùng một lead.
- Không cho bán nếu tồn khả dụng không đủ.
- Không bỏ qua kiểm tra công nợ với customer B2B.

## 17. Luồng Demo Chuẩn

Luồng bán hàng:


Create Lead (new)
-> Create Quotation with products
-> Accept Quotation
-> Lead becomes won
-> Customer is created/linked
-> Sales Order
-> Invoice
-> Delivery
-> Stock is deducted



Luồng mua hàng:


RFQ with product lines and suppliers
-> Select supplier
-> Purchase Order
-> Goods Receipt
-> Stock In Bin
-> Stock Level auto-updated


Luồng chuyển kho:


Create Stock Transfer
-> source bin decreases immediately
-> destination bin increases immediately
-> stock levels are updated immediately


Luồng kiểm kê:


Count actual stock
-> Create Inventory Adjustment
-> Post adjustment
-> Stock In Bin updated
-> Stock Level updated

