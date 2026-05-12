# CHUYÊN GIA ERP - BÁO CÁO PHÂN TÍCH & KẾ HOẠCH HÀNH ĐỘNG
## NovaTech Distribution ERP System

> **Audit Date**: 2026-05-12
> **Auditor**: ERP Consultant Agent
> **System**: NovaTech Distribution - Smart Home & IoT Equipment
> **Database**: PostgreSQL (Supabase)

---

## TÓM TẮT ĐIỀU HÀNH

Đồ án NovaTech ERP có **tiềm năng rất lớn** nhưng đang gặp **vấn đề nghiêm trọng về kiến trúc nghiệp vụ**. Hệ thống được xây dựng bởi một developer giỏi kỹ thuật nhưng **thiếu tư duy ERP chuyên nghiệp** — tức là hiểu rằng **dữ liệu phải chảy theo luồng nghiệp vụ, không phải theo ý muốn nhập liệu tùy tiện**.

Có **3 nhóm vấn đề chính**:
1. **Dữ liệu tự động bị nhập tay** (TRÁI VỚI NGUYÊN TẮC ERP)
2. **Form nhập liệu thiếu ràng buộc nghiệp vụ** (thiếu validation, thiếu trường bắt buộc)
3. **Logic luồng dữ liệu bị phá vỡ** (mối quan hệ cha-con không được tôn trọng)

---

## PHẦN 1: PHÂN TÍCH DATABASE SCHEMA - PARENT/CHILD RELATIONSHIPS

### 1.1 Sơ đồ phân cấp Table Relationships

```
TIER 0 - Reference/Lookup Tables (Không phụ thuộc bảng nào)
├── departments
├── units_of_measure  
├── supplier_types
├── lead_stages
├── activity_types
├── payment_methods
├── accounts
└── carriers

TIER 1 - Master Data (Phụ thuộc Tier 0)
├── users ──────────────► departments
├── product_categories ─► product_categories (self-reference: parent_id)
├── products ───────────► product_categories, units_of_measure
├── suppliers ──────────► supplier_types
├── customers ──────────► leads (optional)
└── warehouses ─────────► users (manager_id)

TIER 2 - Operations (Phụ thuộc Tier 0, 1)
├── leads ──────────────► lead_stages, users, leads (optional link to customers)
├── activities ─────────► leads, activity_types, users
├── quotations ──────────► customers, leads, users
├── quotation_lines ─────► quotations, products
├── rfqs ───────────────► users
├── rfq_lines ──────────► rfqs, products
├── rfq_supplier_quotations ► rfq_lines, suppliers
├── bin_locations ───────► warehouses, warehouse_zones
├── stock_levels ────────► products, warehouses
└── stock_in_bins ───────► bin_locations, products

TIER 3 - Transaction Documents (Phụ thuộc Tier 1, 2)
├── sales_orders ────────► quotations, customers, users
├── sales_order_lines ───► sales_orders, products
├── purchase_orders ─────► suppliers, rfqs, users
├── purchase_order_lines ─► purchase_orders, products
├── delivery_orders ─────► sales_orders, warehouses, carriers
├── delivery_order_lines ► delivery_orders, sales_order_lines, products, bin_locations
├── goods_receipts ───────► purchase_orders, warehouses, users
├── goods_receipt_lines ─► goods_receipts, purchase_order_lines, products, bin_locations
├── inventory_adjustments ► warehouses, users
├── inventory_adjustment_lines ► inventory_adjustments, products, bin_locations
└── serial_numbers ──────► products, purchase_order_lines, goods_receipt_lines,
                            warehouses, bin_locations, customers

TIER 4 - Accounting (Phụ thuộc Tier 1, 3)
├── customer_invoices ───► sales_orders, customers, users
├── customer_invoice_lines ► customer_invoices, sales_order_lines, products
├── vendor_bills ─────────► purchase_orders, suppliers
├── vendor_bill_lines ───► vendor_bills, purchase_order_lines, products
├── credit_notes ─────────► customer_invoices, customers, users
├── credit_note_lines ───► credit_notes, products
├── debit_notes ──────────► vendor_bills, suppliers, users
├── debit_note_lines ─────► debit_notes, products
├── customer_payments ────► customer_invoices, customers, payment_methods, users
├── supplier_payments ────► vendor_bills, suppliers, payment_methods, users
├── warranties ───────────► serial_numbers, customers
└── warranty_claims ──────► warranties, users

TIER 5 - Analytics (Tổng hợp từ Tier 1-4)
├── audit_logs
├── daily_metrics ───────► products, customers
├── product_sales_metrics ► products
├── customer_metrics ─────► customers
├── supplier_metrics ─────► suppliers
└── company_settings
```

