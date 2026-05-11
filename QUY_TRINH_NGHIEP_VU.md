# QUY TRÌNH NGHIỆP VỤ ERP - NOVATECH DISTRIBUTION

## MỤC LỤC
1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Master Data - Dữ liệu nền tảng](#2-master-data---dữ-liệu-nền-tảng)
3. [Quy trình CRM - Quản lý khách hàng tiềm năng](#3-quy-trình-crm---quản-lý-khách-hàng-tiềm-năng)
4. [Quy trình Bán hàng](#4-quy-trình-bán-hàng)
5. [Quy trình Mua hàng](#5-quy-trình-mua-hàng)
6. [Quy trình Kho/Vận chuyển](#6-quy-trình-khovận-chuyển)
7. [Quy trình Kế toán](#7-quy-trình-kế-toán)
8. [Sơ đồ luồng dữ liệu tổng thể](#8-sơ-đồ-luồng-dữ-liệu-tổng-thể)
9. [Danh sách bảng database và mối quan hệ](#9-danh-sách-bảng-database-và-mối-quan-hệ)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Giới thiệu
- **Tên hệ thống**: NovaTech Distribution ERP
- **Lĩnh vực**: Phân phối thiết bị Smart Home & IoT
- **Database**: PostgreSQL (Supabase)
- **Ngôn ngữ lập trình**: TypeScript (React + Node.js)

### 1.2 Các module chính
| Module | Mô tả |
|--------|--------|
| **Master Data** | Dữ liệu nền tảng: sản phẩm, khách hàng, nhà cung cấp, kho, người dùng |
| **CRM** | Quản lý khách hàng tiềm năng (Lead) và hoạt động |
| **Sales** | Báo giá (Quotation) và Đơn hàng bán (Sales Order) |
| **Purchase** | Yêu cầu báo giá (RFQ) và Đơn hàng mua (Purchase Order) |
| **Inventory** | Quản lý tồn kho, giao hàng, nhận hàng, kiểm kho |
| **Accounting** | Hóa đơn, công nợ, thanh toán |

### 1.3 Người dùng và vai trò
| Vai trò | Mô tả |
|---------|--------|
| CEO | Toàn quyền truy cập |
| Sales_Manager | Quản lý bán hàng |
| Purchasing_Manager | Quản lý mua hàng |
| Warehouse_Manager | Quản lý kho |
| Accountant | Kế toán |
| Admin | Quản trị hệ thống |
| User | Người dùng thông thường |

---

## 2. MASTER DATA - DỮ LIỆU NỀN TẢNG

### 2.1 Sản phẩm (Products)
**Mục đích**: Quản lý danh mục sản phẩm kinh doanh

**Các trường chính**:
- SKU (mã sản phẩm) - Unique
- Tên sản phẩm
- Category (danh mục) - FK → product_categories
- Unit of Measure (đơn vị tính) - FK → units_of_measure
- List Price (giá bán)
- Cost Price (giá vốn)
- Reorder Level / Reorder Quantity
- Supplier Lead Time (ngày)
- Status: active, discontinued, prototype

**Quy tắc nghiệp vụ**:
- Profit Margin % được tính tự động: `(list_price - cost_price) / list_price * 100`
- Mỗi sản phẩm phải thuộc một Category
- Mỗi sản phẩm phải có đơn vị tính

### 2.2 Danh mục sản phẩm (Product Categories)
**Mục đích**: Phân loại sản phẩm theo nhóm

**Cấu trúc**: Hỗ trợ danh mục cha-con (parent-child)

**Trạng thái**: Active / Inactive

### 2.3 Đơn vị tính (Units of Measure)
**Mục đích**: Quy đổi đơn vị tính cho sản phẩm

**Danh sách mặc định**:
| Code | Name | Conversion Factor |
|------|------|-------------------|
| pcs | Pieces | 1.0000 |
| box | Box | 1.0000 |
| kg | Kilogram | 1.0000 |
| m | Meter | 1.0000 |
| l | Liter | 1.0000 |
| set | Set | 1.0000 |
| pack | Pack | 1.0000 |

### 2.4 Khách hàng (Customers)
**Mục đích**: Quản lý thông tin khách hàng

**Các trường chính**:
- Customer Number (mã KH) - auto
- Tên công ty / cá nhân
- Customer Type: B2B, B2C
- Tax ID
- Contact Person (tên, email, phone)
- Billing Address / Shipping Address
- Payment Terms: NET30, NET45, NET60, COD, Prepaid
- Credit Limit
- Status: active, inactive, blocked

**Quy tắc nghiệp vụ**:
- Credit Used được tính tự động từ customer_invoices
- Khi khách hàng bị "blocked", không cho phép tạo đơn hàng mới

### 2.5 Nhà cung cấp (Suppliers)
**Mục đích**: Quản lý thông tin nhà cung cấp

**Các trường chính**:
- Supplier Number (mã NCC) - auto
- Tên công ty
- Supplier Type - FK → supplier_types
- Tax ID
- Contact Person
- Address, City, Province
- Payment Terms
- Average Lead Time Days
- Quality Rating (0-5)
- Is Preferred
- Status: active, inactive, blocked

**Các loại nhà cung cấp**:
| Code | Name |
|------|------|
| equipment | Equipment & Product Suppliers |
| components | Component & Part Suppliers |
| logistics | Logistics & Transportation |
| services | Service Providers |
| maintenance | Maintenance & Repair Services |

### 2.6 Người dùng (Users)
**Mục đích**: Quản lý tài khoản nhân viên

**Các trường chính**:
- Email (unique)
- Full Name
- Role: CEO, Sales_Manager, Purchasing_Manager, Warehouse_Manager, Accountant, Admin, user
- Department - FK → departments
- Phone, Avatar
- Status: active, inactive, suspended

### 2.7 Kho (Warehouses)
**Mục đích**: Quản lý thông tin kho hàng

**Các trường chính**:
- Warehouse Code (unique)
- Tên kho
- Địa chỉ
- Warehouse Manager - FK → users
- Capacity (sqm)
- Status: active, maintenance, closed

### 2.8 Vị trí kho (Bin Locations)
**Mục đích**: Quản lý vị trí lưu trữ trong kho

**Cấu trúc**: Warehouse → Zone → Bin

**Các trường chính**:
- Warehouse - FK → warehouses
- Bin Code (unique trong warehouse)
- Capacity Units
- Status: active, maintenance, reserve

---

## 3. QUY TRÌNH CRM - QUẢN LÝ KHÁCH HÀNG TIỀM NĂNG

### 3.1 Sơ đồ luồng Lead

```
[new] → [site_survey] → [proposition] → [won]
    ↓          ↓              ↓
  [lost]     [lost]        [lost]
```

### 3.2 Chi tiết từng giai đoạn (Lead Stages)

| Stage | Màu | Xác suất thành công | Mô tả |
|-------|-----|---------------------|--------|
| new | #808080 | 10% | Lead mới tiếp nhận |
| site_survey | #4A90E2 | 30% | Khảo sát công trình |
| proposition | #F5A623 | 60% | Gửi báo giá / đề xuất |
| won | #7ED321 | 100% | Chốt đơn thành công |
| lost | #D0021B | 0% | Mất lead |

### 3.3 Nguồn Lead (Lead Sources)
- Website
- Referral (Giới thiệu)
- Showroom
- Architect Partner (Kiến trúc sư)
- Cold Call
- Social Media

### 3.4 Rating Lead
| Rating | Mô tả |
|--------|--------|
| Hot | Có nhu cầu cao, sẵn sàng mua |
| Warm | Có quan tâm, cần nuôi dưỡng |
| Cold | Ít quan tâm, cần follow up |

### 3.5 Hoạt động CRM (Activity Types)
| Type | Mô tả |
|------|--------|
| call | Cuộc gọi điện |
| email | Email liên lạc |
| meeting | Họp trực tiếp/video |
| site_survey | Khảo sát công trình |
| quotation | Gửi báo giá |
| proposal | Trình bày đề xuất |
| follow_up | Theo dõi |
| negotiation | Đàm phán |
| contract | Ký hợp đồng |
| note | Ghi chú nội bộ |

### 3.6 Quy trình xử lý Lead

**Bước 1: Tạo Lead mới**
- Nhập thông tin công ty, người liên hệ
- Chọn Sales Person phụ trách (Owner)
- Chọn Stage = "new"
- Chọn Source và Rating

**Bước 2: Ghi nhận hoạt động**
- Log các hoạt động: cuộc gọi, email, họp
- Cập nhật ghi chú

**Bước 3: Khảo sát (nếu cần)**
- Chuyển stage → "site_survey"
- Tạo activity "site_survey"

**Bước 4: Gửi báo giá**
- Chuyển stage → "proposition"
- Tạo Quotation từ Lead

**Bước 5: Kết quả**
- Thành công: Chuyển stage → "won" → Tạo Customer
- Thất bại: Chuyển stage → "lost"

---

## 4. QUY TRÌNH BÁN HÀNG

### 4.1 Sơ đồ luồng Sales

```
Quotation (draft) → Quotation (sent) → Quotation (accepted) → Sales Order (draft) → SO (confirmed) → SO (delivered)
       ↓                   ↓                   ↓
  Quotation (rejected)              Quotation (expired)
```

### 4.2 Chi tiết trạng thái

#### Quotation (Báo giá)
| Status | Mô tả |
|--------|--------|
| draft | Nháp - đang soạn thảo |
| sent | Đã gửi cho khách hàng |
| accepted | Khách chấp nhận |
| rejected | Khách từ chối |
| expired | Hết hạn hiệu lực |

#### Sales Order (Đơn hàng bán)
| Status | Mô tả |
|--------|--------|
| draft | Nháp - đang soạn thảo |
| confirmed | Đã xác nhận với khách |
| partially_shipped | Giao hàng một phần |
| shipped | Đã xuất hàng |
| delivered | Giao hàng thành công |
| cancelled | Đã hủy |

### 4.3 Quy trình tạo Quotation

**Bước 1: Tạo Quotation mới**
- Chọn Customer (bắt buộc)
- Tùy chọn: chọn Lead nguồn
- Nhập ngày phát hành, ngày hết hạn

**Bước 2: Thêm sản phẩm (Quotation Lines)**
- Chọn sản phẩm
- Nhập số lượng, đơn giá
- Áp dụng chiết khấu (nếu có)
- Hệ thống tự tính thuế (mặc định 10%)

**Bước 3: Tính toán tự động**
- Subtotal = Σ(quantity × unit_price × (1 - discount%))
- Tax Amount = Subtotal × tax%
- Total Amount = Subtotal + Tax Amount
- Estimated Profit = Total Revenue - Total Cost

**Bước 4: Duyệt và gửi**
- Discount > 15%: Cảnh báo cần duyệt Sales Manager
- Gửi báo giá cho khách

### 4.4 Quy trình tạo Sales Order từ Quotation

**Bước 1: Accept Quotation**
- Chuyển quotation status → "accepted"

**Bước 2: Tạo Sales Order**
- Link từ Quotation đã accept
- Tự động copy thông tin khách hàng, sản phẩm, đơn giá

**Bước 3: Xác nhận đơn hàng**
- Chọn Sales Person phụ trách giao hàng
- Chuyển status → "confirmed"

**Bước 4: Theo dõi giao hàng**
- Tạo Delivery Order
- Cập nhật từng bước giao hàng

### 4.5 Tạo Delivery Order

**Bước 1: Tạo DO từ SO**
- Chọn Sales Order đã confirmed
- Chọn Warehouse xuất hàng
- Chọn Carrier vận chuyển

**Bước 2: Đóng gói và xuất kho**
- Cập nhật số lượng đã giao
- Tự động trừ tồn kho (stock_levels)

**Bước 3: Giao hàng**
- Cập nhật tracking number
- Ghi nhận ngày giao thực tế

### 4.6 Tạo Customer Invoice

**Bước 1: Tạo hóa đơn**
- Link từ Sales Order đã giao hàng
- Tự động copy thông tin từ SO

**Bước 2: Xác định hạn thanh toán**
- Dựa trên Payment Terms của Customer (NET30, NET45, NET60, COD, Prepaid)

**Bước 3: Theo dõi thanh toán**
- Ghi nhận thanh toán từng đợt
- Cập nhật status: draft → issued → partial_paid → paid

---

## 5. QUY TRÌNH MUA HÀNG

### 5.1 Sơ đồ luồng Purchase

```
RFQ (draft) → RFQ (sent) → RFQ (closed) → Purchase Order (draft) → PO (confirmed) → PO (received)
                                      ↓
                               PO (cancelled)
```

### 5.2 Chi tiết trạng thái

#### RFQ (Request for Quotation)
| Status | Mô tả |
|--------|--------|
| draft | Nháp |
| sent | Đã gửi yêu cầu báo giá |
| closed | Đã đóng, chọn NCC |
| cancelled | Đã hủy |

#### Purchase Order (Đơn hàng mua)
| Status | Mô tả |
|--------|--------|
| draft | Nháp |
| confirmed | Đã xác nhận với NCC |
| partial_received | Nhận hàng một phần |
| received | Nhận đủ hàng |
| cancelled | Đã hủy |

### 5.3 Quy trình mua hàng

**Bước 1: Tạo RFQ (nếu cần so sánh giá)**
- Liệt kê sản phẩm cần mua
- Gửi RFQ cho nhiều nhà cung cấp

**Bước 2: Thu thập báo giá (RFQ Supplier Quotations)**
- Mỗi NCC gửi báo giá riêng
- So sánh giá, lead time, chất lượng

**Bước 3: Tạo Purchase Order**
- Chọn Supplier (có thể từ RFQ đã chọn)
- Nhập thông tin giao hàng

**Bước 4: Xác nhận PO**
- Gửi PO cho nhà cung cấp
- Chuyển status → "confirmed"

**Bước 5: Nhận hàng (Goods Receipt)**
- Tạo Goods Receipt khi hàng về
- Kiểm tra số lượng, chất lượng
- Cập nhật tồn kho (stock_levels)

**Bước 6: Tạo Vendor Bill**
- Nhận hóa đơn từ NCC
- Đối chiếu với PO và GR
- Theo dõi thanh toán cho NCC

---

## 6. QUY TRÌNH KHO/VẬN CHUYỂN

### 6.1 Quản lý tồn kho (Stock Levels)

**Theo dõi tại mỗi Warehouse × Product**:
- Quantity On Hand: Tổng số lượng trong kho
- Quantity Reserved: Đã allocate cho SO chưa giao
- Quantity Available: Còn lại để bán (On Hand - Reserved)
- Quantity In Transit: Đang trên đường (trong GR)

**Trạng thái reorder**:
| Status | Mô tả |
|--------|--------|
| optimal | Tồn kho tốt |
| understocked | Dưới mức tối thiểu |
| overstocked | Tồn kho quá nhiều |
| critical | Rất nguy hiểm, cần đặt hàng ngay |

### 6.2 Quản lý vị trí (Bin Locations)

**Cấu trúc lưu trữ**:
- Warehouse → Zone → Bin
- Ví dụ: WH-HCM-01-A-R01-01-L1
  - WH-HCM: Warehouse HCM
  - 01: Zone 1
  - A: Khu vực
  - R01-01: Rack, Row
  - L1: Level 1

### 6.3 Nhận hàng (Goods Receipt)

**Bước 1: Tạo GR từ PO**
- Link với Purchase Order

**Bước 2: Kiểm tra hàng**
- Nhập số lượng nhận được
- Đánh giá chất lượng:
  - good: Hàng tốt
  - defective: Có lỗi
  - damaged: Hư hỏng
  - wrong_item: Sai hàng

**Bước 3: Cập nhật tồn kho**
- Tự động tăng quantity_on_hand
- Tự động cập nhật stock_in_bins

### 6.4 Xuất hàng (Delivery Order)

**Bước 1: Tạo DO từ SO**
- Chọn sản phẩm cần giao

**Bước 2: Chọn vị trí lấy hàng**
- Chỉ định Bin Location

**Bước 3: Giao hàng**
- Cập nhật status: draft → ready → done
- Trừ tồn kho

### 6.5 Kiểm kho (Stock Count / Inventory Adjustment)

**Bước 1: Tạo Adjustment**
- Chọn Warehouse
- Chọn sản phẩm cần kiểm

**Bước 2: Nhập số liệu thực tế**
- Số lượng theo hệ thống (system)
- Số lượng đếm được thực tế (actual)

**Bước 3: Xử lý chênh lệch**
- Variance = Actual - System
- Ghi nhận lý do: loss, damage, miscount, other

---

## 7. QUY TRÌNH KẾ TOÁN

### 7.1 Customer Invoice (Hóa đơn bán)

**Trạng thái**:
| Status | Mô tả |
|--------|--------|
| draft | Nháp |
| issued | Đã phát hành |
| sent | Đã gửi cho khách |
| partial_paid | Thanh toán một phần |
| paid | Đã thanh toán đủ |
| overdue | Quá hạn thanh toán |
| cancelled | Đã hủy |

**Tự động tính**:
- Outstanding Amount = Total Amount - Paid Amount

### 7.2 Vendor Bill (Hóa đơn mua)

**Trạng thái**: Tương tự Customer Invoice

### 7.3 Credit Note (Phiếu ghi có)

**Mục đích**: Xử lý trả hàng, giảm giá cho khách

**Trạng thái**:
| Status | Mô tả |
|--------|--------|
| draft | Nháp |
| issued | Đã phát hành |
| applied | Đã áp dụng (trừ công nợ) |

### 7.4 Debit Note (Phiếu ghi nợ)

**Mục đích**: Xử lý nhận hàng lỗi, yêu cầu bồi thường từ NCC

**Trạng thái**: Tương tự Credit Note

### 7.5 Thanh toán

#### Customer Payments
- Link với Invoice
- Chọn Payment Method:
  - Bank Transfer
  - Check
  - Cash
  - Credit Card
  - Digital Wallet (MoMo, ZaloPay, VNPay)
  - Other

#### Supplier Payments
- Link với Vendor Bill
- Chọn Payment Method

### 7.6 Báo cáo tài chính

**Số liệu tự động thu thập**:
- Total Sales Revenue (từ SOs đã delivered)
- Total Purchase Spent (từ POs đã received)
- Total Profit = Revenue - Cost
- Profit Margin %

---

## 8. SƠ ĐỒ LUỒNG DỮ LIỆU TỔNG THỂ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MASTER DATA (Nền tảng)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │Products  │  │Customers │  │Suppliers │  │ Warehouses│ │  Users   │    │
│  │  & UOM   │  │  & Tax   │  │  & Type  │  │  & Bins  │  │& Dept   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘    │
└───────┼────────────┼────────────┼────────────┼───────────────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               MODULES                                       │
│                                                                             │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐    │
│  │   CRM LEADS     │      │   SALES MODULE  │      │  PURCHASE MOD   │    │
│  │                 │      │                 │      │                 │    │
│  │ Lead → Won ──────────────────→ Customer     │      │                 │    │
│  │  │             │      │  │                 │      │  │             │    │
│  │  │             │      │  ▼                 │      │  ▼             │    │
│  │  │             │      │ Quotation ────→ Sales Order            │    │
│  │  │             │      │                        │      │  │             │    │
│  │  ▼             │      │                        │      │  ▼             │    │
│  │ Activities     │      │                        │      │  PO ───→ GR    │    │
│  └───────────────┘      └──────────┬────────────┘      └───────┬────────┘    │
│                                    │                            │             │
│                                    ▼                            ▼             │
│                         ┌─────────────────┐          ┌─────────────────┐    │
│                         │   INVENTORY     │          │   ACCOUNTING    │    │
│                         │                 │          │                 │    │
│                         │ Delivery Order ←─┼──────────│ Invoice ←── SO  │    │
│                         │       │         │          │                 │    │
│                         │       ▼         │          │ Vendor Bill ← PO│    │
│                         │ Stock Levels    │          │                 │    │
│                         │                 │          │ Credit/Debit   │    │
│                         │ Stock Count     │          │ Notes           │    │
│                         └─────────────────┘          │                 │    │
│                                                        │ Payments ──────┘    │
│                                                        └─────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. DANH SÁCH BẢNG DATABASE VÀ MỐI QUAN HỆ

### 9.1 Bảng Lookup/Reference (Cần dữ liệu seed)

| Bảng | Mô tả | Số bản ghi seed |
|------|--------|----------------|
| departments | Phòng ban | 8 |
| units_of_measure | Đơn vị tính | 20 |
| supplier_types | Loại nhà cung cấp | 5 |
| lead_stages | Giai đoạn Lead | 5 |
| activity_types | Loại hoạt động CRM | 10 |
| payment_methods | Phương thức thanh toán | 6 |
| accounts | Danh mục tài khoản | 22 |
| carriers | Đơn vị vận chuyển | 8 |

### 9.2 Bảng Master Data

| Bảng | FK Dependencies |
|------|----------------|
| product_categories | parent_id (self) |
| products | category_id, uom_id |
| customers | lead_id |
| suppliers | supplier_type_id |
| users | department_id |
| warehouses | manager_id |
| bin_locations | warehouse_id, zone_id |

### 9.3 Bảng Transaction

| Bảng | FK Dependencies |
|------|----------------|
| leads | stage_id, owner_id, created_by_id |
| activities | lead_id, activity_type_id, assigned_to_id |
| quotations | customer_id, lead_id, created_by_id |
| quotation_lines | quotation_id, product_id |
| sales_orders | quotation_id, customer_id, sales_person_id |
| sales_order_lines | sales_order_id, product_id |
| rfqs | created_by_id |
| rfq_lines | rfq_id, product_id |
| rfq_supplier_quotations | rfq_line_id, supplier_id |
| purchase_orders | supplier_id, rfq_id |
| purchase_order_lines | purchase_order_id, product_id |
| warehouses | manager_id |
| warehouse_zones | warehouse_id |
| bin_locations | warehouse_id, zone_id |
| stock_levels | product_id, warehouse_id |
| stock_in_bins | bin_location_id, product_id |
| delivery_orders | sales_order_id, warehouse_id, carrier_id |
| delivery_order_lines | delivery_order_id, sales_order_line_id, bin_location_id |
| goods_receipts | purchase_order_id, warehouse_id, verified_by_id |
| goods_receipt_lines | goods_receipt_id, purchase_order_line_id, bin_location_id |
| inventory_adjustments | warehouse_id, created_by_id, approved_by_id |
| inventory_adjustment_lines | adjustment_id, product_id, bin_location_id |
| customer_invoices | sales_order_id, customer_id, issued_by_id |
| customer_invoice_lines | invoice_id, sales_order_line_id, product_id |
| vendor_bills | purchase_order_id, supplier_id |
| vendor_bill_lines | bill_id, purchase_order_line_id, product_id |
| credit_notes | invoice_id, customer_id |
| debit_notes | bill_id, supplier_id |
| customer_payments | invoice_id, customer_id, payment_method_id |
| supplier_payments | bill_id, supplier_id, payment_method_id |
| serial_numbers | product_id, purchase_order_line_id, warehouse_id, bin_location_id |
| warranties | serial_number_id, customer_id |
| warranty_claims | warranty_id, approved_by_id |

### 9.4 Bảng Audit/Metrics

| Bảng | Mô tả |
|------|--------|
| audit_logs | Log tất cả thao tác CRUD |
| daily_metrics | Số liệu tổng hợp theo ngày |
| product_sales_metrics | Thống kê bán hàng theo sản phẩm |
| customer_metrics | Thống kê theo khách hàng |
| supplier_metrics | Thống kê theo nhà cung cấp |
| company_settings | Cấu hình hệ thống |

---

## 10. QUY TẮC NGHIỆP VỤ TỰ ĐỘNG

### 10.1 Tính toán tự động

| Trường | Công thức |
|--------|-----------|
| profit_margin_percent (product) | (list_price - cost_price) / list_price × 100 |
| profit_margin_percent (SO) | (total_amount - total_cost) / total_amount × 100 |
| estimated_profit (SO) | total_amount - total_cost |
| quantity_available | quantity_on_hand - quantity_reserved |
| outstanding_amount (invoice) | total_amount - paid_amount |
| line_total (quotation) | qty × price × (1 - discount%) × (1 + tax%) |
| line_total (SO line) | qty × price × (1 - discount%) |

### 10.2 Ràng buộc nghiệp vụ

1. **Xóa bản ghi**: Không cho xóa nếu có bản ghi con phụ thuộc
2. **Credit Hold**: Không cho tạo SO nếu customer vượt credit limit
3. **Chiết khấu cao**: Cảnh báo nếu discount > 15% trên quotation
4. **Warehouse Restrict**: Khi xóa warehouse phải đảm bảo không có stock

### 10.3 Trigger tự động

| Trigger | Hành động |
|---------|----------|
| update_timestamp | Tự động cập nhật updated_at khi UPDATE |

---

## 11. THỨ TỰ TEST API THEO QUY TRÌNH NGHIỆP VỤ

### Phase 1: Setup Master Data (Thứ tự 1-8)

1. **POST /departments** - Tạo phòng ban
2. **POST /users** - Tạo người dùng (gán department)
3. **POST /product-categories** - Tạo danh mục sản phẩm
4. **POST /units-of-measure** - Tạo đơn vị tính
5. **POST /supplier-types** - Tạo loại nhà cung cấp
6. **POST /suppliers** - Tạo nhà cung cấp
7. **POST /warehouse/warehouses** - Tạo kho
8. **POST /warehouse/bin-locations** - Tạo vị trí kho

### Phase 2: Products (Thứ tự 9)

9. **POST /products** - Tạo sản phẩm (cần category, uom đã tạo)

### Phase 3: CRM (Thứ tự 10-12)

10. **POST /crm/leads** - Tạo Lead
11. **PUT /crm/leads/{id}** - Cập nhật Lead stage
12. **POST /crm/leads/{id}/convert** - Chuyển Lead → Customer

### Phase 4: Sales (Thứ tự 13-19)

13. **POST /sales-orders/quotations** - Tạo Quotation
14. **PUT /sales-orders/quotations/{id}** - Cập nhật Quotation (accept)
15. **POST /sales-orders** - Tạo Sales Order từ Quotation
16. **PUT /sales-orders/{id}** - Xác nhận SO (confirmed)
17. **POST /inventory/delivery-orders** - Tạo Delivery Order
18. **PUT /inventory/delivery-orders/{id}** - Cập nhật DO (done)
19. **POST /accounting/invoices** - Tạo Invoice

### Phase 5: Purchase (Thứ tự 20-26)

20. **POST /purchase/rfqs** - Tạo RFQ
21. **PUT /purchase/rfqs/{id}** - Đóng RFQ
22. **POST /purchase/purchase-orders** - Tạo PO
23. **PUT /purchase/purchase-orders/{id}** - Xác nhận PO
24. **POST /inventory/goods-receipts** - Tạo Goods Receipt
25. **PUT /inventory/goods-receipts/{id}** - Cập nhật GR
26. **POST /accounting/bills** - Tạo Vendor Bill

### Phase 6: Accounting (Thứ tự 27-30)

27. **POST /accounting/payments** - Thanh toán Invoice
28. **POST /accounting/credit-notes** - Tạo Credit Note
29. **POST /accounting/debit-notes** - Tạo Debit Note
30. **GET /accounting/metrics** - Lấy báo cáo tài chính

---

## 12. TRẠNG THÁI CỦA TẤT CẢ CÁC MODULE

### Summary Status Flow

| Module | Flow |
|--------|------|
| **CRM Lead** | new → site_survey → proposition → won/lost |
| **Quotation** | draft → sent → accepted/rejected/expired |
| **Sales Order** | draft → confirmed → partially_shipped/shipped → delivered → cancelled |
| **Delivery Order** | draft → ready → done |
| **Customer Invoice** | draft → issued → sent → partial_paid → paid/overdue → cancelled |
| **RFQ** | draft → sent → closed → cancelled |
| **Purchase Order** | draft → confirmed → partial_received → received → cancelled |
| **Goods Receipt** | draft → received → verified → completed → cancelled |
| **Vendor Bill** | draft → received → verified → partial_paid → paid/overdue → cancelled |
| **Credit/Debit Note** | draft → issued → applied |
| **Inventory Adjustment** | draft → posted |
| **User** | active ↔ inactive/suspended |
| **Customer/Supplier** | active ↔ inactive ↔ blocked |

---

*Document Version: 1.0*
*Last Updated: 2026-05-11*
*Author: NovaTech ERP System*
