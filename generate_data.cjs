/**
 * NovaTech ERP - Demo Data Generator (Fixed)
 * Run: node generate_data.cjs
 *
 * USAGE NOTES:
 * - Migration script (migration_v2_fixed.sql) seeds the initial database with
 *   the same master data. CSVs here serve as a secondary import / re-sync source.
 * - All IDs are UUIDs (not integers) to match the PostgreSQL schema.
 * - Auto-calculated columns (profit_margin_percent, current_occupancy_sqm,
 *   total_amount, estimated_profit, credit_used, quality_rating, etc.) are
 *   EXCLUDED from CSV — the database triggers will calculate them.
 * - Fields not in the schema (is_deleted) are excluded.
 *
 * MASTER DATA EXPORTED:
 *   departments, units_of_measure, supplier_types, lead_stages, activity_types,
 *   accounts, users, product_categories, products, warehouses, warehouse_zones,
 *   bin_locations, customers, suppliers, carriers
 *
 * NOTE: Transaction tables (quotations, sales_orders, purchase_orders,
 * invoices, bills, etc.) have complex FK dependencies on UUIDs from master
 * data and are NOT generated here. They are created through the app UI
 * or via SQL seed in migration_v2_fixed.sql.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURATION
// ============================================================
const OUTPUT_DIR = path.join(__dirname, 'generated_data');

// ============================================================
// UTILITIES
// ============================================================
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const randomElement = arr => arr[Math.floor(Math.random() * arr.length)];
const uuid = () => crypto.randomUUID();

const randomDate = (start, end) => {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s)).toISOString().slice(0, 10);
};

const randomDateTime = () => {
  const d = randomDate('2024-01-01', new Date().toISOString().slice(0, 10));
  return `${d}T${String(randomInt(0,23)).padStart(2,'0')}:${String(randomInt(0,59)).padStart(2,'0')}:${String(randomInt(0,59)).padStart(2,'0')}`;
};

// ============================================================
// DATA TRACKING (IDs = UUIDs)
// ============================================================
const refs = {
  departmentIds: [],
  uomIds: [],
  supplierTypeIds: [],
  leadStageIds: [],
  activityTypeIds: [],
  accountIds: [],
  userIds: [],
  categoryIds: [],       // parent categories first, then children
  productIds: [],
  warehouseIds: [],
  zoneIds: [],
  binIds: [],
  customerIds: [],
  supplierIds: [],
  carrierIds: [],
};

// ============================================================
// DATA SOURCES
// ============================================================
const vietnameseCities = [
  'TP. Ho Chi Minh', 'Ha Noi', 'Da Nang', 'Can Tho', 'Hai Phong',
  'Bien Hoa', 'Nha Trang', 'Can Gio', 'Vung Tau', 'Hue',
];
const districts = {
  'TP. Ho Chi Minh': ['Quan 1', 'Quan 3', 'Quan 5', 'Quan 7', 'Quan 9', 'Binh Thanh', 'Phu Nhuan', 'Thu Duc', 'Tan Binh'],
  'Ha Noi': ['Hoan Kiem', 'Hai Ba Trung', 'Ba Dinh', 'Dong Da', 'Cau Giay', 'Thanh Xuan'],
  'Da Nang': ['Hai Chau', 'Thanh Khe', 'Son Tra', 'Ngu Hanh Son', 'Lien Chieu'],
  'Can Tho': ['Ninh Kieu', 'Binh Thuy', 'Cai Rang', 'O Mon'],
  'Hai Phong': ['Hong Bang', 'Le Chan', 'Ngo Quyen', 'Kien An'],
  'Bien Hoa': ['Bien Hoa 1', 'Bien Hoa 2', 'Long Binh', 'Tam Hiep'],
  'Nha Trang': ['Nha Trang City', 'Cam Lam', 'Vinh Hoa', 'Ninh Hoa'],
  'Can Gio': ['Can Gio Town', 'Binh Chau', 'Long Hoa', 'Tan Phu'],
  'Vung Tau': ['Vung Tau City', 'Long Dien', 'Xuyen Moc', 'Con Dao'],
  'Hue': ['Hue City', 'Huong Tra', 'Huong Thuy', 'Phong Dien'],
};
const paymentTerms = ['NET30', 'NET45', 'NET60', 'COD', 'Prepaid'];
const userRoles = ['CEO', 'Sales_Manager', 'Purchasing_Manager', 'Warehouse_Manager', 'Accountant', 'Admin', 'user'];
const productStatuses = ['active', 'active', 'active', 'discontinued', 'prototype'];
const supplierStatuses = ['active', 'active', 'active', 'inactive', 'blocked'];
const customerStatuses = ['active', 'active', 'active', 'inactive', 'blocked'];
const binStatuses = ['active', 'active', 'maintenance'];
const leadSources = ['website', 'referral', 'showroom', 'architect', 'cold_call', 'social_media', 'auto_request'];
const leadRatings = ['hot', 'warm', 'cold'];

const generatePhone = () => {
  const prefixes = ['090', '091', '092', '093', '094', '095', '096', '097', '098', '099'];
  return randomElement(prefixes) + randomInt(1000000, 9999999);
};

const generateTaxId = () => String(randomInt(1000000000, 9999999999));

const generateAddress = (city) => {
  const num = randomInt(1, 999);
  const streets = ['Nguyen Hue', 'Le Duan', 'Dien Bien Phu', 'Nam Ky Khoi Nghia', 'Tran Hung Dao', 'Le Lai', 'Nguyen Tri Phuong'];
  const dist = districts[city] ? randomElement(districts[city]) : 'Quan 1';
  return `${num} ${randomElement(streets)} St., ${dist}, ${city}`;
};

const generateCompanyName = () => {
  const prefixes = ['NovaTech', 'SmartHome', 'Future', 'Prime', 'Elite', 'Pro', 'Advanced', 'Digital', 'Modern', 'Global', 'Tech', 'Viet'];
  const names = ['Solutions', 'Systems', 'Industries', 'Group', 'Corp', 'Enterprises', 'Technologies', 'Services', 'Vietnam'];
  const suffix = randomElement(['', ' JSC', ' Co.', ' Ltd.']);
  return `${randomElement(prefixes)} ${randomElement(names)}${suffix}`;
};

const generateCustomerName = () => {
  const firsts = ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vu', 'Do', 'Dang', 'Bui', 'Ngo'];
  const mids   = ['Thi', 'Van', 'Thi', 'Van', 'Thi'];
  const lasts  = ['Mai', 'Lan', 'Hung', 'Minh', 'Anh', 'Tuan', 'Hue', 'Khanh', 'Linh', 'Dat'];
  return `${randomElement(firsts)} ${randomElement(mids)} ${randomElement(lasts)}`;
};

// ============================================================
// SAVE CSV HELPER
// ============================================================
const saveCSV = (filename, rows) => {
  if (!rows || rows.length === 0) return;
  const filepath = path.join(OUTPUT_DIR, filename);
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.map(h => `"${h}"`).join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  fs.writeFileSync(filepath, '\ufeff' + lines.join('\n'), 'utf-8');
  console.log(`  -> ${filename}: ${rows.length} records`);
};

// ============================================================
// GENERATORS — Reference tables (Tier 0)
// ============================================================

const generateDepartments = () => {
  console.log('Generating departments...');
  const rows = [
    { id: uuid(), name: 'Ban Giam Doc', description: 'CEO va Ban Dieu hanh' },
    { id: uuid(), name: 'Kinh Doanh', description: 'Phong Kinh Doanh & Marketing' },
    { id: uuid(), name: 'Mua Hang', description: 'Phong Procurement' },
    { id: uuid(), name: 'Kho Van', description: 'Phong Kho & Logistics' },
    { id: uuid(), name: 'Ke Toan', description: 'Phong Ke Toan Tai Chinh' },
  ];
  rows.forEach(r => refs.departmentIds.push(r.id));
  saveCSV('departments.csv', rows);
  return rows;
};

const generateUnitsOfMeasure = () => {
  console.log('Generating units of measure...');
  const rows = [
    { id: uuid(), name: 'Cai', code: 'pcs' },
    { id: uuid(), name: 'Bo', code: 'set' },
    { id: uuid(), name: 'Met', code: 'm' },
    { id: uuid(), name: 'Kg', code: 'kg' },
    { id: uuid(), name: 'Lit', code: 'l' },
    { id: uuid(), name: 'Thung', code: 'box' },
    { id: uuid(), name: 'Cuon', code: 'roll' },
  ];
  rows.forEach(r => refs.uomIds.push(r.id));
  saveCSV('units_of_measure.csv', rows);
  return rows;
};

const generateSupplierTypes = () => {
  console.log('Generating supplier types...');
  const rows = [
    { id: uuid(), name: 'Equipment & Product Suppliers', description: 'Nha cung cap thiet bi va san pham' },
    { id: uuid(), name: 'Component & Part Suppliers', description: 'Nha cung cap linh kien va phu tung' },
    { id: uuid(), name: 'Logistics & Transportation', description: 'Don vi van chuyen va logistics' },
    { id: uuid(), name: 'Service Providers', description: 'Nha cung cap dich vu' },
    { id: uuid(), name: 'Maintenance & Repair Services', description: 'Dich vu bao tri va sua chua' },
  ];
  rows.forEach(r => refs.supplierTypeIds.push(r.id));
  saveCSV('supplier_types.csv', rows);
  return rows;
};

const generateLeadStages = () => {
  console.log('Generating lead stages...');
  const rows = [
    { id: uuid(), name: 'new', display_name: 'Moi tiep nhan', probability_percent: 10, is_won: false, is_lost: false, sequence: 1 },
    { id: uuid(), name: 'site_survey', display_name: 'Khao sat cong trinh', probability_percent: 30, is_won: false, is_lost: false, sequence: 2 },
    { id: uuid(), name: 'proposition', display_name: 'Bao gia', probability_percent: 60, is_won: false, is_lost: false, sequence: 3 },
    { id: uuid(), name: 'won', display_name: 'Da ky hop dong', probability_percent: 100, is_won: true, is_lost: false, sequence: 4 },
    { id: uuid(), name: 'lost', display_name: 'Mat khach', probability_percent: 0, is_won: false, is_lost: true, sequence: 5 },
  ];
  rows.forEach(r => refs.leadStageIds.push(r.id));
  saveCSV('lead_stages.csv', rows);
  return rows;
};

const generateActivityTypes = () => {
  console.log('Generating activity types...');
  const rows = [
    { id: uuid(), name: 'Call', icon: 'phone', color: 'blue' },
    { id: uuid(), name: 'Email', icon: 'mail', color: 'green' },
    { id: uuid(), name: 'Meeting', icon: 'users', color: 'purple' },
    { id: uuid(), name: 'Site Visit', icon: 'map-pin', color: 'orange' },
    { id: uuid(), name: 'Quote Sent', icon: 'file-text', color: 'teal' },
  ];
  rows.forEach(r => refs.activityTypeIds.push(r.id));
  saveCSV('activity_types.csv', rows);
  return rows;
};

const generateAccounts = () => {
  console.log('Generating accounts...');
  const rows = [
    { id: uuid(), account_code: '1000', account_name: 'Tien mat', account_type: 'asset', parent_id: null },
    { id: uuid(), account_code: '1100', account_name: 'Ngan hang', account_type: 'asset', parent_id: null },
    { id: uuid(), account_code: '1200', account_name: 'Phai thu khach hang', account_type: 'asset', parent_id: null },
    { id: uuid(), account_code: '1300', account_name: 'Hang ton kho', account_type: 'asset', parent_id: null },
    { id: uuid(), account_code: '1400', account_name: 'Tai san co dinh', account_type: 'asset', parent_id: null },
    { id: uuid(), account_code: '2000', account_name: 'Phai tra nguoi ban', account_type: 'liability', parent_id: null },
    { id: uuid(), account_code: '2100', account_name: 'Vay ngan han', account_type: 'liability', parent_id: null },
    { id: uuid(), account_code: '2200', account_name: 'Thue phai nop', account_type: 'liability', parent_id: null },
    { id: uuid(), account_code: '3000', account_name: 'Von gop', account_type: 'equity', parent_id: null },
    { id: uuid(), account_code: '3100', account_name: 'Loi nhuan chua phan phoi', account_type: 'equity', parent_id: null },
    { id: uuid(), account_code: '4000', account_name: 'Doanh thu ban hang', account_type: 'revenue', parent_id: null },
    { id: uuid(), account_code: '4100', account_name: 'Doanh thu dich vu', account_type: 'revenue', parent_id: null },
    { id: uuid(), account_code: '5000', account_name: 'Gia von hang ban', account_type: 'expense', parent_id: null },
    { id: uuid(), account_code: '5100', account_name: 'Chi phi ban hang', account_type: 'expense', parent_id: null },
    { id: uuid(), account_code: '5200', account_name: 'Chi phi quan ly', account_type: 'expense', parent_id: null },
  ];
  rows.forEach(r => refs.accountIds.push(r.id));
  saveCSV('accounts.csv', rows);
  return rows;
};

// ============================================================
// GENERATORS — Master data (Tier 1)
// ============================================================

const generateUsers = () => {
  console.log('Generating users...');
  const rows = [
    { id: uuid(), email: 'admin@novatech.vn', password_hash: '123456', full_name: 'Nguyen Van Admin', phone: '0901234567', department_id: refs.departmentIds[0], role: 'CEO', status: 'active' },
    { id: uuid(), email: 'sales@novatech.vn', password_hash: '123456', full_name: 'Tran Thi Sales', phone: '0901234568', department_id: refs.departmentIds[1], role: 'Sales_Manager', status: 'active' },
    { id: uuid(), email: 'purchase@novatech.vn', password_hash: '123456', full_name: 'Le Van Mua', phone: '0901234569', department_id: refs.departmentIds[2], role: 'Purchasing_Manager', status: 'active' },
    { id: uuid(), email: 'warehouse@novatech.vn', password_hash: '123456', full_name: 'Pham Thi Kho', phone: '0901234570', department_id: refs.departmentIds[3], role: 'Warehouse_Manager', status: 'active' },
    { id: uuid(), email: 'accountant@novatech.vn', password_hash: '123456', full_name: 'Hoang Van Ke', phone: '0901234571', department_id: refs.departmentIds[4], role: 'Accountant', status: 'active' },
  ];
  rows.forEach(r => refs.userIds.push(r.id));
  saveCSV('users.csv', rows);
  return rows;
};

const generateProductCategories = () => {
  console.log('Generating product categories...');
  // Parent categories first (index 0-3 in refs.categoryIds)
  const parents = [
    { id: uuid(), name: 'Smart Home', parent_id: null, display_order: 1, is_active: true, description: 'Thiet bi va he thong SmartHome', image_url: '' },
    { id: uuid(), name: 'Security', parent_id: null, display_order: 2, is_active: true, description: 'An ninh va giam sat', image_url: '' },
    { id: uuid(), name: 'Networking', parent_id: null, display_order: 3, is_active: true, description: 'Thiet bi mang', image_url: '' },
    { id: uuid(), name: 'Accessories', parent_id: null, display_order: 4, is_active: true, description: 'Cap, dau noi va phu kien', image_url: '' },
  ];

  // Child categories reference parent UUIDs
  const children = [
    { id: uuid(), name: 'Smart Hubs', parent_id: parents[0].id, display_order: 10, is_active: true, description: 'Bo dieu khien trung tam', image_url: '' },
    { id: uuid(), name: 'Smart Sensors', parent_id: parents[0].id, display_order: 11, is_active: true, description: 'Cam bien thong minh', image_url: '' },
    { id: uuid(), name: 'Smart Cameras', parent_id: parents[1].id, display_order: 20, is_active: true, description: 'Camera IP', image_url: '' },
    { id: uuid(), name: 'Smart Locks', parent_id: parents[1].id, display_order: 21, is_active: true, description: 'Khoa thong minh', image_url: '' },
    { id: uuid(), name: 'Network Equipment', parent_id: parents[2].id, display_order: 30, is_active: true, description: 'Router, switch, mesh', image_url: '' },
    { id: uuid(), name: 'Cables & Connectors', parent_id: parents[3].id, display_order: 40, is_active: true, description: 'HDMI, USB, mang', image_url: '' },
  ];

  const rows = [...parents, ...children];
  rows.forEach(r => refs.categoryIds.push(r.id));
  saveCSV('product_categories.csv', rows);
  return { parents, children };
};

// physical_size_sqm: camera/lock=0.5, sensor/switch/plug=0.2, robot/hub=2.0, default=1.0
const getPhysicalSize = (name) => {
  const n = name.toLowerCase();
  if (/robot|hub|vac/i.test(n)) return 2.0;
  if (/camera|lock|doorbell/i.test(n)) return 0.5;
  if (/sensor|switch|plug|socket|thermostat/i.test(n)) return 0.2;
  return 1.0;
};

const isIoT = (name) => {
  const n = name.toLowerCase();
  return /camera|lock|robot|hub|sensor|doorbell|speaker|thermostat/i.test(n);
};

const requiresSerial = (name) => {
  const n = name.toLowerCase();
  return /camera|lock|robot|hub/i.test(n);
};

const getCategoryId = (name, categories) => {
  const n = name.toLowerCase();
  if (/camera|lock|doorbell/i.test(n)) return categories.children[2].id; // Smart Cameras
  if (/sensor/i.test(n)) return categories.children[1].id;              // Smart Sensors
  if (/robot|vac/i.test(n)) return categories.parents[0].id;           // Smart Home
  if (/lock/i.test(n)) return categories.children[3].id;                // Smart Locks
  if (/hub/i.test(n)) return categories.children[0].id;                // Smart Hubs
  if (/switch|plug|socket|thermostat|speaker|bulb|light|strip/i.test(n)) return categories.parents[3].id; // Accessories
  if (/cable|poe|connector/i.test(n)) return categories.children[4].id; // Cables
  if (/router|mesh|network/i.test(n)) return categories.children[4].id;  // Network
  return categories.parents[0].id;
};

const generateProducts = (categories) => {
  console.log('Generating 100 products...');
  const rows = [];
  const productTemplates = [
    // Cameras
    { name: 'Camera IP 2MP HIKVISION', list_price: 1500000, cost_price: 900000 },
    { name: 'Camera IP 4MP HIKVISION', list_price: 2200000, cost_price: 1400000 },
    { name: 'Camera Dome 2MP DAHUA', list_price: 1300000, cost_price: 780000 },
    { name: 'Camera PTZ 5MP HIKVISION', list_price: 4500000, cost_price: 3000000 },
    { name: 'Camera Cube 1MP EZVIZ', list_price: 650000, cost_price: 380000 },
    // Sensors
    { name: 'Cam bien chuyen dong PIR', list_price: 250000, cost_price: 120000 },
    { name: 'Cam bien cua/so', list_price: 180000, cost_price: 90000 },
    { name: 'Cam bien nhiet do & do am', list_price: 350000, cost_price: 180000 },
    { name: 'Cam bien khi gas', list_price: 480000, cost_price: 250000 },
    { name: 'Cam bien rung chuyen', list_price: 320000, cost_price: 160000 },
    // Robots
    { name: 'Robot hut bui Roborock S7', list_price: 8500000, cost_price: 5500000 },
    { name: 'Robot hut bui Dreame D9', list_price: 7200000, cost_price: 4600000 },
    { name: 'Robot hut bui Ecovacs T10', list_price: 6800000, cost_price: 4200000 },
    // Locks
    { name: 'Khoa cua thong minh Yale', list_price: 4500000, cost_price: 2800000 },
    { name: 'Khoa cua thong minh Samsung', list_price: 5200000, cost_price: 3300000 },
    { name: 'Khoa cua thong minh Philips', list_price: 4800000, cost_price: 3000000 },
    // Hubs
    { name: 'Hub dieu khien SmartHome Zigbee', list_price: 1800000, cost_price: 1100000 },
    { name: 'Hub WiFi Mesh 3-band', list_price: 2200000, cost_price: 1400000 },
    { name: 'Hub dieu khien Matter/Thread', list_price: 2500000, cost_price: 1600000 },
    // Switches/Plugs
    { name: 'Cong tac thong minh 1 nut', list_price: 380000, cost_price: 200000 },
    { name: 'Cong tac thong minh 2 nut', list_price: 480000, cost_price: 260000 },
    { name: 'Cong tac thong minh 3 nut', list_price: 580000, cost_price: 320000 },
    { name: 'O cam thong minh WiFi', list_price: 280000, cost_price: 150000 },
    { name: 'O cam thong minh 2 cong', list_price: 380000, cost_price: 200000 },
    // Lighting
    { name: 'Bong den thong minh RGB', list_price: 220000, cost_price: 120000 },
    { name: 'Den LED strip thong minh 5m', list_price: 450000, cost_price: 250000 },
    { name: 'Bong den thong minh E27', list_price: 180000, cost_price: 95000 },
    // Network
    { name: 'Router WiFi 6 AX3000', list_price: 1800000, cost_price: 1100000 },
    { name: 'Router WiFi 6E AX5400', list_price: 3200000, cost_price: 2000000 },
    { name: 'Switch PoE 8 port 120W', list_price: 1800000, cost_price: 1100000 },
    { name: 'Switch PoE 16 port 250W', list_price: 3800000, cost_price: 2400000 },
    { name: 'Mesh WiFi 3-node TP-Link', list_price: 4200000, cost_price: 2700000 },
    // Cables
    { name: 'Day cap mang CAT6 100m', list_price: 1200000, cost_price: 800000 },
    { name: 'Day cap mang CAT6A 305m', list_price: 2800000, cost_price: 1800000 },
    { name: 'Day HDMI 2.1 5m', list_price: 350000, cost_price: 200000 },
    { name: 'Day USB-C 3m', list_price: 180000, cost_price: 90000 },
    // Misc IoT
    { name: 'Chuong cua thong minh', list_price: 2800000, cost_price: 1700000 },
    { name: 'May phat dien thoai WiFi', list_price: 1200000, cost_price: 720000 },
    { name: 'Rem moto thong minh', list_price: 2200000, cost_price: 1400000 },
    { name: 'Cam bien cham cong RFID', list_price: 1800000, cost_price: 1100000 },
  ];

  for (let i = 0; i < 100; i++) {
    const tmpl = productTemplates[i % productTemplates.length];
    const sku = `SKU-${String(i + 1).padStart(5, '0')}`;
    const catId = getCategoryId(tmpl.name, categories);
    const iot = isIoT(tmpl.name);
    const serial = requiresSerial(tmpl.name);
    rows.push({
      id: uuid(),
      sku,
      name: `${tmpl.name} v${randomInt(1, 3)}`,
      description: `${tmpl.name} cho ung dung SmartHome.`,
      category_id: catId,
      uom_id: randomElement(refs.uomIds),
      barcode: String(randomInt(8900000000000, 8999999999999)),
      list_price: tmpl.list_price,
      cost_price: tmpl.cost_price,
      // NOTE: profit_margin_percent is GENERATED ALWAYS AS in DB — do NOT include
      physical_size_sqm: getPhysicalSize(tmpl.name),
      reorder_level: randomInt(5, 30),
      reorder_quantity: randomInt(20, 100),
      supplier_lead_time_days: randomInt(5, 21),
      is_iot_device: iot,
      requires_serial_scan: serial,
      status: randomElement(productStatuses),
    });
    refs.productIds.push(rows[rows.length - 1].id);
  }
  saveCSV('products.csv', rows);
  return rows;
};

const generateWarehouses = () => {
  console.log('Generating warehouses...');
  const rows = [
    {
      id: uuid(),
      warehouse_code: 'WH-HN',
      name: 'Kho Ha Noi',
      description: 'Kho phan phoi chinh mien Bac',
      location_address: 'Khu Cong Nghiep Tu Liem, Ha Noi',
      city: 'Ha Noi',
      province: 'Ha Noi',
      postal_code: '10000',
      manager_id: refs.userIds[0],
      capacity_sqm: 500,
      // NOTE: current_occupancy_sqm is AUTO-CALCULATED from bin_locations/stock_in_bins — do NOT include
      status: 'active',
    },
    {
      id: uuid(),
      warehouse_code: 'WH-HCM',
      name: 'Kho TP.HCM',
      description: 'Kho phan phoi chinh mien Nam',
      location_address: 'Khu Cong Nghiep Thu Duc, TP.HCM',
      city: 'TP. Ho Chi Minh',
      province: 'TP.HCM',
      postal_code: '70000',
      manager_id: refs.userIds[0],
      capacity_sqm: 600,
      // NOTE: current_occupancy_sqm is AUTO-CALCULATED — do NOT include
      status: 'active',
    },
    {
      id: uuid(),
      warehouse_code: 'WH-BH',
      name: 'Kho Bao Hanh',
      description: 'Kho luu tru hang bao hanh',
      location_address: 'Khu Cong Nghiep Long Bien, Ha Noi',
      city: 'Ha Noi',
      province: 'Ha Noi',
      postal_code: '10000',
      manager_id: refs.userIds[0],
      capacity_sqm: 100,
      // NOTE: current_occupancy_sqm is AUTO-CALCULATED — do NOT include
      status: 'active',
    },
  ];
  rows.forEach(r => refs.warehouseIds.push(r.id));
  saveCSV('warehouses.csv', rows);
  return rows;
};

const generateWarehouseZones = (warehouses) => {
  console.log('Generating warehouse zones...');
  const rows = [];
  const zoneData = [
    { code: 'A', name: 'Khu A - Camera & Lock' },
    { code: 'B', name: 'Khu B - Robot & Hub' },
    { code: 'C', name: 'Khu C - Phu kien & Mang' },
  ];
  for (const wh of warehouses) {
    for (const zd of zoneData) {
      const id = uuid();
      refs.zoneIds.push(id);
      rows.push({ id, warehouse_id: wh.id, zone_code: zd.code, zone_name: zd.name });
    }
  }
  saveCSV('warehouse_zones.csv', rows);
  return rows;
};

const generateBinLocations = (warehouses, zones) => {
  console.log('Generating bin locations (30 bins per warehouse)...');
  const rows = [];
  const levels = ['L1', 'L2'];
  for (const wh of warehouses) {
    const whZones = zones.filter(z => z.warehouse_id === wh.id);
    for (const wz of whZones) {
      for (let r = 1; r <= 2; r++) {
        for (let c = 1; c <= 2; c++) {
          for (const lv of levels) {
            const id = uuid();
            refs.binIds.push(id);
            rows.push({
              id,
              warehouse_id: wh.id,
              zone_id: wz.id,
              bin_code: `${wh.warehouse_code}-${wz.zone_code}${String(r).padStart(2,'0')}${String(c).padStart(2,'0')}-${lv}`,
              description: `Ke ${wz.zone_name} Gia ${r}-Cot ${c}-Tang ${lv}`,
              capacity_units: randomInt(50, 200),
              // NOTE: current_occupancy_units is AUTO-CALCULATED from stock_in_bins — do NOT include
              status: randomElement(binStatuses),
            });
          }
        }
      }
    }
  }
  saveCSV('bin_locations.csv', rows);
  return rows;
};

const generateCustomers = () => {
  console.log('Generating 20 customers...');
  const rows = [];
  for (let i = 0; i < 20; i++) {
    const city = randomElement(vietnameseCities);
    const isCompany = Math.random() > 0.35;
    const type = isCompany ? 'B2B' : 'B2C';
    const name = isCompany ? generateCompanyName() : generateCustomerName();
    const billingAddress = generateAddress(city);
    const shippingSame = Math.random() > 0.3;
    const row = {
      id: uuid(),
      name,
      customer_type: type,
      company_tax_id: isCompany ? generateTaxId() : '',
      contact_person_name: isCompany ? generateCustomerName() : name,
      contact_person_email: `contact${i + 1}@email.com`,
      contact_person_phone: generatePhone(),
      billing_address: billingAddress,
      shipping_address: shippingSame ? billingAddress : generateAddress(randomElement(vietnameseCities)),
      shipping_same_as_billing: shippingSame,
      payment_terms: randomElement(paymentTerms),
      credit_limit: type === 'B2B' ? randomInt(50000, 500000) : 0,
      // NOTE: credit_used is AUTO-CALCULATED from customer_invoices — do NOT include
      status: randomElement(customerStatuses),
    };
    rows.push(row);
    refs.customerIds.push(row.id);
  }
  saveCSV('customers.csv', rows);
  return rows;
};

const generateSuppliers = () => {
  console.log('Generating 50 suppliers...');
  const rows = [];
  for (let i = 0; i < 50; i++) {
    const city = randomElement(vietnameseCities);
    const typeId = randomElement(refs.supplierTypeIds);
    const row = {
      id: uuid(),
      supplier_number: `SUPP-${String(i + 1).padStart(5, '0')}`,
      name: `${generateCompanyName()} ${randomElement(['Vietnam', 'Asia', '', '', ''])}`,
      supplier_type_id: typeId,
      company_tax_id: generateTaxId(),
      contact_person_name: generateCustomerName(),
      contact_person_email: `contact${i + 1}@supplier.com`,
      contact_person_phone: generatePhone(),
      company_address: generateAddress(city),
      company_city: city,
      company_province: city,
      company_postal_code: String(randomInt(70000, 90000)),
      company_website: `https://www.supplier${i + 1}.vn`,
      logo_url: '',
      payment_terms: randomElement(paymentTerms),
      average_lead_time_days: randomInt(5, 21),
      is_preferred: Math.random() > 0.6,
      // NOTE: total_spent is AUTO-CALCULATED from vendor_bills — do NOT include
      // NOTE: average_response_time_hours is AUTO-CALCULATED from rfq_supplier_quotations — do NOT include
      // NOTE: quality_rating is AUTO-CALCULATED from goods_receipt_lines — do NOT include
      status: randomElement(supplierStatuses),
    };
    rows.push(row);
    refs.supplierIds.push(row.id);
  }
  saveCSV('suppliers.csv', rows);
  return rows;
};

const generateCarriers = () => {
  console.log('Generating carriers...');
  const rows = [
    { id: uuid(), name: 'Viettel Post', code: 'VTP', contact_phone: '19008008', status: 'active' },
    { id: uuid(), name: 'GHTK', code: 'GHTK', contact_phone: '19006066', status: 'active' },
    { id: uuid(), name: 'GHN Express', code: 'GHN', contact_phone: '19006066', status: 'active' },
    { id: uuid(), name: 'Ninja Van', code: 'NJV', contact_phone: '19002020', status: 'active' },
    { id: uuid(), name: 'J&T Express', code: 'JT', contact_phone: '19001010', status: 'active' },
  ];
  rows.forEach(r => refs.carrierIds.push(r.id));
  saveCSV('carriers.csv', rows);
  return rows;
};

// ============================================================
// GENERATORS — CRM (Tier 2) — Leads only; customers come from WON leads
// ============================================================

const generateLeads = () => {
  console.log('Generating 30 leads...');
  const rows = [];
  for (let i = 0; i < 30; i++) {
    const city = randomElement(vietnameseCities);
    const isCompany = Math.random() > 0.4;
    const stageId = randomElement(refs.leadStageIds);
    const row = {
      id: uuid(),
      lead_number: `LEAD-${String(i + 1).padStart(5, '0')}`,
      company_name: isCompany ? generateCompanyName() : generateCustomerName(),
      contact_person_name: generateCustomerName(),
      contact_person_phone: generatePhone(),
      contact_person_email: `contact${i + 1}@lead.com`,
      company_address: generateAddress(city),
      company_tax_id: isCompany ? generateTaxId() : '',
      source: randomElement(leadSources),
      lead_rating: randomElement(leadRatings),
      stage_id: stageId,
      owner_id: randomElement(refs.userIds),
      customer_id: '',   // Filled when lead is WON and converted to customer
      tax_percent: 10,
      estimated_value: randomInt(5000, 500000) * 1000,
      probability_percent: randomInt(10, 90),
      expected_close_date: randomDate(new Date().toISOString().slice(0, 10), '2026-12-31'),
      notes: '',
      customer_type: isCompany ? 'B2B' : 'B2C',
      billing_address: generateAddress(city),
      shipping_address: generateAddress(city),
      is_auto_request: Math.random() > 0.85,  // ~15% are auto_request leads
    };
    rows.push(row);
  }
  saveCSV('leads.csv', rows);
  return rows;
};

// ============================================================
// INITIAL STOCK LEVELS (product × warehouse = 0, triggers will update)
// Note: This file seeds stock_levels = 0 for every product × warehouse combo.
// Triggers will auto-update these when goods receipts are processed.
// ============================================================
const generateStockLevels = () => {
  console.log('Generating stock levels (all zero, triggers will update)...');
  const rows = [];
  for (const prodId of refs.productIds) {
    for (const whId of refs.warehouseIds) {
      rows.push({
        id: uuid(),
        product_id: prodId,
        warehouse_id: whId,
        bin_location_id: null,  // null = warehouse-level aggregate
        quantity_on_hand: 0,
        quantity_reserved: 0,
        // NOTE: quantity_available is GENERATED ALWAYS AS — do NOT include
        quantity_in_transit: 0,
        // NOTE: reorder_status is AUTO-CALCULATED by trigger — do NOT include
      });
    }
  }
  saveCSV('stock_levels.csv', rows);
  return rows;
};

// ============================================================
// INITIAL STOCK IN BINS (all zero — populated via Goods Receipts)
// ============================================================
const generateStockInBins = () => {
  console.log('Generating stock in bins (all zero)...');
  const rows = [];
  for (const prodId of refs.productIds) {
    // Only create entries for WH-HN warehouse as examples
    const whId = refs.warehouseIds[0];
    for (const binId of refs.binIds.filter((_, i) => i < 3)) {
      rows.push({
        id: uuid(),
        product_id: prodId,
        warehouse_id: whId,
        bin_location_id: binId,
        quantity: 0,
      });
    }
  }
  saveCSV('stock_in_bins.csv', rows);
  return rows;
};

// ============================================================
// REFERENCE DATA DUMP (reference tables already generated above)
// These CSV files ensure all reference data is available for import
// ============================================================

// ============================================================
// MAIN
// ============================================================
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('\n========================================');
console.log('NOVATECH ERP - DATA GENERATOR (FIXED)');
console.log('========================================\n');
console.log('Schema changes applied:');
console.log('  - All IDs: integer -> UUID');
console.log('  - Products: +physical_size_sqm, +is_iot_device, +requires_serial_scan');
console.log('  - Products: -profit_margin_percent (auto-calculated)');
console.log('  - Suppliers: -total_spent, -average_response_time_hours, -quality_rating (auto-calculated)');
console.log('  - Warehouses: -current_occupancy_sqm (auto-calculated)');
console.log('  - Bin locations: -current_occupancy_units (auto-calculated)');
console.log('  - All tables: -is_deleted (not in schema)');
console.log('');

try {
  // Tier 0: Reference tables
  generateDepartments();
  generateUnitsOfMeasure();
  generateSupplierTypes();
  generateLeadStages();
  generateActivityTypes();
  generateAccounts();

  // Tier 1: Master data
  generateUsers();
  const categories = generateProductCategories();
  generateProducts(categories);
  generateWarehouses();
  const zones = generateWarehouseZones(
    refs.warehouseIds.map((id, i) => ({ id, warehouse_code: ['WH-HN', 'WH-HCM', 'WH-BH'][i] }))
  );
  generateBinLocations(
    refs.warehouseIds.map((id, i) => ({ id, warehouse_code: ['WH-HN', 'WH-HCM', 'WH-BH'][i] })),
    zones
  );
  generateCustomers();
  generateSuppliers();
  generateCarriers();

  // CRM
  generateLeads();

  // Inventory (initial = 0, triggers will update)
  generateStockLevels();
  generateStockInBins();

  console.log('\n========================================');
  console.log('GENERATION COMPLETE');
  console.log('========================================');
  console.log('\nFiles saved to:', OUTPUT_DIR);
  console.log('\nSummary:');
  console.log('  Reference: departments, units_of_measure, supplier_types,');
  console.log('            lead_stages, activity_types, accounts');
  console.log('  Master: 5 users, 10 product categories, 100 products,');
  console.log('          3 warehouses, 9 zones, 24 bin locations,');
  console.log('          20 customers, 50 suppliers, 5 carriers, 30 leads,');
  console.log('          300 stock_levels (product x warehouse),');
  console.log('          72 stock_in_bins (initial = 0)');
  console.log('\nIMPORTANT: Auto-calculated fields are EXCLUDED.');
  console.log('  Triggers in migration_v2_fixed.sql will auto-update them.');
  console.log('');
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