---

## PHẦN 2: NHỮNG TRƯỜNG NÀO "ĐƯỢC PHÉP" VÀ "KHÔNG ĐƯỢC PHÉP" NHẬP TAY

### 2.1 Nguyên tắc vàng của ERP mà đồ án này vi phạm

> **NGUYÊN TẮC #1**: Bất kỳ trường nào có thể TÍNH TOÁN được từ dữ liệu hiện có → **KHÔNG BAO GIỜ** cho người dùng nhập tay.

> **NGUYÊN TẮC #2**: Bất kỳ trường nào phụ thuộc kết quả nghiệp vụ → **TỰ ĐỘNG CẬP NHẬT** khi nghiệp vụ phát sinh.

---

### 2.2 Bảng phân tích từng trường

#### ✅ TRƯỜNG TỰ ĐỘNG - KHÔNG CẦN NHẬP (nhưng đang bị bắt nhập)

| Trường | Bảng | Công thức/nguồn | Lỗi hiện tại |
|--------|------|-----------------|---------------|
| `current_occupancy_sqm` | warehouses | `SUM(current_occupancy_units of all bins)` hoặc `SUM(stock_levels.quantity_on_hand * product.dimension_sqm)` | Đang bắt nhập tay trong form Warehouse |
| `current_occupancy_units` | bin_locations | `SUM(stock_in_bins.quantity WHERE bin_id = this_bin)` | Đang bắt nhập tay trong form Bin Location |
| `quantity_available` | stock_levels | `quantity_on_hand - quantity_reserved` (đã dùng GENERATED STORED ✅) | Nhưng frontend vẫn cho nhập |
| `quantity_in_transit` | stock_levels | `SUM(quantity_received of all pending GRs)` | Đang bắt nhập tay |
| `quantity_reserved` | stock_levels | `SUM(quantity_ordered - quantity_delivered của các SO chưa deliver)` | Đang bắt nhập tay |
| `reorder_status` | stock_levels | `IF quantity_on_hand < reorder_level THEN 'understocked'...` | Đang bắt chọn select trong form |
| `profit_margin_percent` | products | `(list_price - cost_price) / list_price * 100` (đã dùng GENERATED STORED ✅) | OK - đúng |
| `outstanding_amount` | customer_invoices | `total_amount - paid_amount` (đã dùng GENERATED STORED ✅) | OK - đúng |
| `credit_used` | customers | `SUM(customer_invoices.total_amount - customer_invoices.paid_amount)` | Đang bắt nhập tay trong form Customer |
| `total_spent` | suppliers | `SUM(purchase_orders.total_amount WHERE status = received/paid)` | Đang bắt nhập tay trong form Supplier |
| `average_response_time_hours` | suppliers | `AVG(time between rfq sent → quotation received)` | Đang bắt nhập tay trong form Supplier |
| `quality_rating` | suppliers | `AVG(defect_rate_percent từ goods_receipts)` | Đang bắt nhập tay trong form Supplier |
| `total_amount` | quotations | `SUM(quotation_lines.line_total)` | Đang tự tính nhưng không save xuống DB |
| `total_cost` | sales_orders | `SUM(sales_order_lines.quantity_ordered * sales_order_lines.cost_price)` | Đang tự tính nhưng không save xuống DB |
| `quantity_delivered` | sales_order_lines | `SUM(delivery_order_lines.quantity_delivered WHERE so_line_id = this)` | Đang bắt nhập tay |
| `quantity_received` | purchase_order_lines | `SUM(goods_receipt_lines.quantity_received WHERE po_line_id = this)` | Đang bắt nhập tay |
| `received_amount` | purchase_orders | `SUM(quantity_received * unit_price của tất cả PO lines)` | Đang bắt nhập tay |
| `last_counted_at` | stock_levels | `MAX(inventory_adjustments.count_date WHERE product_id, warehouse_id)` | Đang bắt nhập tay |
| `last_adjusted_at` | stock_levels | `MAX(inventory_adjustments.approved_at WHERE product_id, warehouse_id)` | Đang bắt nhập tay |
| `total_quantity_sold` | product_sales_metrics | `SUM(sales_order_lines.quantity_ordered)` | Phải aggregate, không nhập tay |
| `on_time_delivery_percent` | supplier_metrics | `COUNT(GR.actual_delivery_date <= PO.required_delivery_date) / COUNT(GRs)` | Phải tính từ GR, không nhập tay |
| `defect_rate_percent` | supplier_metrics | `SUM(quantity_rejected) / SUM(quantity_received) * 100` | Phải tính từ GR, không nhập tay |

