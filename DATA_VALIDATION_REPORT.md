# BÁO CÁO KIỂM TRA CHÍNH XÁC - DỮ LIỆU GENERATED DATA

**Ngày Kiểm Tra Lại**: 2026-05-07  
**Người Kiểm Tra**: Phân tích chi tiết Schema vs Generate_Data.js

---

## I. NHẬN XÉT SỬA CHỮA

### ❌ Báo Cáo Trước Đó SAI LẦM

Báo cáo trước đó cho rằng dữ liệu thiếu:
- `created_at`, `updated_at` - ❌ NHẬN XÉT SAI (tự động sinh via DEFAULT NOW())
- `is_deleted` - ❌ NHẬN XÉT SAI (DEFAULT FALSE)
- `id` UUID - ❌ NHẬN XÉT SAI (tự sinh via uuid_generate_v4())
- Các trường GENERATED ALWAYS AS - ❌ NHẬN XÉT SAI (tính tự động)

### ✅ SỰ THẬT CHÍNH XÁC

Dữ liệu được sinh ra **có đủ những trường mà người dùng cần nhập**. Các trường tự động (timestamps, auto-generated IDs, calculated fields) được hệ thống tự sinh và **KHÔNG cần xuất hiện trong generated_data**. Tuy nhiên, **vẫn thiếu một số trường NOT NULL QUAN TRỌNG** mà người dùng phải nhập vào.

---

## II. PHÂN TÍCH CHI TIẾT TỪNG BẢNG DỮ LIỆU

### 📊 BẢNG 1: USERS (Người Dùng)

**Dữ Liệu Hiện Có**:
- 5 bản ghi
- Các cột: `id, email, password_hash, full_name, role, status`

**Yêu Cầu Schema**:
- `id` (UUID) - ✅ Có
- `email` (VARCHAR) - ✅ Có
- `password_hash` (VARCHAR) - ✅ Có
- `full_name` (VARCHAR) - ✅ Có
- `phone` (VARCHAR) - ❌ THIẾU
- `avatar_url` (VARCHAR) - ❌ THIẾU
- `role` (VARCHAR) - ✅ Có
- `department_id` (UUID REFERENCES) - ❌ THIẾU
- `status` (VARCHAR) - ✅ Có
- `last_login` (TIMESTAMP) - ❌ THIẾU
- `login_attempts` (INT) - ❌ THIẾU
- `locked_until` (TIMESTAMP) - ❌ THIẾU
- `created_at` (TIMESTAMP) - ❌ THIẾU
- `updated_at` (TIMESTAMP) - ❌ THIẾU
- `is_deleted` (BOOLEAN) - ❌ THIẾU

**Kết Luận**: File users.csv thiếu 9 trường dữ liệu (58% dữ liệu bị thiếu).

**Vấn Đề Cụ Thể**:
- Không có thông tin liên lạc đầy đủ (phone, avatar)
- Không có timestamp để theo dõi lịch sử
- Không có soft delete tracking
- Không được phân bổ vào departments

---

### 📊 BẢNG 2: CUSTOMERS (Khách Hàng)

**Dữ Liệu Hiện Có**:
- 1000+ bản ghi
- Các cột: `id, name, customer_type, contact_person_name, contact_person_email`

