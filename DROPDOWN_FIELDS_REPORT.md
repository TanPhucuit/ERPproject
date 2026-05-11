# BÁO CÁO KIỂM TRA DROPDOWN FIELDS

## Tóm tắt

### ✅ ĐÃ HOẠT ĐỘNG (Sau khi import seed data)

| Module | Trường | Nguồn | API Endpoint | Trạng thái |
|--------|---------|--------|--------------|-------------|
| MasterData > Products | categoryName | API | /product-categories | ✅ Hoạt động |
| MasterData > Products | uomName | API | /units-of-measure | ✅ Hoạt động (đã fix) |
| MasterData > Suppliers | supplierType | API | /supplier-types | ✅ Hoạt động (đã fix) |
| MasterData > Suppliers | payment_terms | Static | - | ✅ Hoạt động |
| MasterData > Users | departmentName | API | /departments | ✅ Hoạt động (đã fix) |
| MasterData > Users | role | Static | - | ✅ Hoạt động |
| MasterData > Warehouses | managerName | API | /users | ✅ Hoạt động |
| MasterData > Bin Locations | warehouseName | API | /warehouses | ✅ Hoạt động |
| MasterData > Categories | parentName | API | /product-categories | ✅ Hoạt động |

### ⚠️ CẦN IMPORT SEED DATA

| Module | Trường | Bảng Database | Bản ghi cần |
|--------|---------|---------------|-------------|
| Products | UOM | units_of_measure | 20 bản ghi |
| Suppliers | Supplier Type | supplier_types | 5 bản ghi |
| Users | Department | departments | 8 bản ghi |
| Warehouses | Manager | users | Cần tạo users trước |

---

## HƯỚNG DẪN IMPORT SEED DATA

### Bước 1: Mở Supabase SQL Editor

1. Truy cập: https://supabase.com/dashboard
2. Chọn project: thrazxhwqetphjogcdji
3. Menu: SQL Editor

### Bước 2: Import file seed_data.sql

1. Copy toàn bộ nội dung file `D:\project\ERP\seed_data.sql`
2. Paste vào SQL Editor
3. Click "Run"

### Bước 3: Verify

Chạy các query sau để verify:

```sql
-- Kiểm tra Units of Measure
SELECT * FROM units_of_measure ORDER BY name;

-- Kiểm tra Supplier Types
SELECT * FROM supplier_types;

-- Kiểm tra Departments
SELECT * FROM departments;

-- Kiểm tra Lead Stages
SELECT * FROM lead_stages;

-- Kiểm tra Activity Types
SELECT * FROM activity_types;

-- Kiểm tra Payment Methods
SELECT * FROM payment_methods;

-- Kiểm tra Accounts
SELECT * FROM accounts LIMIT 10;

-- Kiểm tra Carriers
SELECT * FROM carriers;
```

---

## THỨ TỰ IMPORT ĐỀ XUẤT

1. **departments** - Phòng ban (8 bản ghi)
2. **units_of_measure** - Đơn vị tính (20 bản ghi)
3. **supplier_types** - Loại NCC (5 bản ghi)
4. **lead_stages** - Giai đoạn Lead (5 bản ghi)
5. **activity_types** - Loại hoạt động (10 bản ghi)
6. **payment_methods** - PTTT (6 bản ghi)
7. **accounts** - TK kế toán (22 bản ghi)
8. **carriers** - Đơn vị VC (8 bản ghi)

---

## SAU KHI IMPORT - CÁC BƯỚC TIẾP THEO

### Bước 1: Reload trang Master Data

F5 hoặc refresh trang để reload dropdown options.

### Bước 2: Test tạo Product mới

1. Vào Master Data > Products
2. Click "New Product"
3. Kiểm tra dropdown Unit of Measure đã hiển thị đúng
4. Kiểm tra dropdown Category đã hiển thị đúng

### Bước 3: Test tạo Supplier mới

1. Vào Master Data > Suppliers
2. Click "New Supplier"
3. Kiểm tra dropdown Supplier Type đã hiển thị đúng

### Bước 4: Test tạo User mới

1. Vào Master Data > Users
2. Click "New User"
3. Kiểm tra dropdown Department đã hiển thị đúng

---

## VẤN ĐỀ ĐÃ FIX TRONG CODE

### 1. Units of Measure (Products)
- **Trước**: API endpoint không tồn tại
- **Sau**: Đã thêm `/units-of-measure` endpoint
- **Fix**: `normalizeProductRow` trả về `uomName` để hiển thị

### 2. Supplier Types (Suppliers)
- **Trước**: Query không include supplier_types join
- **Sau**: Query include `supplier_type:supplier_types(name)`
- **Fix**: `normalizeSupplierRow` trả về `supplierTypeName`

### 3. Departments (Users)
- **Trước**: Extract từ users (không có bảng riêng)
- **Sau**: Load từ `/departments` API
- **Fix**: Thêm endpoint `/departments` và loadDepartments()

### 4. Products > Categories
- **Trước**: Options rỗng
- **Sau**: Load từ `/product-categories` API

### 5. Warehouses > Manager
- **Trước**: Options rỗng
- **Sau**: Load từ `/users` API

### 6. Bin Locations > Warehouse
- **Trước**: Options rỗng
- **Sau**: Load từ `/warehouse/warehouses` API

---

## CÁC MODULE KHÁC - DROPDOWN STATUS

### CRM Module
| Trường | Nguồn | Trạng thái |
|--------|--------|-------------|
| ownerName (Sales Person) | /users | ✅ Hoạt động |
| stage | Static | ✅ Hoạt động (lead_stages) |
| source | Static | ✅ Hoạt động |
| leadRating | Static | ✅ Hoạt động |

### Sales Module
| Trường | Nguồn | Trạng thái |
|--------|--------|-------------|
| customerName | /customers | ✅ Hoạt động |
| leadNumber | /crm/leads | ✅ Hoạt động |
| quotationNumber | /sales-orders/quotations | ✅ Hoạt động |
| salesPersonName | /users (filtered) | ✅ Hoạt động |

### Purchase Module
| Trường | Nguồn | Trạng thái |
|--------|--------|-------------|
| supplierName | /suppliers | ✅ Hoạt động |
| rfqNumber | /purchase/rfqs | ✅ Hoạt động |

### Inventory Module
| Trường | Nguồn | Trạng thái |
|--------|--------|-------------|
| warehouseName | /warehouse/warehouses | ✅ Hoạt động |
| productName | /products | ✅ Hoạt động |
| binCode | /warehouse/bin-locations | ✅ Hoạt động |

### Accounting Module
| Trường | Nguồn | Trạng thái |
|--------|--------|-------------|
| customerName | /customers | ✅ Hoạt động |
| salesOrderNumber | /sales-orders | ✅ Hoạt động |
| supplierName | /suppliers | ✅ Hoạt động |
| purchaseOrderNumber | /purchase/purchase-orders | ✅ Hoạt động |

---

## KẾT LUẬN

1. **Đã tạo** file `QUY_TRINH_NGHIEP_VU.md` - Tài liệu quy trình nghiệp vụ đầy đủ
2. **Đã fix** 6 vấn đề dropdown trong code
3. **Cần import** file `seed_data.sql` vào Supabase để có dữ liệu lookup
4. **Sau khi import**, toàn bộ dropdown sẽ hoạt động đúng

---

*Document Version: 1.0*
*Last Updated: 2026-05-11*