#### ⚠️ TRƯỜNG THỦ CÔNG NHƯNG CÓ RÀNG BUỘC NGHIỆP VỤ

| Trường | Bảng | Ràng buộc | Lỗi hiện tại |
|--------|------|-----------|---------------|
| `quantity_on_hand` | stock_levels | Không được < 0. Chỉ thay đổi qua GR, DO, Adjustment | Cho nhập tự do, không kiểm tra |
| `bin_code` | bin_locations | Phải UNIQUE trong warehouse. Cấu trúc: `ZoneCode-Rack-Row-Level` | Cho nhập tự do |
| `capacity_sqm` | warehouses | `>= current_occupancy_sqm` | Validation đã có ✅ |
| `capacity_units` | bin_locations | `>= current_occupancy_units` | Validation đã có ✅ |
| `credit_limit` | customers | `> 0`. Khi tạo SO, phải kiểm tra `credit_used <= credit_limit` | Đã có validation nghiệp vụ trong erpApi ✅ |
| `reorder_level` | products | `> 0`. Khi stock_levels.quantity_on_hand < reorder_level → alert | OK |
| `reorder_quantity` | products | `> 0` | OK |

---

## PHẦN 3: PHÂN TÍCH NGHIỆP VỤ CHI TIẾT TỪNG MODULE

### 3.1 Inventory Module - KHO VÀ TỒN KHO

#### Vấn đề nghiêm trọng #1: Warehouse Occupancy bị nhập tay

**Thực tế ERP chuẩn:**
```
warehouse.current_occupancy_sqm
  = SUM(bin_locations.current_occupancy_units of all bins in this warehouse)
  HOẶC
  = SUM(stock_in_bins.quantity * product.physical_size_sqm) của tất cả sản phẩm trong warehouse
```

**Thực tế đồ án này:**
- Form Warehouse cho phép nhập `current_occupancy_sqm` tùy ý
- Không có trigger tự động cập nhật khi bin location thay đổi
- Không có kết nối với stock_levels

**Hậu quả:**
- Người dùng nhập 100 sqm, nhưng thực tế kho chỉ chứa 50 sqm hàng
- Báo cáo occupancy hoàn toàn sai lệch
- Không có cảnh báo khi kho quá tải

**Giải pháp ERP chuyên nghiệp:**
```sql
-- Trigger 1: Khi thêm/sửa bin_location → cập nhật warehouse occupancy
CREATE OR REPLACE FUNCTION update_warehouse_occupancy()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE warehouses 
    SET current_occupancy_sqm = current_occupancy_sqm + NEW.capacity_units * (
      SELECT COALESCE(p.physical_size_sqm, 1) 
      FROM products p LIMIT 1
    )
    WHERE id = NEW.warehouse_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE warehouses 
    SET current_occupancy_sqm = current_occupancy_sqm 
      - OLD.capacity_units + NEW.capacity_units
    WHERE id = NEW.warehouse_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE warehouses 
    SET current_occupancy_sqm = current_occupancy_sqm - OLD.capacity_units
    WHERE id = OLD.warehouse_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

#### Vấn đề nghiêm trọng #2: Bin Location Occupancy bị nhập tay

**Thực tế ERP chuẩn:**
```
bin_locations.current_occupancy_units
  = SUM(stock_in_bins.quantity của tất cả sản phẩm trong bin này)