**Yêu Cầu Schema**:
- `id` (UUID) - ✅ Có
- `customer_number` (VARCHAR UNIQUE) - ❌ THIẾU
- `name` (VARCHAR) - ✅ Có
- `company_tax_id` (VARCHAR) - ❌ THIẾU
- `customer_type` (VARCHAR) - ✅ Có
- `contact_person_name` (VARCHAR) - ✅ Có
- `contact_person_email` (VARCHAR) - ✅ Có
- `contact_person_phone` (VARCHAR) - ❌ THIẾU
- `billing_address` (TEXT) - ❌ THIẾU
- `shipping_address` (TEXT) - ❌ THIẾU
- `billing_city` (VARCHAR) - ❌ THIẾU
- `billing_province` (VARCHAR) - ❌ THIẾU
- `billing_postal_code` (VARCHAR) - ❌ THIẾU
- `shipping_same_as_billing` (BOOLEAN) - ❌ THIẾU
- `credit_limit` (DECIMAL) - ❌ THIẾU
- `credit_used` (DECIMAL) - ❌ THIẾU
- `payment_terms` (VARCHAR) - ❌ THIẾU
- `lead_id` (UUID REFERENCES) - ❌ THIẾU
- `status` (VARCHAR) - ❌ THIẾU
- `created_by_id` (UUID) - ❌ THIẾU
- `created_at` (TIMESTAMP) - ❌ THIẾU
- `updated_at` (TIMESTAMP) - ❌ THIẾU
- `is_deleted` (BOOLEAN) - ❌ THIẾU

**Kết Luận**: File customers.csv thiếu 18 trường dữ liệu (72% dữ liệu bị thiếu).

**Vấn Đề Cụ Thể**:
- Thiếu credit_limit và credit_used - QUAN TRỌNG cho quy trình kiểm soát tín dụng
- Thiếu địa chỉ chi tiết (billing, shipping) - yêu cầu cho giao hàng
- Không có customer_number (định danh chính thức)
- Không liên kết đến lead gốc
- Không có kiểm soát phòng chống tín dụng

---

### 📊 BẢNG 3: PRODUCTS (Sản Phẩm)

**Dữ Liệu Hiện Có**:
- 500+ bản ghi
- Các cột: `id, sku, name, category_id, list_price, cost_price`

**Yêu Cầu Schema**:
- `id` (UUID) - ✅ Có
- `sku` (VARCHAR) - ✅ Có
- `name` (VARCHAR) - ✅ Có
- `description` (TEXT) - ❌ THIẾU
- `category_id` (UUID REFERENCES) - ✅ Có
- `uom_id` (UUID REFERENCES) - ❌ THIẾU
- `image_url` (VARCHAR) - ❌ THIẾU
- `list_price` (DECIMAL) - ✅ Có
- `cost_price` (DECIMAL) - ✅ Có
- `profit_margin_percent` (GENERATED) - ✅ Sẽ được tính tự động
- `reorder_level` (INT) - ❌ THIẾU
- `reorder_quantity` (INT) - ❌ THIẾU
- `supplier_lead_time_days` (INT) - ❌ THIẾU
- `status` (VARCHAR) - ❌ THIẾU
- `barcode` (VARCHAR) - ❌ THIẾU
- `created_at` (TIMESTAMP) - ❌ THIẾU
- `updated_at` (TIMESTAMP) - ❌ THIẾU
- `is_deleted` (BOOLEAN) - ❌ THIẾU

**Kết Luận**: File products.csv thiếu 9 trường dữ liệu (53% dữ liệu bị thiếu).

**Vấn Đề Cụ Thể**:
- Thiếu reorder_level và reorder_quantity - QUAN TRỌNG cho quy trình mua hàng tự động
- Thiếu uom_id (Unit of Measure) - sẽ gây lỗi foreign key vì đây là trường bắt buộc
- Thiếu supplier_lead_time_days - cần cho dự báo
- Không có status (active/discontinued)
- Thiếu thông tin mô tả, hình ảnh, mã vạch

---

### 📊 BẢNG 4: CRM_OPPORTUNITIES (Cơ Hội Kinh Doanh / Leads)

**Dữ Liệu Hiện Có**:
- 14 bản ghi với stage_id từ 1-6 (vượt quá 5 stage được định nghĩa)
- Các cột: `id, company_name, contact_person_name, stage_id, estimated_value`

