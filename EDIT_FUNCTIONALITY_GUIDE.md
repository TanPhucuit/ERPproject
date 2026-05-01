# ERP Data Editing Guide - Chức Năng Chỉnh Sửa Dữ Liệu

## Overview / Tổng Quan

Complete data editing functionality has been implemented across all 5 ERP modules with comprehensive business rule constraints (Ràng buộc quy trình kinh doanh).

All edits are validated against business logic to prevent users from making incorrect changes that would violate business processes.

## Architecture / Kiến Trúc

### 1. Validation Service (`validationService.ts`)
- **Purpose**: Centralized business rule validation logic
- **Features**:
  - Field-level editability rules based on record status
  - Validation constraints for all data types
  - Status-based restrictions

### 2. Edit Modal Component (`EditModal.tsx`)
- **Purpose**: Reusable modal dialog for editing any data type
- **Features**:
  - Dynamic form field generation
  - Real-time field editability enforcement
  - Comprehensive error display
  - Loading states and success messages
  - Inline validation messages

### 3. Page Integration
Updated all 5 main pages with:
- Edit handlers (`handleEdit*`)
- Save handlers (`handleSave*`)
- Delete handlers (`handleDelete*`)
- Edit action buttons in tables

---

## Business Rules & Constraints / Ràng Buộc Quy Trình

### ACCOUNTING MODULE (Kế Toán)

#### Invoices (Hóa Đơn)
| Field | Editable When | Rules |
|-------|---------------|-------|
| `customer_id` | Draft/Pending | Cannot change once payment received |
| `invoice_date` | Draft/Pending | Cannot be future date |
| `due_date` | Draft/Pending, Partially Paid | Must be after invoice date |
| `tax_rate` | Draft/Pending | 0-100%, applied to line items |
| `discount_percent` | Draft/Pending | 0-100%, cannot exceed 100% |
| `notes` | All statuses except Cancelled | Always editable for documentation |
| **Status** | Locked by system | Updated only by payment/posting workflows |

**Status Workflow:**
- Draft → Pending (on finalization)
- Pending → Partially Paid (on receipt of payment)
- Partially Paid → Paid (on full payment)
- Any status → Overdue (after due date)
- Any status → Cancelled (with approval)

**Validation Rules:**
- Invoice date cannot be in the future
- Due date must be after invoice date
- Tax rate must be 0-100%
- Discount cannot exceed 100%
- Once paid, only notes can be edited

#### Bills (Hóa Đơn Nhập)
Similar restrictions as Invoices:
- Editable when Draft or Pending
- Non-editable when Paid or Cancelled
- Only notes editable for closed bills

---

### CRM MODULE (Quản Lý Khách Hàng)

#### Leads (Cơ Hội Kinh Doanh)
| Field | Editable When | Rules |
|-------|---------------|-------|
| `first_name` | Draft/Qualified/Negotiating | Not editable for Won/Lost |
| `last_name` | Draft/Qualified/Negotiating | Not editable for Won/Lost |
| `email` | All | Must be valid email format |
| `phone` | All | Must be valid phone number |
| `company` | All | Optional field |
| `estimated_value` | All | Must be ≥ 0 |
| `status` | All | Can progress: New → Qualified → Negotiating → Won/Lost |
| `internal_notes` | Won/Lost | Only field editable for closed deals |

**Status Rules:**
- New leads can be edited fully
- Qualified and Negotiating leads can be edited
- Won and Lost deals are read-only except for notes
- Cannot revert from Won/Lost back to earlier stages

**Validation Rules:**
- Email must be valid format (RFC 5322)
- Phone must contain only digits, spaces, dashes, +
- First name required
- Estimated value cannot be negative
- Follow-up date must be in future

---

### PURCHASE MODULE (Mua Hàng)

#### Purchase Orders (Đơn Đặt Hàng)
| Field | Editable When | Rules |
|-------|---------------|-------|
| `supplier_id` | Draft only | Locked once confirmed |
| `po_date` | Draft/Confirmed | Cannot be future date |
| `expected_delivery_date` | Draft/Confirmed | Must be after PO date |
| `delivery_address` | Draft/Confirmed/In Transit | Editable until shipped |
| `payment_terms` | Draft/Confirmed | Standard terms (Net 30, etc.) |
| `tax_rate` | Draft only | 0-100% |
| `shipping_cost` | Draft only | Cannot be negative |
| `notes` | All except Cancelled | Always editable |

**Status Rules:**
- Draft: All fields editable
- Confirmed: Limited fields (address, terms, notes)
- In Transit: Only notes and delivery estimate
- Received: Read-only except notes
- Cancelled: Read-only

**Validation Rules:**
- PO date cannot be future
- Due date must be after PO date
- Supplier required
- Tax rate 0-100%
- Shipping cost ≥ 0

