# Scenario-Based Workflow Architecture

## Vấn đề

Trong ERP system, dữ liệu có **tính kế thừa** rõ ràng:
```
Customer → Quotation → Sales Order → Invoice → Accounting
```

**Rủi ro khi chia theo "Object" (Đối tượng):**
- 4 thành viên nhập 250 Customers riêng biệt
- 25 Quotations không liên kết rõ với Customer
- Sales Order của Thành viên A chọn nhầm Customer của Thành viên B
- **Kết quả:** Dữ liệu rời rạc, khó quản lý công nợ, báo cáo không chính xác

## Giải Pháp: Scenario-Based Architecture

Thay vì chia **theo object**, chúng ta chia **theo scenario (kịch bản)**.

Mỗi scenario là một **kịch bản hoàn chỉnh** có:
- Tập Customer cố định
- Quotations liên kết với Customer
- Sales Orders liên kết với Quotation
- Invoices liên kết với Sales Order

### 4 Scenarios Có Sẵn

#### **Scenario 1: High-Tech Manufacturing**
**Thành viên:** Quản lý doanh số  
**Họat động:** Cố vấn cho công ty sản xuất vi xử lý
- **Customers:**
  - Advanced Electronics Vietnam (5B credit limit)
  - Tech Solutions JSC (3B credit limit)
- **Quotations:**
  - QT-S1-001: Microprocessor 5000 units → 450M VNĐ
  - QT-S1-002: Memory module 2000 units → 280M VNĐ
- **Sales Orders:**
  - ORD-S1-001: Confirmed (từ QT-S1-001)
- **Invoices:**
  - INV-S1-001: Pending (từ ORD-S1-001)

#### **Scenario 2: Import-Export**
**Thành viên:** Quản lý xuất nhập khẩu  
**Họat động:** Chuỗi cung ứng hàng dệt may
- **Customers:**
  - Global Trading Partners (2B credit limit)
  - Regional Distribution Network (1.5B credit limit)
- **Quotations:**
  - QT-S2-001: Textile bulk (cotton & synthetic) → 750M VNĐ
- **Sales Orders:**
  - ORD-S2-001: Pending (pending shipment)
- **Invoices:**
  - INV-S2-001: Draft

#### **Scenario 3: Professional Services**
**Thành viên:** Quản lý dự án IT  
**Họat động:** Công ty tư vấn phần mềm
- **Customers:**
  - Financial Innovation Labs (3.5B credit limit)
  - Healthcare Systems International (2.5B credit limit)
- **Quotations:**
  - QT-S3-001: Blockchain payment system (120 person-days) → **WON** 1.2B VNĐ
- **Sales Orders:**
  - ORD-S3-001: **COMPLETED**
- **Invoices:**
  - INV-S3-001: **PAID** (50% milestone)
  - INV-S3-002: Pending (50% completion)

#### **Scenario 4: Retail & Distribution**
**Thành viên:** Quản lý bán lẻ  
**Họat động:** Chuỗi siêu thị và tiệm tạp hóa
- **Customers:**
  - Metro Retail Chain (8B credit limit)
  - Convenience Store Franchise (2B credit limit)
- **Quotations:**
  - QT-S4-001: FMCG weekly supply → 2.5B VNĐ
- **Sales Orders:**
  - ORD-S4-001: **DISPATCHED** (đang giao)
  - ORD-S4-002: Confirmed
- **Invoices:**
  - INV-S4-001: Partially paid
  - INV-S4-002: Pending

## Cách Sử Dụng

### 1. Chọn Scenario
Trên **MainLayout header**, tìm nút **"Scenario"** (icon ⚙️)

```
Scenario Selector Menu:
┌─ High-Tech Manufacturing ← Thành viên 1
├─ Import-Export ← Thành viên 2
├─ Professional Services ← Thành viên 3
└─ Retail & Distribution ← Thành viên 4
```

### 2. Dữ Liệu Tự Động Cập Nhật
Khi chọn scenario, **tất cả dữ liệu trong app** sẽ hiển thị của scenario đó:
- Customers → Chỉ hiển thị customers của scenario
- Quotations → Chỉ quotations liên kết với customers đó
- Sales Orders → Chỉ orders từ quotations đó
- Invoices → Chỉ invoices từ sales orders đó