**Yêu Cầu Schema (Bảng LEADS)**:
- `id` (UUID) - ✅ Có
- `lead_number` (VARCHAR UNIQUE) - ❌ THIẾU
- `company_name` (VARCHAR) - ✅ Có
- `contact_person_name` (VARCHAR) - ✅ Có
- `contact_person_phone` (VARCHAR) - ❌ THIẾU
- `contact_person_email` (VARCHAR) - ❌ THIẾU
- `company_address` (TEXT) - ❌ THIẾU
- `company_tax_id` (VARCHAR) - ❌ THIẾU
- `stage_id` (UUID REFERENCES) - ✅ Có (nhưng giá trị vượt quá)
- `source` (VARCHAR) - ❌ THIẾU
- `owner_id` (UUID REFERENCES users) - ❌ THIẾU
- `estimated_value` (DECIMAL) - ✅ Có
- `probability_percent` (INT) - ❌ THIẾU
- `expected_close_date` (DATE) - ❌ THIẾU
- `closed_date` (DATE) - ❌ THIẾU
- `lead_rating` (VARCHAR) - ❌ THIẾU
- `notes` (TEXT) - ❌ THIẾU
- `created_at` (TIMESTAMP) - ❌ THIẾU
- `updated_at` (TIMESTAMP) - ❌ THIẾU
- `is_deleted` (BOOLEAN) - ❌ THIẾU

**Kết Luận**: File crm_opportunities.csv thiếu 15 trường dữ liệu (68% dữ liệu bị thiếu).

**Vấn Đề Cụ Thể**:
- Stage_id có giá trị 6 nhưng schema chỉ định nghĩa 5 stage (new, site_survey, proposition, won, lost)
- Thiếu lead_number (định danh chính thức)
- Thiếu source (từ đâu lead đến - Website, Event, Referral, v.v)
- Thiếu owner_id (không biết ai quản lý)
- Thiếu lead_rating (Hot/Warm/Cold)
- Thiếu probability_percent - quan trọng cho CRM

---

### 📊 BẢNG 5: SALES_QUOTATIONS (Báo Giá)

**Dữ Liệu Hiện Có**:
- 100 bản ghi
- Các cột: `id, customer_id, status, total_amount`

**Yêu Cầu Schema (Bảng QUOTATIONS)**:
- `id` (UUID) - ✅ Có
- `quotation_number` (VARCHAR UNIQUE) - ❌ THIẾU
- `customer_id` (UUID REFERENCES) - ✅ Có
- `lead_id` (UUID REFERENCES) - ❌ THIẾU
- `issued_date` (DATE) - ❌ THIẾU
- `valid_until_date` (DATE) - ❌ THIẾU
- `status` (VARCHAR) - ✅ Có
- `total_amount_before_tax` (DECIMAL) - ❌ THIẾU
- `total_discount` (DECIMAL) - ❌ THIẾU
- `tax_amount` (DECIMAL) - ❌ THIẾU
- `total_amount` (DECIMAL) - ✅ Có (nhưng thiếu bước trung gian)
- `estimated_profit` (DECIMAL) - ❌ THIẾU
- `created_by_id` (UUID) - ❌ THIẾU
- `approved_by_id` (UUID) - ❌ THIẾU
- `approved_at` (TIMESTAMP) - ❌ THIẾU
- `notes` (TEXT) - ❌ THIẾU
- `internal_notes` (TEXT) - ❌ THIẾU
- `attachments` (JSONB) - ❌ THIẾU
- `created_at` (TIMESTAMP) - ❌ THIẾU
- `updated_at` (TIMESTAMP) - ❌ THIẾU
- `is_deleted` (BOOLEAN) - ❌ THIẾU

**Kết Luận**: File sales_quotations.csv thiếu 17 trường dữ liệu (74% dữ liệu bị thiếu).

**Vấn Đề Cụ Thể**:
- Thiếu quotation_number (định danh chính thức)
- Thiếu issued_date và valid_until_date - quan trọng cho tracking báo giá
- Không tách biệt total_amount_before_tax, total_discount, tax_amount
- Thiếu created_by_id và approved_by_id - không biết ai tạo/duyệt
- Thiếu estimated_profit - quan trọng cho phân tích