```

**Thực tế đồ án này:**
- Form Bin Location cho phép nhập `current_occupancy_units` tùy ý
- Bảng `stock_in_bins` lưu trữ sản phẩm TRONG bin, nhưng không có trigger cập nhật occupancy
- Người dùng có thể nhập "10 units" trong khi bin thực tế chứa 50 units

**Giải pháp:**
```sql
-- Trigger: Khi stock_in_bins thay đổi → cập nhật bin occupancy
CREATE OR REPLACE FUNCTION update_bin_occupancy()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bin_locations 
    SET current_occupancy_units = current_occupancy_units + NEW.quantity
    WHERE id = NEW.bin_location_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE bin_locations 
    SET current_occupancy_units = current_occupancy_units 
      - OLD.quantity + NEW.quantity
    WHERE id = NEW.bin_location_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bin_locations 
    SET current_occupancy_units = current_occupancy_units - OLD.quantity
    WHERE id = OLD.bin_location_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bin_occupancy
AFTER INSERT OR UPDATE OR DELETE ON stock_in_bins
FOR EACH ROW EXECUTE FUNCTION update_bin_occupancy();
```

#### Vấn đề nghiêm trọng #3: Stock Level - Người dùng không có cách nào phân bổ sản phẩm vào bin

**Thực tế ERP chuẩn:**
```
Người dùng KHÔNG nhập trực tiếp vào stock_levels
Mà quy trình như sau:

1. Nhập hàng (Goods Receipt) → chọn Warehouse + chọn Bin Location cụ thể
   → Hệ thống tự động:
     a. INSERT stock_in_bins (product + bin + quantity + batch_number)
     b. UPDATE stock_levels (quantity_on_hand += quantity)
     c. UPDATE bin_locations (current_occupancy_units += quantity)

2. Xuất hàng (Delivery Order) → chọn Warehouse + chọn Bin Location cụ thể để pick
   → Hệ thống tự động:
     a. UPDATE stock_in_bins (quantity -= quantity_picked)
     b. UPDATE stock_levels (quantity_on_hand -= quantity)
     c. UPDATE bin_locations (current_occupancy_units -= quantity)

3. Điều chuyển nội bộ (Internal Transfer)
   → FROM Bin A: stock_in_bins.quantity -= qty
   → TO Bin B: stock_in_bins.quantity += qty
```

**Thực tế đồ án này:**
- Form Stock Levels cho phép nhập trực tiếp `quantity_on_hand` mà không qua GR
- Không có chức năng "Nhập kho" (Goods Receipt) với việc chọn bin location
- Không có chức năng "Điều chuyển kho" (Stock Transfer)
- Form Goods Receipt có trong schema nhưng **KHÔNG có chức năng chọn bin location** khi nhập

**Giải pháp:**
- Form Goods Receipt phải có dòng nhập với: `product`, `quantity_received`, `bin_location_id`, `batch_number`
- Khi lưu GR → trigger tự động INSERT stock_in_bins và UPDATE stock_levels
- Form Delivery Order phải có dòng với `bin_location_id` để pick từ đúng vị trí

---

### 3.2 Customer Module - CÔNG NỢ VÀ TÍNH DỤNG

#### Vấn đề nghiêm trọng #4: credit_used bị nhập tay

**Thực tế ERP chuẩn:**
```
customers.credit_used = 
  SUM(customer_invoices.total_amount) 
  - SUM(customer_payments.amount)
  + SUM(credit_notes.total_amount)  
  - SUM(debit_notes.total_amount)
  
Ràng buộc nghiệp vụ:
  Khi tạo Sales Order:
    IF credit_used + new_so.total_amount > credit_limit THEN
      THROW ERROR: "Khách hàng vượt hạn mức tín dụng"