### 3. Mỗi Thành Viên Có Môi Trường Riêng
```
Thành viên A (Scenario 1)
├─ Customers: Advanced Electronics, Tech Solutions
├─ Quotations: QT-S1-001, QT-S1-002
├─ Sales Orders: ORD-S1-001
└─ Invoices: INV-S1-001

Thành viên B (Scenario 2)
├─ Customers: Global Trading, Regional Distribution
├─ Quotations: QT-S2-001
├─ Sales Orders: ORD-S2-001
└─ Invoices: INV-S2-001

[Không xung đột, dữ liệu riêng biệt]
```

## Lợi Ích

### ✅ Dữ Liệu Không Bị Rời Rạc
- Mỗi workflow hoàn chỉnh từ Customer → Invoice
- Không có Customer mồ côi
- Không có Sales Order không có Quotation

### ✅ Dễ Audit & Tracking
- Công nợ theo scenario rõ ràng
- Báo cáo Revenue chính xác
- KPI phụ thuộc scenario dễ tính toán

### ✅ Test Toàn Bộ Workflow
Scenario 3 đã hoàn thành từ Quotation → Paid Invoice:
- Test quy trình "Won" quotation
- Test partial payment (50% milestone)
- Test Invoice status lifecycle

### ✅ Quản Lý Phân Công Rõ Ràng
```
Scenario 1 (High-Tech) → Người A
Scenario 2 (Import-Export) → Người B
Scenario 3 (Services) → Người C
Scenario 4 (Retail) → Người D
```

## Kỹ Thuật: Cấu Trúc Dữ Liệu

### ScenarioData Interface
```typescript
interface ScenarioData {
  id: string                    // 'scenario-1', 'scenario-2', etc.
  name: string                  // 'High-Tech Manufacturing'
  description: string
  customers: Customer[]         // Customer pool của scenario
  quotations: Quotation[]       // Quotations của scenario
  salesOrders: SalesOrder[]     // Sales Orders của scenario
  invoices: Invoice[]           // Invoices của scenario
  teamMember: string            // Người phụ trách
}
```

### Zustand Store
```typescript
interface ScenarioStore {
  currentScenario: string       // ID của scenario hiện tại
  setScenario: (id: string) => void
}
```

### Hook Usage
```typescript
// Lấy scenario hiện tại
const { currentScenario, setScenario } = useScenarioStore()

// Lấy mock data theo scenario
const { mockLeads, mockQuotations, mockSalesOrders, mockInvoices } = useScenarioMockData()

// Hoặc dùng helper functions
const customers = getScenarioBasedCustomers()
const quotations = getScenarioBasedQuotations()
```

## Testing & Development

### Verify Scenario Data Integrity
```bash
# Check consistency: quotations.customerId exists in customers
✓ QT-S1-001.customerId = 'cust-s1-001' (exists in customers)
✓ ORD-S1-001.quotationId = 'quote-s1-001' (exists in quotations)
✓ INV-S1-001.salesOrderId = 'so-s1-001' (exists in salesOrders)
```

### Future Enhancements
- [ ] Backend scenario isolation (database sharding)
- [ ] Multi-user scenario locking
- [ ] Scenario-specific KPIs & dashboards
- [ ] Scenario merge/consolidation workflows
- [ ] Scenario versioning & rollback

## Troubleshooting

### "Dữ liệu biến mất khi chuyển scenario"
**→** Bình thường! Mỗi scenario có dữ liệu riêng. Chuyển lại scenario để thấy dữ liệu.

### "Muốn copy data từ scenario này sang scenario khác?"
**→** Không hỗ trợ. Mỗi scenario độc lập. Thêm dữ liệu mới vào scenario mục tiêu.

### "Muốn tạo scenario mới?"
**→** Add vào `src/services/scenarioData.ts`, theo format của SCENARIO_1-4.

---

**Last Updated:** April 18, 2026  
**Version:** 1.0 - Scenario Architecture v1