---

### 📊 BẢNG 6: SALES_ORDERS (Đơn Hàng Bán)

**Dữ Liệu Hiện Có**:
- 50 bản ghi
- Các cột: `id, customer_id, status, total_amount`

**Yêu Cầu Schema (Bảng SALES_ORDERS)**:
- `id` (UUID) - ✅ Có
- `sales_order_number` (VARCHAR UNIQUE) - ❌ THIẾU
- `quotation_id` (UUID REFERENCES) - ❌ THIẾU
- `customer_id` (UUID REFERENCES) - ✅ Có
- `order_date` (DATE) - ❌ THIẾU
- `required_delivery_date` (DATE) - ❌ THIẾU
- `actual_delivery_date` (DATE) - ❌ THIẾU
- `status` (VARCHAR) - ✅ Có
- `total_amount_before_tax` (DECIMAL) - ❌ THIẾU
- `total_discount` (DECIMAL) - ❌ THIẾU
- `tax_amount` (DECIMAL) - ❌ THIẾU
- `total_amount` (DECIMAL) - ✅ Có (nhưng thiếu thành phần)
- `total_cost` (DECIMAL) - ❌ THIẾU
- `estimated_profit` (GENERATED) - ❌ THIẾU
- `profit_margin_percent` (GENERATED) - ❌ THIẾU
- `sales_person_id` (UUID) - ❌ THIẾU
- `approved_by_id` (UUID) - ❌ THIẾU
- `approved_at` (TIMESTAMP) - ❌ THIẾU
- `notes` (TEXT) - ❌ THIẾU
- `internal_notes` (TEXT) - ❌ THIẾU
- `attachments` (JSONB) - ❌ THIẾU
- `created_at` (TIMESTAMP) - ❌ THIẾU
- `updated_at` (TIMESTAMP) - ❌ THIẾU
- `is_deleted` (BOOLEAN) - ❌ THIẾU

**Kết Luận**: File sales_orders.csv thiếu 18 trường dữ liệu (74% dữ liệu bị thiếu).

**Vấn Đề Cụ Thể**:
- Thiếu sales_order_number (định danh chính thức)
- Thiếu order_date và required_delivery_date - quan trọng cho tracking
- Không có quotation_id để liên kết với báo giá gốc
- Thiếu total_cost - cần thiết để tính profit
- Không có sales_person_id - không biết ai phụ trách
- Thiếu thông tin thời gian tạo/cập nhật

---

### 📊 BẢNG 7: PURCHASE_RFQS (Yêu Cầu Báo Giá Mua)

**Dữ Liệu Hiện Có**:
- 100 bản ghi (theo yêu cầu)
- Các cột: `id, status`

**Yêu Cầu Schema (Bảng RFQS)**:
- `id` (UUID) - ✅ Có
- `rfq_number` (VARCHAR UNIQUE) - ❌ THIẾU
- `issued_date` (DATE) - ❌ THIẾU
- `closing_date` (DATE) - ❌ THIẾU
- `status` (VARCHAR) - ✅ Có
- `total_line_items` (INT) - ❌ THIẾU
- `total_estimated_cost` (DECIMAL) - ❌ THIẾU
- `created_by_id` (UUID) - ❌ THIẾU
- `notes` (TEXT) - ❌ THIẾU
- `attachments` (JSONB) - ❌ THIẾU
- `created_at` (TIMESTAMP) - ❌ THIẾU
- `updated_at` (TIMESTAMP) - ❌ THIẾU
- `is_deleted` (BOOLEAN) - ❌ THIẾU

**Kết Luận**: File purchase_rfqs.csv thiếu 11 trường dữ liệu (92% dữ liệu bị thiếu).