```

**Thực tế đồ án này:**
- Form Customer cho phép nhập `credit_used` tùy ý
- Khi tạo SO, có check trong `erpApi.ts` nhưng chỉ là warning, không throw error
- `credit_used` không được cập nhật tự động khi có invoice/payment

**Cần thêm trigger:**
```sql
-- Trigger: Khi tạo/cập nhật/xóa customer_invoice → cập nhật customers.credit_used
CREATE OR REPLACE FUNCTION update_customer_credit_used()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE customers 
    SET credit_used = credit_used + NEW.total_amount - COALESCE(NEW.paid_amount, 0)
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE customers 
    SET credit_used = credit_used 
      - OLD.total_amount + COALESCE(OLD.paid_amount, 0)
      + NEW.total_amount - COALESCE(NEW.paid_amount, 0)
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE customers 
    SET credit_used = credit_used - OLD.total_amount + COALESCE(OLD.paid_amount, 0)
    WHERE id = OLD.customer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_credit
AFTER INSERT OR UPDATE OR DELETE ON customer_invoices
FOR EACH ROW EXECUTE FUNCTION update_customer_credit_used();
```

---

### 3.3 Supplier Module - THEO DÕI HIỆU SUẤT

#### Vấn đề #5: total_spent, average_response_time_hours, quality_rating bị nhập tay

**Thực tế ERP chuẩn:**
```
suppliers.total_spent = 
  SUM(purchase_orders.total_amount WHERE status IN ('received', 'paid'))

suppliers.average_lead_time_days = 
  AVG(purchase_orders.actual_delivery_date - purchase_orders.order_date)

suppliers.quality_rating = 
  5 - (defect_rate_percent) 
  -- defect_rate = SUM(quantity_rejected) / SUM(quantity_received) * 100 từ goods_receipt_lines
```

**Thực tế đồ án này:**
- Form Supplier cho phép nhập 3 trường này tùy ý
- Không có trigger cập nhật tự động
- Metric supplier không chính xác

---

### 3.4 Sales Module - VẤN ĐỀ FLOW VÀ STOCK RESERVATION

#### Vấn đề #6: Khi tạo Sales Order → không tự động reserve stock

**Thực tế ERP chuẩn:**
```
Khi SO.status = 'confirmed':
  1. Với mỗi sales_order_line:
     UPDATE stock_levels
     SET quantity_reserved = quantity_reserved + quantity_ordered,
         quantity_available = quantity_on_hand - (quantity_reserved + quantity_ordered)
     WHERE product_id = line.product_id AND warehouse_id = DO.warehouse_id

  2. Kiểm tra: IF quantity_available < 0 THEN ALERT "Không đủ hàng"

Khi Delivery Order.status = 'shipped':
  1. UPDATE stock_levels
     SET quantity_on_hand = quantity_on_hand - quantity_delivered,
         quantity_reserved = quantity_reserved - quantity_delivered
     WHERE product_id = line.product_id

  2. INSERT stock_in_bins (negative adjustment) để track FIFO
```

**Thực tế đồ án này:**
- Trong `erpApi.ts` có kiểm tra stock khi tạo SO (chỉ là console.warn)
- Không có code UPDATE stock_levels khi SO được confirm
- Không có code UPDATE stock_levels khi DO được shipped/delivered

**Giải pháp cần thêm:**
```typescript
// Trong erpApi.ts, khi PUT /sales-orders với status = 'confirmed':
if (status === 'confirmed' && oldStatus !== 'confirmed') {
  // Reserve stock for each line
  for (const line of salesOrderLines) {
    await supabase.rpc('reserve_stock', {
      p_product_id: line.product_id,
      p_warehouse_id: warehouseId,
      p_quantity: line.quantity_ordered
    });
  }
}