#### RFQs (Request for Quotation)
| Field | Editable When | Rules |
|-------|---------------|-------|
| `due_date` | Open only | Must be future date |
| `required_quantity` | Open only | Must be > 0 |
| `target_price` | Open only | Must be > 0 |
| `notes` | Open only | Editable until close |

**Status Rules:**
- Draft/Open: All fields editable
- Awarded/Cancelled: Read-only

---

### INVENTORY MODULE (Kho)

#### Goods Receipt (Nhập Kho)
| Field | Editable When | Rules |
|-------|---------------|-------|
| `warehouse_id` | Draft/Pending | Locked on completion |
| `expected_date` | Draft/Pending | Must be future date |
| `notes` | All except Cancelled | Always editable |

**Status Rules:**
- Draft/Pending: Most fields editable
- Completed/Cancelled: Read-only except notes

#### Delivery Orders (Lệnh Xuất Hàng)
| Field | Editable When | Rules |
|-------|---------------|-------|
| `customer_id` | Draft only | Locked once picked |
| `warehouse_id` | Draft only | Locked once picked |
| `delivery_address` | Draft/In Transit | Editable until shipped |
| `expected_delivery` | Draft/In Transit | Must be future date |

**Status Rules:**
- Draft: All fields editable
- In Transit: Address and date only
- Completed: Read-only

#### Inventory Adjustments (Điều Chỉnh Kho)
| Field | Editable When | Rules |
|-------|---------------|-------|
| `warehouse_id` | Draft only | Locked on post |
| `reason` | Draft only | Required field |
| `notes` | All | Always editable |

**Status Rules:**
- Draft: All fields editable
- Posted: Read-only

---

### WAREHOUSE MODULE (Quản Lý Kho)

#### Bin Locations (Vị Trí Kho)
Fully editable for all fields:
- `bin_name` - Location identifier
- `warehouse_id` - Parent warehouse
- `aisle`, `rack`, `level` - Physical location coordinates
- `max_capacity` - Storage limit
- `status` - Active/Inactive

#### Putaway Tasks (Nhiệm vụ Lưu Kho)
| Field | Editable When | Rules |
|-------|---------------|-------|
| `assigned_to` | Unassigned/Assigned | Locked when being executed |
| `bin_location_id` | Assigned/In Progress | Editable until completion |
| `priority` | Unassigned only | Normal/High/Urgent |

#### Picking Tasks (Nhiệm vụ Chọn Hàng)
| Field | Editable When | Rules |
|-------|---------------|-------|
| `assigned_to` | Unassigned/Assigned | Locked during execution |
| `quantity_to_pick` | Assigned only | Must be > 0 |
| `priority` | Unassigned only | |

#### Stock Transfers
| Field | Editable When | Rules |
|-------|---------------|-------|
| `from_warehouse_id` | Draft only | Cannot equal `to_warehouse_id` |
| `to_warehouse_id` | Draft only | Cannot equal `from_warehouse_id` |
| `product_id` | Draft only | Locked once confirmed |
| `quantity` | Draft only | Must be > 0 |
| `notes` | All | Always editable |

**Validation:**
- Source and destination warehouses must be different
- Quantity must be positive
- Expected receipt date must be future date

---

## Page-by-Page Implementation / Triển Khai theo Trang

### 1. Accounting.tsx (Kế Toán)
**Added Features:**
- Edit button on each invoice row
- PDF export button (previously implemented)
- Delete button with confirmation
- Edit Modal for invoices with fields:
  - Invoice number (disabled)
  - Customer (editable based on status)
  - Invoice & Due dates
  - Tax rate & Discount
  - Payment terms
  - Notes
- Payment editing capability
- Payment method selection dropdown

**Constraints Applied:**
- Paid invoices: only notes editable
- Pending invoices: all fields except number editable

### 2. CRM.tsx (Quản Lý Khách Hàng)
**Added Features:**
- Edit button on each lead row
- Delete button with confirmation
- Lead status progression (New → Qualified → Negotiating → Won/Lost)
- Edit Modal with fields:
  - First/Last name
  - Email (with validation)
  - Phone (with format validation)
  - Company & Job title
  - Lead source dropdown (Website, Referral, etc.)
  - Estimated value
  - Status selector
  - Next follow-up date (future only)
  - Internal notes

**Constraints Applied:**
- Won/Lost leads: read-only except notes
- Email must be valid format
- Follow-up date must be future

### 3. Purchase.tsx (Mua Hàng)
**Added Features:**
- Edit button on each PO row
- Delete button with confirmation
- Edit Modal for Purchase Orders with fields:
  - PO number (disabled/read-only)
  - Supplier selection
  - PO date & Expected delivery date
  - Delivery address (textarea)
  - Payment terms
  - Tax rate & Shipping cost
  - General notes

**Constraints Applied:**
- Received POs: read-only
- PO date cannot be future
- Dates must be in proper sequence