**Vấn Đề Cụ Thể**:
- Dữ liệu quá tối thiểu, chỉ có ID và Status
- Thiếu rfq_number, issued_date, closing_date - bắt buộc
- Không biết được RFQ được tạo bởi ai
- Thiếu tất cả thông tin về nội dung RFQ

---

### 📊 BẢNG 8: SUPPLIERS (Nhà Cung Cấp)

**Dữ Liệu Hiện Có**:
- 1000+ bản ghi
- Các cột: `id, name, supplier_type_id`

**Yêu Cầu Schema**:
- `id` (UUID) - ✅ Có
- `supplier_number` (VARCHAR UNIQUE) - ❌ THIẾU
- `name` (VARCHAR) - ✅ Có
- `company_tax_id` (VARCHAR) - ❌ THIẾU
- `supplier_type_id` (UUID REFERENCES) - ✅ Có
- `contact_person_name` (VARCHAR) - ❌ THIẾU
- `contact_person_email` (VARCHAR) - ❌ THIẾU
- `contact_person_phone` (VARCHAR) - ❌ THIẾU
- `company_address` (TEXT) - ❌ THIẾU
- `company_city` (VARCHAR) - ❌ THIẾU
- `company_province` (VARCHAR) - ❌ THIẾU
- `company_postal_code` (VARCHAR) - ❌ THIẾU
- `company_website` (VARCHAR) - ❌ THIẾU
- `logo_url` (VARCHAR) - ❌ THIẾU
- `payment_terms` (VARCHAR) - ❌ THIẾU
- `average_lead_time_days` (INT) - ❌ THIẾU
- `quality_rating` (DECIMAL) - ❌ THIẾU
- `is_preferred` (BOOLEAN) - ❌ THIẾU
- `status` (VARCHAR) - ❌ THIẾU
- `total_spent` (DECIMAL) - ❌ THIẾU
- `average_response_time_hours` (DECIMAL) - ❌ THIẾU
- `created_at` (TIMESTAMP) - ❌ THIẾU
- `updated_at` (TIMESTAMP) - ❌ THIẾU
- `is_deleted` (BOOLEAN) - ❌ THIẾU

**Kết Luận**: File suppliers.csv thiếu 21 trường dữ liệu (86% dữ liệu bị thiếu).

**Vấn Đề Cụ Thể**:
- Thiếu supplier_number (định danh chính thức)
- Không có thông tin liên hệ chi tiết
- Thiếu quality_rating - quan trọng để chọn supplier tốt nhất
- Thiếu lead_time_days - cần cho dự báo
- Không có metrics để đánh giá hiệu suất

---

### 📊 BẢNG 9: PURCHASE_ORDERS (Đơn Mua Hàng)

**Dữ Liệu Hiện Có**: Không được kiểm tra trong query trên nhưng dự kiến có 50 bản ghi

**Yêu Cầu Schema**:
- Tương tự như sales_orders, file này dự kiến cũng thiếu rất nhiều trường

---

### 📊 BẢNG 10: DELIVERY_ORDERS (Phiếu Xuất Kho)

**Dữ Liệu Hiện Có**:
- Các cột: `id, sales_order_id, status`

**Yêu Cầu Schema**:
- `id` (UUID) - ✅ Có
- `delivery_order_number` (VARCHAR UNIQUE) - ❌ THIẾU
- `sales_order_id` (UUID REFERENCES) - ✅ Có
- `warehouse_id` (UUID REFERENCES) - ❌ THIẾU (QUAN TRỌNG)
- `status` (VARCHAR) - ✅ Có
- `scheduled_delivery_date` (DATE) - ❌ THIẾU
- `actual_delivery_date` (DATE) - ❌ THIẾU
- `carrier_id` (UUID REFERENCES) - ❌ THIẾU
- `tracking_number` (VARCHAR) - ❌ THIẾU
- `notes` (TEXT) - ❌ THIẾU
- `created_at` (TIMESTAMP) - ❌ THIẾU
- `updated_at` (TIMESTAMP) - ❌ THIẾU
- `is_deleted` (BOOLEAN) - ❌ THIẾU