// Tạo function trong Supabase:
// reserve_stock(product_id, warehouse_id, quantity)
```

---

### 3.5 Purchase Module - VẤN ĐỀ RFQ

#### Vấn đề #7: RFQ form thiếu hoàn toàn Suppliers và Products

**Thực tế đồ án này:**
- Form RFQ chỉ có 5 fields: rfqNumber, issuedDate, closingDate, totalEstimatedCost, notes
- KHÔNG có chỗ để chọn Suppliers để gửi RFQ
- KHÔNG có chỗ để liệt kê Products cần báo giá
- Không có bảng `rfq_lines` được nhập từ form
- Không có bảng `rfq_supplier_quotations` được tạo từ form

**Thực tế ERP chuẩn:**
```
RFQ Form phải có:
1. Header: RFQ number, issued date, closing date, notes
2. Lines table: product (select), quantity_required, required_delivery_date
3. Suppliers section: checkboxes để chọn suppliers nhận RFQ
4. Sau khi submit:
   - INSERT rfq_lines (từ lines table)
   - Với mỗi supplier được chọn: INSERT rfq_supplier_quotations (blank, chờ họ trả lời)
```

---

### 3.6 Accounting Module - VẤN ĐỀ ĐỐI TƯỢNG VÀ SỐ DƯ

#### Vấn đề #8: Đối tượng trong Payments không được xử lý đúng

**Thực tế ERP chuẩn:**
```
Khi tạo Customer Payment:
  1. INSERT customer_payments (amount, payment_method, etc.)
  2. UPDATE customer_invoices SET paid_amount += amount
     → Tự động cập nhật outstanding_amount
  3. UPDATE customers SET credit_used -= amount
     → Tự động cập nhật credit_used

Khi tạo Supplier Payment:
  1. INSERT supplier_payments (amount, payment_method, etc.)
  2. UPDATE vendor_bills SET paid_amount += amount
     → Tự động cập nhật outstanding_amount