### 4. Inventory.tsx (Kho)
**Added Features:**
- Edit button on each inventory item row
- Delete button with confirmation
- Edit Modal for adjustments with fields:
  - Warehouse selection
  - Product (disabled)
  - Quantity on hand
  - Adjustment reason dropdown (Physical count, Damaged, Loss, Correction, Return)
  - Adjustment notes

**Constraints Applied:**
- Products cannot be changed on existing records
- Reason is required field
- Completed adjustments read-only

### 5. Dashboard.tsx
- Read-only view (metrics display)
- No editing required (aggregated data)

---

## Field Editability Rules / Quy Tắc Chỉnh Sửa Trường

### Global Rules (Áp dụng toàn bộ)
1. **Status Fields**: Read-only, controlled by system workflows only
2. **ID Fields**: Always read-only
3. **Timestamps** (created_at, updated_at): Always read-only
4. **Notes/Comments**: Usually always editable (audit trail)
5. **Amount Fields**: Editable only in draft/pending states

### Validation Workflow
```
User clicks Edit → Modal opens → Form displayed with:
  ✓ Editable fields: Normal input/select
  ✗ Non-editable fields: Grayed out with explanation
  → User makes changes → Validation runs:
    1. Required field check
    2. Format validation (email, phone, date)
    3. Business rule validation
  → If valid: Save button enabled
  → If invalid: Error messages shown
  → Save triggered → API call → Confirmation → Modal closes
```

---

## Error Messages & Feedback / Thông Điệp Lỗi

### Validation Error Messages
- "First name is required"
- "Valid email address is required"
- "Phone number format is invalid"
- "Invoice date cannot be in the future"
- "Due date must be after invoice date"
- "Tax rate must be between 0-100%"
- "Discount cannot exceed 100%"
- "Following date cannot be in the past"
- "Estimated value cannot be negative"
- "Source and destination warehouses must be different"

### UI Feedback
- **Invalid fields**: Red border + error message below
- **Non-editable fields**: Grayed background + italic explanation
- **Saving state**: Disabled button + "Saving..." text
- **Success**: Green checkmark + "Record updated successfully!"
- **Error**: Red alert box with specific error details

---

## Database API Integration

### API Methods Required
For each module, the following API methods ensure edit functionality works:

**Accounting:**
- `updateInvoice(id, data)` - Update invoice
- `updatePayment(id, data)` - Update payment

**CRM:**
- `updateLead(id, data)` - Update lead info

**Purchase:**
- `updatePurchaseOrder(id, data)` - Update PO

**Inventory:**
- `createAdjustment(data)` - New adjustment
- `postAdjustment(id)` - Finalize adjustment

---

## Usage Examples / Ví Dụ Sử Dụng

### Example 1: Editing an Invoice
```
1. User clicks Edit button on invoice row
2. Modal opens showing Invoice Details
3. Fields displayed (status-based):
   - Draft invoice: All fields editable
   - Paid invoice: Only notes editable
4. User changes "Due Date" from 2024-04-15 to 2024-04-30
5. System validates: Due date > Invoice date ✓
6. User clicks Save
7. API call updates invoice
8. Modal closes, table refreshes with new data
9. Success message displayed
```

### Example 2: Editing a Lead with Constraints
```
1. User views Won lead (closed deal)
2. Clicks Edit button
3. Modal opens - but ALL fields except "Internal Notes" are disabled
4. User can only edit notes: "Contract signed, ready for onboarding"
5. Trying to change Lead Stage shows: "Cannot change status for closed deals"
6. User can save notes-only changes
7. Other fields remain untouched
```

### Example 3: Rejected Edit (Business Rule Violation)
```
1. User editing invoice tax rate
2. Enters "150" (150%)
3. On save, validation error: "Tax rate must be between 0-100%"
4. Error message appears in red box
5. User corrects to "10"
6. Validation passes
7. Save successful
```

---

## Testing Checklist / Danh Sách Kiểm Tra

For each module test:
- [ ] Edit button appears on all editable records
- [ ] Modal opens with correct title and fields
- [ ] Non-editable fields are grayed out
- [ ] Inline help text explains why field disabled
- [ ] Form validation works for required fields
- [ ] Date validations work (future/past correctly)
- [ ] Email validation works
- [ ] Number range validations work
- [ ] Save successfully updates record
- [ ] Delete with confirmation works
- [ ] Success message appears
- [ ] Modal closes after successful save
- [ ] Error messages display properly
- [ ] Can cancel edit without saving

---

## Summary / Tóm Tắt

✅ **Complete edit functionality** for all 5 ERP modules
✅ **Business rule enforcement** on all editable fields
✅ **Status-based constraints** prevent invalid state transitions
✅ **Comprehensive validation** on all field types
✅ **User-friendly error messages** in Vietnamese/English
✅ **Smooth UX** with loading states and confirmations
✅ **Reusable modal component** for consistency

**All changes follow business process rules to ensure data integrity.**