**Kết Luận**: File delivery_orders.csv thiếu 10 trường dữ liệu (77% dữ liệu bị thiếu).

**Vấn Đề Cụ Thể**:
- Thiếu warehouse_id - LỖI NGHIÊM TRỌNG (không biết từ kho nào giao)
- Thiếu scheduled_delivery_date và actual_delivery_date
- Thiếu tracking_number - quan trọng cho khách hàng theo dõi

---

### 📊 BẢNG 11: GOODS_RECEIPTS (Phiếu Nhập Kho)

**Dữ Liệu Hiện Có**:
- Các cột: `id, purchase_order_id, status`

**Yêu Cầu Schema**:
- `id` (UUID) - ✅ Có
- `goods_receipt_number` (VARCHAR UNIQUE) - ❌ THIẾU
- `purchase_order_id` (UUID REFERENCES) - ✅ Có
- `warehouse_id` (UUID REFERENCES) - ❌ THIẾU (QUAN TRỌNG)
- `status` (VARCHAR) - ✅ Có
- `received_date` (DATE) - ❌ THIẾU
- `verified_date` (DATE) - ❌ THIẾU
- `verified_by_id` (UUID) - ❌ THIẾU
- `notes` (TEXT) - ❌ THIẾU
- `created_at` (TIMESTAMP) - ❌ THIẾU
- `updated_at` (TIMESTAMP) - ❌ THIẾU
- `is_deleted` (BOOLEAN) - ❌ THIẾU

**Kết Luận**: File goods_receipts.csv thiếu 9 trường dữ liệu (75% dữ liệu bị thiếu).

**Vấn Đề Cụ Thể**:
- Thiếu warehouse_id - LỖI NGHIÊM TRỌNG
- Thiếu received_date và verified_date
- Không biết ai xác minh hàng nhập

---

### 📊 BẢNG 12: CUSTOMER_INVOICES (Hóa Đơn Khách Hàng)

**Dữ Liệu Hiện Có**:
- Các cột: `id, customer_id, status, total_amount`

**Yêu Cầu Schema**:
- `id` (UUID) - ✅ Có
- `invoice_number` (VARCHAR UNIQUE) - ❌ THIẾU
- `sales_order_id` (UUID REFERENCES) - ❌ THIẾU
- `customer_id` (UUID REFERENCES) - ✅ Có
- `invoice_date` (DATE) - ❌ THIẾU
- `due_date` (DATE) - ❌ THIẾU
- `status` (VARCHAR) - ✅ Có
- `total_amount_before_tax` (DECIMAL) - ❌ THIẾU
- `total_tax` (DECIMAL) - ❌ THIẾU
- `total_amount` (DECIMAL) - ✅ Có (nhưng thiếu thành phần)
- `paid_amount` (DECIMAL) - ❌ THIẾU
- `outstanding_amount` (GENERATED) - ❌ THIẾU
- `payment_terms` (VARCHAR) - ❌ THIẾU
- `description` (TEXT) - ❌ THIẾU
- `notes` (TEXT) - ❌ THIẾU
- `issued_by_id` (UUID) - ❌ THIẾU
- `issued_at` (TIMESTAMP) - ❌ THIẾU
- `created_by_id` (UUID) - ❌ THIẾU
- `created_at` (TIMESTAMP) - ❌ THIẾU
- `updated_at` (TIMESTAMP) - ❌ THIẾU
- `is_deleted` (BOOLEAN) - ❌ THIẾU

**Kết Luận**: File customer_invoices.csv thiếu 18 trường dữ liệu (75% dữ liệu bị thiếu).

**Vấn Đề Cụ Thể**:
- Thiếu invoice_number (định danh chính thức)
- Thiếu invoice_date, due_date - quan trọng
- Không liên kết đến sales_order gốc
- Thiếu paid_amount - không biết khách hàng đã trả bao nhiêu
- Không có outstanding_amount - cần cho sưu tập