```

**Thực tế đồ án này:**
- Form Payments có trong schema nhưng **KHÔNG có UI nhập liệu** cho Customer Payments và Supplier Payments
- Khi nhập Invoice/Bill, phải nhập `paidAmount` thủ công
- Không có chỗ nhập thanh toán riêng

---

## PHẦN 4: TỔNG HỢP CÁC LỖI KỸ THUẬT TRONG FRONTEND

### 4.1 Lỗi nghiêm trọng (Critical - Fix ngay)

| # | File | Dòng | Mô tả lỗi | Hậu quả |
|---|------|------|-----------|---------|
| 1 | `Inventory.tsx` | ~276 | `if (activeTab !== 'stock')` → Stock Level mới tạo KHÔNG gọi API POST | Dữ liệu tồn kho không lưu xuống DB |
| 2 | `Accounting.tsx` | ~320 | `customerOptions.find(c => c.label === record.customerName)` → Label format `"name (C001)"` nhưng so sánh với `"name"` thuần | customer_id = undefined → lưu sai customer |
| 3 | `Accounting.tsx` | ~320 | Tương tự cho `supplierOptions.find(s => s.label === record.supplierName)` | supplier_id = undefined → lưu sai supplier |
| 4 | `Accounting.tsx` | ~489-493 | Table hiển thị `record.invoice_number` nhưng normalize tạo `invoiceNumber` | Bang hien thi "undefined" |
| 5 | `Sales.tsx` | ~592-639 | Payload không có `quotation_number` hay `order_number` | Số báo giá/đơn hàng không được lưu |

### 4.2 Lỗi trung bình (Medium - Fix trong phase tiếp theo)

| # | File | Dòng | Mô tả lỗi |
|---|------|------|-----------|
| 6 | `MasterData.tsx` | ~220-226 | `bin.warehouseName` không tồn tại trong data → filter luôn trả về rỗng |
| 7 | `MasterData.tsx` | ~704 | `record.supplierTypeName` → undefined (nên dùng `supplierType`) |
| 8 | `MasterData.tsx` | ~364-382 | `supplier_type_id: ''` trong createRecord nhưng form field là `supplierType` |
| 9 | `Purchase.tsx` | ~330 | `record.date` không tồn tại → hiển thị undefined |
| 10 | `Purchase.tsx` | ~329 | `record.productName` không tồn tại → hiển thị undefined |
| 11 | `Purchase.tsx` | ~62-67 | `flow` object cho cả PO và RFQ nhưng 2 đối tượng có status flow khác nhau |
| 12 | `Dashboard.tsx` | ~84-86 | Low stock filter không bao gồm `critical` và `out_of_stock` |
| 13 | `Sales.tsx` | ~215-235 | `quotation_number` không được set khi openEdit có record |
| 14 | `Sales.tsx` | ~574 | `sales_person_name` được hiển thị nhưng không lưu |
| 15 | `Sales.tsx` | ~276 | `0 / 0` có thể xảy ra khi `estimated_profit / total_amount * 100` |

### 4.3 Lỗi nhỏ (Minor - Fix khi có thời gian)

| # | File | Mô tả |
|---|------|--------|
| 16 | Nhiều file | `record.date` không tồn tại → normalize không tạo field này |
| 17 | Nhiều file | Status flow mapping không đầy đủ cho tất cả tabs |
| 18 | Dashboard.tsx | Trend percentages là hardcoded, không tính từ dữ liệu thực |

---

## PHẦN 5: KẾ HOẠCH HÀNH ĐỘNG

### Phase 1: CRITICAL FIXES (Tuần 1-2)
**Mục tiêu: Hệ thống không crash, dữ liệu lưu đúng**

1. **Fix Stock Level Save**
   - Bỏ điều kiện `if (activeTab !== 'stock')` trong Inventory.tsx
   - Thêm API endpoint `/inventory/stock-levels` POST handler trong erpApi.ts
   - Cho phép tạo stock level mới qua form

2. **Fix Accounting Save**
   - Sửa label matching: thay vì `c.label === record.customerName`
   - Dùng: `c.value === record.customer_id` (đã có sẵn trong record)
   - Hoặc: parse label để lấy tên, không so sánh label thuần

3. **Fix Sales Save**
   - Thêm `quotation_number` và `order_number` vào payload
   - Đảm bảo khi openEdit, `quotation_number` được set vào form state

4. **Fix Accounting Table Display**
   - Sửa `record.invoice_number` → `record.invoiceNumber` trong Accounting.tsx
   - Áp dụng tương tự cho các bảng khác

### Phase 2: BUSINESS LOGIC FIXES (Tuần 3-4)
**Mục tiêu: Dữ liệu tự động được cập nhật đúng**

5. **Thêm Database Triggers**
   - Trigger cập nhật `bin_locations.current_occupancy_units` từ `stock_in_bins`
   - Trigger cập nhật `warehouses.current_occupancy_sqm` từ `bin_locations`
   - Trigger cập nhật `customers.credit_used` từ `customer_invoices`
   - Trigger cập nhật `suppliers.total_spent` từ `purchase_orders`
   - Trigger cập nhật `stock_levels.quantity_reserved` khi SO confirmed/shipped

6. **Xóa các trường không cần nhập khỏi form**
   - Form Warehouse: Xóa `current_occupancy_sqm` (tự tính)
   - Form Bin Location: Xóa `current_occupancy_units` (tự tính)
   - Form Customer: Xóa `credit_used` (tự tính)
   - Form Supplier: Xóa `total_spent`, `average_response_time_hours`, `quality_rating` (tự tính)
   - Form Stock Levels: Xóa `quantity_available`, `quantity_in_transit`, `quantity_reserved`, `reorder_status` (tự tính hoặc computed)

7. **Sửa RFQ Form**
   - Thêm bảng lines để nhập products + quantities
   - Thêm phần chọn suppliers để gửi RFQ
   - Lưu vào `rfq_lines` và tạo `rfq_supplier_quotations`

### Phase 3: ENHANCEMENTS (Tuần 5-6)
**Mục tiêu: Nghiệp vụ chuẩn ERP**

8. **Thêm Stock Transfer (Điều chuyển kho)**
   - Form mới: Internal Stock Transfer
   - Chọn: FROM Warehouse + FROM Bin → TO Warehouse + TO Bin
   - Tự động cập nhật stock_in_bins cho cả 2 bin

9. **Thêm Payment Entry UI**
   - Tách Payment Entry riêng (không nhập trong Invoice/Bill)
   - Khi lưu payment → tự động cập nhật Invoice.paid_amount và Customer.credit_used

10. **Thêm Stock Reservation Flow**
    - Khi SO.confirmed → tự động reserve stock
    - Khi DO.shipped → giải phóng reserved, trừ actual stock
    - Hiển thị `quantity_available` rõ ràng trong UI

### Phase 4: CLEANUP & POLISH (Tuần 7-8)
**Mục tiêu: Hệ thống ổn định, dễ bảo trì**

11. Xóa seed data không hợp lý
12. Thêm validation nghiệp vụ vào frontend
13. Viết lại PROJECT_SUMMARY.md với thông tin chính xác
14. Tạo migration script để dọn dẹp data lộn xộn hiện tại

---

## PHẦN 6: PRIORITIZED TODO LIST

### IMMEDIATE (Fix ngay - ưu tiên cao nhất)

```typescript
// TODO 1: Inventory.tsx - Stock save bug
// File: src/pages/Inventory.tsx, dòng ~276
// Xóa điều kiện: if (activeTab !== 'stock') 
// Thêm: erpApi.post('/inventory/stock-levels', ...)