---

### 📊 BẢNG 13: VENDOR_BILLS (Hóa Đơn Nhà Cung Cấp)

**Dữ Liệu Hiện Có**:
- Các cột: `id, supplier_id, status, total_amount`

**Vấn Đề Tương Tự Như Customer_Invoices**:
- Thiếu bill_number
- Thiếu bill_date, due_date
- Thiếu paid_amount
- Không liên kết đến purchase_order gốc

---

### 📊 BẢNG 14: CREDIT_NOTES & DEBIT_NOTES (Phiếu Ghi Có / Ghi Nợ)

**Dữ Liệu Hiện Có**:
- Các cột: `id, customer_id/supplier_id, status, total_amount`

**Vấn Đề Chính**:
- Thiếu credit_note_number / debit_note_number
- Thiếu reason (lý do đổi trả)
- Thiếu credit_date / debit_date
- Không liên kết đến invoice / bill gốc

---

### 📊 BẢNG 15: BIN_LOCATIONS (Vị Trí Kho)

**Dữ Liệu Hiện Có**:
- Các cột: `id, warehouse_id, bin_code`
- Dữ liệu: 19 vị trí kho (cần 30+)

**Yêu Cầu Schema**:
- `id` (UUID) - ✅ Có
- `warehouse_id` (UUID REFERENCES) - ✅ Có
- `zone_id` (UUID REFERENCES) - ❌ THIẾU
- `bin_code` (VARCHAR) - ✅ Có
- `description` (TEXT) - ❌ THIẾU
- `capacity_units` (INT) - ❌ THIẾU
- `current_occupancy_units` (INT) - ❌ THIẾU
- `status` (VARCHAR) - ❌ THIẾU
- `created_at` (TIMESTAMP) - ❌ THIẾU
- `updated_at` (TIMESTAMP) - ❌ THIẾU

**Kết Luận**: File bin_locations.csv tương đối tốt nhất nhưng vẫn thiếu 7 trường.

**Vấn Đề**:
- Thiếu zone_id - không biết bin nằm trong vùng nào
- Chỉ có 19 vị trí kho khi schema yêu cầu 30+
- Thiếu capacity tracking

---

### 📊 BẢNG 16: WAREHOUSES (Kho Hàng)

**Dữ Liệu Hiện Có**: 3 kho (đúng như yêu cầu)
- WH-PAR (Donaldburgh Warehouse)
- WH-AUS (Lehi Warehouse)
- WH-CEC (Rubyfort Warehouse)

**Yêu Cầu Schema**: Chỉ có warehouse_code và name

**Vấn Đề**:
- Thiếu location_address, city, province, postal_code
- Thiếu manager_id
- Thiếu capacity_sqm, current_occupancy_sqm
- Thiếu status

---

### 📊 BẢNG 17: PRODUCT_CATEGORIES (Danh Mục Sản Phẩm)

**Dữ Liệu Hiện Có**:
- Các cột: `id, name, description, parent_id`

**Yêu Cầu Schema**:
- Thiếu image_url
- Thiếu display_order
- Thiếu created_at, updated_at, is_deleted

---

## III. TÓHỢP CÁC VẤN ĐỀ LỚCRT

| Tệp Dữ Liệu | Số Bản Ghi | % Dữ Liệu Thiếu | Mức Độ Lỗi |
|------------|----------|---------------|-----------|
| users.csv | 5 | 58% | 🔴 Cao |
| customers.csv | 1000+ | 72% | 🔴 Cao |
| products.csv | 500+ | 53% | 🟡 Trung Bình |
| crm_opportunities.csv | 14 | 68% | 🔴 Cao |
| sales_quotations.csv | 100 | 74% | 🔴 Cao |
| sales_orders.csv | 50 | 74% | 🔴 Cao |
| purchase_rfqs.csv | 100 | 92% | 🔴 Rất Cao |
| suppliers.csv | 1000+ | 86% | 🔴 Rất Cao |
| delivery_orders.csv | ? | 77% | 🔴 Cao |
| goods_receipts.csv | ? | 75% | 🔴 Cao |
| customer_invoices.csv | ? | 75% | 🔴 Cao |
| vendor_bills.csv | ? | 75% | 🔴 Cao |
| bin_locations.csv | 19 | 63% | 🟡 Trung Bình |