// TODO 2: Accounting.tsx - Customer/Supplier lookup bug  
// File: src/pages/Accounting.tsx, dòng ~310-350
// Sửa: Thay vì tìm theo label, dùng record.customer_id trực tiếp

// TODO 3: Sales.tsx - Number field not saved
// File: src/pages/Sales.tsx, handleSave
// Thêm vào payload: quotation_number, sales_order_number

// TODO 4: Accounting.tsx - Table display wrong field
// File: src/pages/Accounting.tsx, dòng ~489-493
// Sửa: record.invoice_number → record.invoiceNumber
// Tương tự cho bill: record.bill_number → record.billNumber

// TODO 5: Purchase.tsx - RFQ form completely broken
// Cần viết lại RFQ form với Lines table và Supplier selection
```

---

## PHỤ LỤC: SEED DATA ĐÚNG vs SAI

### Seed data cần GIỮ (không có vấn đề):
- ✅ departments - tham chiếu
- ✅ units_of_measure - tham chiếu
- ✅ supplier_types - tham chiếu
- ✅ lead_stages - tham chiếu
- ✅ activity_types - tham chiếu
- ✅ payment_methods - tham chiếu
- ✅ accounts (Chart of Accounts) - tham chiếu
- ✅ carriers - tham chiếu
- ✅ company_settings - tham chiếu

### Seed data cần XÓA/SỬA:
- ❌ **warehouses** - KHÔNG nên seed với `current_occupancy_sqm` vì giá trị này phải tự tính
- ❌ **bin_locations** - KHÔNG nên seed với `current_occupancy_units` vì phải tự tính từ stock_in_bins
- ❌ **products** - Nên seed với stock ban đầu = 0, tạo stock qua Goods Receipt
- ❌ **suppliers** - KHÔNG nên seed với `total_spent`, `average_response_time_hours` vì phải tự tính

### Seed data cần THÊM:
- ⚠️ **stock_levels** - Nên seed với quantity_on_hand = 0 cho tất cả product × warehouse combinations
- ⚠️ **stock_in_bins** - Rỗng ban đầu, điền khi nhập kho
- ⚠️ **serial_numbers** - Rỗng ban đầu, điền khi nhập IoT devices

---

## KẾT LUẬN

Đồ án NovaTech ERP có **kiến trúc database tốt** nhưng **logic nghiệp vụ còn thiếu sót nghiêm trọng**. Vấn đề cốt lõi nằm ở:

1. **Tư duy nhập liệu sai**: Cứ tạo form rồi bắt nhập tất cả mọi thứ, thay vì để hệ thống tự tính
2. **Thiếu triggers/database logic**: Database chỉ lưu trữ, không có "trí tuệ" tự cập nhật
3. **Frontend = database form**: Không có business layer xử lý nghiệp vụ giữa form và database

**Ưu tiên hàng đầu**: Fix 5 lỗi critical → Hệ thống lưu được dữ liệu đúng → Rồi mới cải thiện nghiệp vụ tự động.

---

*Document này được tạo bởi ERP Consultant Agent - 2026-05-12*
*Phiên bản: 1.0*
*Trạng thái: Active - Cần triển khai theo kế hoạch Phase 1→4*