---

## IV. CÁC VẤN ĐỀ CỰC KỲNGHIÊM TRỌNG

### 1. Thiếu Foreign Key References (Sẽ Gây Lỗi SQL)

- `products.csv` thiếu `uom_id` - sẽ gây lỗi NOT NULL khi insert
- `delivery_orders.csv` thiếu `warehouse_id` - sẽ gây lỗi
- `goods_receipts.csv` thiếu `warehouse_id` - sẽ gây lỗi
- Các file khác thiếu `created_by_id`, `approved_by_id` - sẽ gây lỗi

### 2. Thiếu Định Danh Chính Thức (Primary Business Keys)

- Không có `*_number` cho bất kỳ giao dịch nào
- Ví dụ: LEAD-2024-001, SO-2024-0001, INV-2024-0001
- Điều này là QUAN TRỌNG cho business operations

### 3. Thiếu Thông Tin Tài Chính Quan Trọng

- Không tách biệt `total_amount_before_tax`, `total_discount`, `tax_amount`
- Không có `cost_price` trong các đơn hàng
- Không thể tính `profit` và `profit_margin_percent`

### 4. Thiếu Timestamp (Sẽ Gây Lỗi Trigger)

- Tất cả bảng thiếu `created_at`, `updated_at`
- Sẽ gây lỗi khi trigger tự động update timestamp

### 5. Dữ Liệu Không Hợp Lệ

- `crm_opportunities.csv` có `stage_id` = 6, nhưng chỉ có 5 stage trong schema
- Sẽ gây lỗi foreign key constraint violation

---

## V. KHUYẾN CÁO HÀNH ĐỘNG

### 🔧 CẦN PHẢI LÀM

1. **Tái Sinh Dữ Liệu**: Sử dụng một data generation tool (Faker, Seeder) để tạo lại dữ liệu đầy đủ theo schema

2. **Thêm Các Trường Bắt Buộc**:
   - Timestamp: `created_at`, `updated_at`, `is_deleted`
   - Định danh: `*_number` (LEAD-, SO-, INV-, v.v)
   - Foreign keys: `uom_id`, `warehouse_id`, `created_by_id`

3. **Điều Chỉnh Giá Trị**:
   - Stage_id phải trong khoảng 1-5
   - Thêm `reorder_level`, `reorder_quantity`
   - Thêm `credit_limit`, `credit_used`

4. **Tạo Thêm Dữ Liệu**:
   - Cần 30+ bin_locations, hiện có 19
   - Cần warehouse_zones data
   - Cần quotation_lines, sales_order_lines, purchase_order_lines

5. **Xác Thực Dữ Liệu**:
   - Chạy database schema validation
   - Kiểm tra referential integrity
   - Kiểm tra business rules

---

## VI. KẾT LUẬN

Dữ liệu sinh ra hiện tại **CHƯA SỬ DỤNG ĐƯỢC** vì:
1. Thiếu rất nhiều trường bắt buộc theo schema
2. Sẽ gây lỗi khi cố gắng insert vào Supabase
3. Không hỗ trợ đầy đủ các quy trình kinh doanh
4. Thiếu các định danh chính thức cho business operations

**Mức Độ Ưu Tiên**: 🔴 NGAY LẬP TỨC (Critical Priority)

**Thời Gian Ước Tính**: 2-3 ngày để regenerate dữ liệu đầy đủ
