/**
 * ERP Demo Data Generator
 * Run: node generate_data.cjs
 * 
 * DATA REQUIREMENTS (as specified):
 * - 20 Product Categories
 * - 500 Products
 * - 1000 Customers
 * - 1000 Suppliers
 * - 5 Users
 * - 3 Warehouses
 * - 30 Bin Locations
 * - 100 Opportunities (CRM Leads)
 * - 100 Quotations
 * - 50 Sales Orders
 * - 50 Delivery Orders
 * - 50 Goods Receipts
 * - 30 Stock Counts
 * - 100 RFQs
 * - 50 Purchase Orders
 * - 50 Customer Invoices
 * - 50 Vendor Bills
 * - 10 Credit Notes
 * - 10 Debit Notes
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURATION
// ============================================================
const OUTPUT_DIR = path.join(__dirname, 'generated_data');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const randomElement = arr => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s)).toISOString().slice(0, 10);
};
const randomDateTime = () => {
  const d = randomDate('2024-01-01', new Date());
  return `${d} ${String(randomInt(0, 23)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}`;
};

// ============================================================
// DATA SOURCES
// ============================================================
const vietnameseCities = ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Can Tho', 'Hai Phong', 'Bien Hoa', 'Nha Trang'];
const districts = {
  'Ho Chi Minh City': ['District 1', 'District 3', 'District 5', 'District 7', 'District 9', 'Binh Thanh', 'Phu Nhuan'],
  'Hanoi': ['Hoan Kiem', 'Hai Ba Trung', 'Ba Dinh', 'Dong Da', 'Cau Giay'],
  'Da Nang': ['Hai Chau', 'Thanh Khe', 'Son Tra', 'Ngu Hanh Son'],
  'Can Tho': ['Ninh Kieu', 'Binh Thuy', 'Cai Rang'],
  'Hai Phong': ['Hong Bang', 'Le Chan', 'Ngo Quyen'],
  'Bien Hoa': ['Bien Hoa 1', 'Bien Hoa 2', 'Long Binh'],
  'Nha Trang': ['Nha Trang City', 'Cam Lam', 'Vinh Hoa'],
};

const productCategories = [
  'Smart Home Hubs', 'Smart Cameras', 'Smart Lighting', 'Smart Sensors', 'Smart Locks',
  'Smart Thermostats', 'Smart Plugs', 'Smart Speakers', 'Smart TVs', 'Network Equipment',
  'IoT Components', 'Cables & Accessories', 'Smart Appliances', 'Security Systems', 'Smart Doorbells',
  'Smart Blinds', 'Smart Meters', 'Wearable Devices', 'Smart Health', 'Automation Controllers',
];

const leadStages = [
  { id: 1, name: 'New', display_order: 1, probability_percent: 10, color_code: '#3498db' },
  { id: 2, name: 'Qualified', display_order: 2, probability_percent: 25, color_code: '#9b59b6' },
  { id: 3, name: 'Proposition', display_order: 3, probability_percent: 50, color_code: '#f39c12' },
  { id: 4, name: 'Negotiation', display_order: 4, probability_percent: 75, color_code: '#e67e22' },
  { id: 5, name: 'Won', display_order: 5, probability_percent: 100, color_code: '#27ae60' },
  { id: 6, name: 'Lost', display_order: 6, probability_percent: 0, color_code: '#e74c3c' },
];

const leadSources = ['Website', 'Referral', 'Showroom', 'Architect Partner', 'Cold Call', 'Social Media'];
const supplierTypes = ['Equipment Suppliers', 'Component Suppliers', 'Logistics', 'Service Providers', 'Maintenance Services'];
const paymentTerms = ['NET30', 'NET45', 'NET60', 'COD', 'Prepaid'];
const statuses = ['active', 'inactive', 'blocked'];

const generatePhone = () => {
  const prefixes = ['090', '091', '092', '093', '094', '095', '096', '097', '098', '099'];
  return randomElement(prefixes) + randomInt(1000000, 9999999);
};

const generateTaxId = () => String(randomInt(1000000000, 9999999999));

const generateAddress = (city) => {
  const num = randomInt(1, 999);
  const streets = ['Nguyen Hue', 'Le Duan', 'Dien Bien Phu', 'Nam Ky Khoi Nghia', 'Tran Hung Dao'];
  const district = districts[city] ? randomElement(districts[city]) : 'District 1';
  return `${num} ${randomElement(streets)} St., ${district}, ${city}`;
};

const generateCompanyName = () => {
  const prefixes = ['Global', 'Tech', 'Smart', 'Future', 'Prime', 'Elite', 'Pro', 'Advanced', 'Digital', 'Modern'];
  const names = ['Solutions', 'Systems', 'Industries', 'Group', 'Corp', 'Enterprises', 'Technologies', 'Services'];
  const suffix = randomElement(['', ' JSC', ' Co.', ' Ltd.', ' PLC']);
  return `${randomElement(prefixes)} ${randomElement(names)}${suffix}`;
};

const generateCustomerName = () => {
  const firsts = ['John', 'Mary', 'David', 'Sarah', 'Michael', 'Jennifer', 'Robert', 'Lisa', 'William', 'Emily', 'James', 'Emma', 'Richard', 'Olivia', 'Thomas', 'Sophia'];
  const lasts = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  return `${randomElement(firsts)} ${randomElement(lasts)}`;
};

// ============================================================
// TRACKING DATA
// ============================================================
const data = {};

// ============================================================
// GENERATORS
// ============================================================

// USERS (5 users) - Match actual schema
const generateUsers = () => {
  console.log('Generating 5 users...');
  const users = [
    { id: 1, email: 'admin@smartbiz.vn', password_hash: '123456', full_name: 'Nguyen Van Admin', phone: '0901234567', avatar_url: '', role: 'Admin', department_id: 1, status: 'active', last_login: '', login_attempts: 0, locked_until: '', created_at: randomDateTime(), updated_at: randomDateTime(), is_deleted: false },
    { id: 2, email: 'sales@smartbiz.vn', password_hash: '123456', full_name: 'Tran Thi Sales', phone: '0901234568', avatar_url: '', role: 'Sales_Manager', department_id: 2, status: 'active', last_login: '', login_attempts: 0, locked_until: '', created_at: randomDateTime(), updated_at: randomDateTime(), is_deleted: false },
    { id: 3, email: 'purchase@smartbiz.vn', password_hash: '123456', full_name: 'Le Van Purchase', phone: '0901234569', avatar_url: '', role: 'Purchasing_Manager', department_id: 2, status: 'active', last_login: '', login_attempts: 0, locked_until: '', created_at: randomDateTime(), updated_at: randomDateTime(), is_deleted: false },
    { id: 4, email: 'warehouse@smartbiz.vn', password_hash: '123456', full_name: 'Pham Thi Warehouse', phone: '0901234570', avatar_url: '', role: 'Warehouse_Manager', department_id: 3, status: 'active', last_login: '', login_attempts: 0, locked_until: '', created_at: randomDateTime(), updated_at: randomDateTime(), is_deleted: false },
    { id: 5, email: 'accounting@smartbiz.vn', password_hash: '123456', full_name: 'Hoang Van Accounting', phone: '0901234571', avatar_url: '', role: 'Accountant', department_id: 4, status: 'active', last_login: '', login_attempts: 0, locked_until: '', created_at: randomDateTime(), updated_at: randomDateTime(), is_deleted: false },
  ];
  data.users = users;
  saveCSV('users.csv', users);
  return users;
};

// CATEGORIES (20 categories) - Match actual schema with hierarchical support
const generateCategories = () => {
  console.log('Generating 20 product categories...');
  // Parent categories (top level)
  const parentCategories = [
    { id: 1, name: 'Smart Home', description: 'Smart home devices and systems' },
    { id: 2, name: 'Security', description: 'Security and surveillance products' },
    { id: 3, name: 'Networking', description: 'Network equipment and accessories' },
    { id: 4, name: 'Accessories', description: 'Cables, connectors, and accessories' },
  ];
  
  // Child categories (with parent_id)
  const childCategories = [
    { id: 5, name: 'Smart Home Hubs', parent_id: 1, description: 'Central control devices' },
    { id: 6, name: 'Smart Sensors', parent_id: 1, description: 'Environmental and motion sensors' },
    { id: 7, name: 'Smart Cameras', parent_id: 2, description: 'IP cameras and security cameras' },
    { id: 8, name: 'Smart Locks', parent_id: 2, description: 'Electronic door locks' },
    { id: 9, name: 'Network Equipment', parent_id: 3, description: 'Routers, switches, mesh systems' },
    { id: 10, name: 'Smart Lighting', parent_id: 1, description: 'Smart bulbs, switches, dimmers' },
    { id: 11, name: 'Smart Thermostats', parent_id: 1, description: 'Climate control devices' },
    { id: 12, name: 'Smart Plugs', parent_id: 1, description: 'WiFi plugs and power strips' },
    { id: 13, name: 'Smart Speakers', parent_id: 1, description: 'Voice assistants and speakers' },
    { id: 14, name: 'Smart Doorbells', parent_id: 2, description: 'Video doorbells' },
    { id: 15, name: 'IoT Components', parent_id: 3, description: 'DIY electronics and components' },
    { id: 16, name: 'Cables & Connectors', parent_id: 4, description: 'HDMI, USB, network cables' },
    { id: 17, name: 'Smart Appliances', parent_id: 1, description: 'Connected home appliances' },
    { id: 18, name: 'Security Systems', parent_id: 2, description: 'Alarm systems and sensors' },
    { id: 19, name: 'Wearable Devices', parent_id: 1, description: 'Smart watches and fitness trackers' },
    { id: 20, name: 'Automation Controllers', parent_id: 1, description: 'PLC and automation controllers' },
  ];
  
  const categories = parentCategories.concat(childCategories).map((cat, idx) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    parent_id: cat.parent_id || null,
    image_url: '',
    display_order: idx + 1,
    created_at: randomDateTime(),
    updated_at: randomDateTime(),
    is_deleted: false,
  }));
  data.categories = categories;
  saveCSV('product_categories.csv', categories);
  return categories;
};

// PRODUCTS (500 products)
const generateProducts = () => {
  console.log('Generating 500 products...');
  const products = [];
  const types = ['Camera', 'Bulb', 'Switch', 'Lock', 'Sensor', 'Hub', 'Speaker', 'Plug', 'Thermostat', 'TV', 'Router', 'Strip', 'Doorbell', 'Meter'];
  const prefixes = ['Smart', 'Pro', 'Elite', 'Basic', 'Advanced', 'Premium', 'Ultra', 'Mini', 'Plus', 'Eco'];
  
  for (let i = 1; i <= 500; i++) {
    const cat = data.categories[(i - 1) % 20];
    const type = randomElement(types);
    const prefix = randomElement(prefixes);
    const model = `${randomInt(100, 999)}${String.fromCharCode(65 + randomInt(0, 25))}`;
    const listPrice = randomFloat(500, 5000);
    const costPrice = randomFloat(300, 3000);
    products.push({
      id: i,
      sku: `SKU-${String(i).padStart(5, '0')}`,
      name: `${prefix} ${type} ${model}`,
      description: `High-quality ${type} for SmartHome applications.`,
      category_id: cat.id,
      uom_id: randomInt(1, 6),
      image_url: `/images/products/${type.toLowerCase()}-${model.toLowerCase()}.jpg`,
      list_price: listPrice,
      cost_price: costPrice,
      reorder_level: randomInt(5, 50),
      reorder_quantity: randomInt(20, 200),
      supplier_lead_time_days: randomInt(7, 30),
      status: randomElement(['active', 'active', 'active', 'discontinued']),
      barcode: String(randomInt(100000000000, 999999999999)),
      created_at: randomDateTime(),
      updated_at: randomDateTime(),
      is_deleted: false,
    });
  }
  data.products = products;
  saveCSV('products.csv', products);
  return products;
};

// CUSTOMERS (1000 customers)
const generateCustomers = () => {
  console.log('Generating 1000 customers...');
  const customers = [];
  for (let i = 1; i <= 1000; i++) {
    const city = randomElement(vietnameseCities);
    const isCompany = Math.random() > 0.3;
    const type = isCompany ? 'B2B' : 'B2C';
    const name = isCompany ? generateCompanyName() : generateCustomerName();
    const contact = isCompany ? generateCustomerName() : name;
    customers.push({
      id: i,
      customer_number: `CUS-${type}-${String(i).padStart(4, '0')}`,
      name,
      company_tax_id: isCompany ? generateTaxId() : '',
      customer_type: type,
      contact_person_name: contact,
      contact_person_email: `contact${i}@email.com`,
      contact_person_phone: generatePhone(),
      billing_address: generateAddress(city),
      shipping_address: generateAddress(city),
      payment_terms: randomElement(paymentTerms),
      credit_limit: type === 'B2B' ? randomInt(50000, 500000) : 0,
      tax_code: generateTaxId(),
      status: randomElement(statuses),
      notes: '',
      created_at: randomDateTime(),
    });
  }
  data.customers = customers;
  saveCSV('customers.csv', customers);
  return customers;
};

// SUPPLIERS (1000 suppliers) - Match actual schema
const generateSuppliers = () => {
  console.log('Generating 1000 suppliers...');
  const suppliers = [];
  for (let i = 1; i <= 1000; i++) {
    const city = randomElement(vietnameseCities);
    const supType = supplierTypes[randomInt(0, supplierTypes.length - 1)];
    suppliers.push({
      id: i,
      supplier_number: `SUPP-${String(i).padStart(4, '0')}`,
      name: `${generateCompanyName()} ${supType.split(' ')[0]}`,
      company_tax_id: generateTaxId(),
      supplier_type_id: randomInt(1, 5), // References supplier_types.id
      contact_person_name: generateCustomerName(),
      contact_person_email: `supplier${i}@company.com`,
      contact_person_phone: generatePhone(),
      company_address: generateAddress(city),
      company_city: city,
      company_province: city,
      company_postal_code: String(randomInt(70000, 90000)),
      company_website: `https://www.supplier${i}.vn`,
      logo_url: '',
      payment_terms: randomElement(paymentTerms),
      average_lead_time_days: randomInt(3, 30),
      quality_rating: randomInt(3, 5),
      is_preferred: Math.random() > 0.7,
      status: randomElement(['active', 'active', 'active', 'inactive']), // Mostly active
      total_spent: 0,
      average_response_time_hours: randomInt(1, 48),
      created_at: randomDateTime(),
      updated_at: randomDateTime(),
      is_deleted: false,
    });
  }
  data.suppliers = suppliers;
  saveCSV('suppliers.csv', suppliers);
  return suppliers;
};

// WAREHOUSES (3 warehouses) - current_occupancy_sqm will be auto-calculated by trigger
const generateWarehouses = () => {
  console.log('Generating 3 warehouses...');
  const warehouses = [
    { id: 1, warehouse_code: 'WH-HCM', name: 'SmartHome Ho Chi Minh City Warehouse', description: 'Main distribution center for Southern Vietnam', location_address: '123 Industrial Zone 7, District 9, Ho Chi Minh City', city: 'Ho Chi Minh City', province: 'Ho Chi Minh City', postal_code: '70000', manager_id: 1, capacity_sqm: 5000, current_occupancy_sqm: 0, status: 'active', created_at: randomDateTime(), updated_at: randomDateTime(), is_deleted: false },
    { id: 2, warehouse_code: 'WH-HN', name: 'SmartHome Hanoi Warehouse', description: 'Distribution center for Northern Vietnam', location_address: '456 Industrial Zone 2, Long Bien District, Hanoi', city: 'Hanoi', province: 'Hanoi', postal_code: '10000', manager_id: 2, capacity_sqm: 3000, current_occupancy_sqm: 0, status: 'active', created_at: randomDateTime(), updated_at: randomDateTime(), is_deleted: false },
    { id: 3, warehouse_code: 'WH-DN', name: 'SmartHome Da Nang Warehouse', description: 'Distribution center for Central Vietnam', location_address: '789 Hoa Khanh Industrial Zone, Lien Chieu District, Da Nang', city: 'Da Nang', province: 'Da Nang', postal_code: '55000', manager_id: 3, capacity_sqm: 2000, current_occupancy_sqm: 0, status: 'active', created_at: randomDateTime(), updated_at: randomDateTime(), is_deleted: false },
  ];
  data.warehouses = warehouses;
  saveCSV('warehouses.csv', warehouses);
  return warehouses;
};

// BIN LOCATIONS (30 bin locations - 10 per warehouse)
const generateBinLocations = () => {
  console.log('Generating 30 bin locations (10 per warehouse)...');
  const bins = [];
  const zones = ['A', 'B', 'C'];
  const rows = ['01', '02', '03'];
  const cols = ['01', '02'];
  const levels = ['L1', 'L2'];
  
  // 10 bins per warehouse: Zone + Row + Col + Level
  // HCM: A01-01-L1, A01-02-L1, A01-01-L2, A01-02-L2, A02-01-L1, A02-02-L1, A02-01-L2, A02-02-L2, A03-01-L1, A03-02-L1
  const binConfigs = [
    { zone: 'A', row: '01', col: '01', level: 'L1' },
    { zone: 'A', row: '01', col: '02', level: 'L1' },
    { zone: 'A', row: '01', col: '01', level: 'L2' },
    { zone: 'A', row: '01', col: '02', level: 'L2' },
    { zone: 'A', row: '02', col: '01', level: 'L1' },
    { zone: 'A', row: '02', col: '02', level: 'L1' },
    { zone: 'A', row: '02', col: '01', level: 'L2' },
    { zone: 'A', row: '02', col: '02', level: 'L2' },
    { zone: 'A', row: '03', col: '01', level: 'L1' },
    { zone: 'A', row: '03', col: '02', level: 'L1' },
  ];
  
  let cnt = 1;
  for (const wh of data.warehouses) {
    for (const cfg of binConfigs) {
      bins.push({
        id: cnt,
        warehouse_id: wh.id,
        bin_code: `${wh.warehouse_code}-${cfg.zone}${cfg.row}-${cfg.col}-${cfg.level}`,
        description: `Bin ${cfg.zone}${cfg.row}${cfg.col}${cfg.level} in ${wh.name}`,
        capacity_units: randomInt(50, 500),
        current_occupancy_units: randomInt(0, 200),
        status: 'active',
        created_at: randomDateTime(),
        updated_at: randomDateTime(),
      });
      cnt++;
    }
  }
  
  data.binLocations = bins;
  saveCSV('bin_locations.csv', bins);
  return bins;
};

// CRM LEAD STAGES (saved as lead_stages.csv)
const generateCRMStructure = () => {
  console.log('Generating lead stages...');
  saveCSV('lead_stages.csv', leadStages);
  return leadStages;
};

// CRM LEADS (100 leads)
const generateLeads = () => {
  console.log('Generating 100 leads...');
  const leads = [];
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const stForLeads = leadStages.slice(0, 5);
  const ratings = ['Hot', 'Warm', 'Cold'];
  let cnt = 1;
  for (const st of stForLeads) {
    for (let i = 0; i < 20 && leads.length < 100; i++) {
      const city = randomElement(vietnameseCities);
      const isCo = Math.random() > 0.3;
      const coName = isCo ? generateCompanyName() : `Individual - ${generateCustomerName()}`;
      leads.push({
        id: cnt,
        lead_number: `LEAD-${String(cnt).padStart(5, '0')}`,
        company_name: coName,
        contact_person_name: generateCustomerName(),
        contact_person_phone: generatePhone(),
        contact_person_email: `contact${cnt}@company.com`,
        company_address: generateAddress(city),
        company_tax_id: isCo ? generateTaxId() : '',
        stage_id: st.id,
        source: randomElement(leadSources),
        owner_id: randomInt(1, 5),
        estimated_value: randomInt(5000, 500000),
        probability_percent: st.probability_percent,
        expected_close_date: st.name === 'New' || st.name === 'Qualified' ? randomDate(new Date(), new Date(now.getFullYear(), now.getMonth() + 3, 1)) : '',
        closed_date: (st.name === 'Won' || st.name === 'Lost') ? randomDate(oneYearAgo, now) : '',
        lead_rating: randomElement(ratings),
        notes: '',
        created_at: randomDateTime(),
        updated_at: randomDateTime(),
        is_deleted: false,
      });
      cnt++;
    }
  }
  data.leads = leads;
  saveCSV('leads.csv', leads);
  return leads;
};

// QUOTATIONS (100 quotations)
const generateQuotations = () => {
  console.log('Generating 100 quotations...');
  const quotes = [];
  const now = new Date();
  const sixMo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  for (let i = 1; i <= 100; i++) {
    const cust = randomElement(data.customers.filter(c => c.customer_type === 'B2B'));
    const issDate = randomDate(sixMo, now);
    const subtotal = randomFloat(10000, 200000);
    const discount = subtotal * randomFloat(0, 0.15);
    const tax = (subtotal - discount) * 0.1;
    quotes.push({
      id: i,
      quotation_number: `QTN-${String(i).padStart(5, '0')}`,
      customer_id: cust.id,
      issued_date: issDate,
      valid_until_date: new Date(new Date(issDate).getTime() + 30 * 86400000).toISOString().slice(0, 10),
      status: randomElement(['draft', 'sent', 'accepted', 'rejected', 'expired']),
      total_amount: subtotal - discount + tax,
      discount_percent: discount / subtotal * 100,
      notes: '',
      internal_notes: '',
      created_at: randomDateTime(),
    });
  }
  data.quotations = quotes;
  saveCSV('sales_quotations.csv', quotes);
  return quotes;
};

// SALES ORDERS (50 sales orders)
const generateSalesOrders = () => {
  console.log('Generating 50 sales orders...');
  const orders = [];
  const now = new Date();
  const sixMo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  for (let i = 1; i <= 50; i++) {
    const cust = randomElement(data.customers);
    const orderDate = randomDate(sixMo, now);
    const subtotal = randomFloat(15000, 300000);
    const discount = subtotal * randomFloat(0, 0.1);
    const tax = (subtotal - discount) * 0.1;
    orders.push({
      id: i,
      sales_order_number: `SO-${String(i).padStart(5, '0')}`,
      customer_id: cust.id,
      order_date: orderDate,
      required_delivery_date: new Date(new Date(orderDate).getTime() + randomInt(7, 30) * 86400000).toISOString().slice(0, 10),
      status: randomElement(['draft', 'confirmed', 'shipped', 'delivered', 'cancelled']),
      total_amount: subtotal - discount + tax,
      notes: '',
      created_at: randomDateTime(),
    });
  }
  data.salesOrders = orders;
  saveCSV('sales_orders.csv', orders);
  return orders;
};

// DELIVERY ORDERS (50 delivery orders)
const generateDeliveryOrders = () => {
  console.log('Generating 50 delivery orders...');
  const dos = [];
  const now = new Date();
  const sixMo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  for (let i = 1; i <= 50; i++) {
    const wh = randomElement(data.warehouses);
    dos.push({
      id: i,
      delivery_order_number: `DO-${String(i).padStart(5, '0')}`,
      sales_order_id: randomInt(1, 50),
      warehouse_id: wh.id,
      status: randomElement(['draft', 'ready', 'picked', 'shipped', 'delivered', 'cancelled']),
      scheduled_delivery_date: randomDate(sixMo, now),
      notes: '',
      created_at: randomDateTime(),
    });
  }
  data.deliveryOrders = dos;
  saveCSV('delivery_orders.csv', dos);
  return dos;
};

// GOODS RECEIPTS (50 goods receipts)
const generateGoodsReceipts = () => {
  console.log('Generating 50 goods receipts...');
  const grs = [];
  const now = new Date();
  const sixMo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  for (let i = 1; i <= 50; i++) {
    const wh = randomElement(data.warehouses);
    grs.push({
      id: i,
      goods_receipt_number: `GR-${String(i).padStart(5, '0')}`,
      purchase_order_id: randomInt(1, 50),
      warehouse_id: wh.id,
      status: randomElement(['draft', 'received', 'verified', 'completed', 'cancelled']),
      received_date: randomDate(sixMo, now),
      notes: '',
      created_at: randomDateTime(),
    });
  }
  data.goodsReceipts = grs;
  saveCSV('goods_receipts.csv', grs);
  return grs;
};

// STOCK COUNTS (30 stock counts)
const generateStockCounts = () => {
  console.log('Generating 30 stock counts...');
  const counts = [];
  const now = new Date();
  const threeMo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  for (let i = 1; i <= 30; i++) {
    const wh = randomElement(data.warehouses);
    counts.push({
      id: i,
      adjustment_number: `ADJ-${String(i).padStart(5, '0')}`,
      warehouse_id: wh.id,
      adjustment_type: 'stock_count',
      count_date: randomDate(threeMo, now),
      status: randomElement(['draft', 'confirmed', 'completed']),
      notes: '',
      created_at: randomDateTime(),
    });
  }
  data.stockCounts = counts;
  saveCSV('stock_counts.csv', counts);
  return counts;
};

// RFQs (100 RFQs)
const generateRFQs = () => {
  console.log('Generating 100 RFQs...');
  const rfqs = [];
  const now = new Date();
  const sixMo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  for (let i = 1; i <= 100; i++) {
    const prod = randomElement(data.products);
    const issDate = randomDate(sixMo, now);
    rfqs.push({
      id: i,
      rfq_number: `RFQ-${String(i).padStart(5, '0')}`,
      issued_date: issDate,
      closing_date: new Date(new Date(issDate).getTime() + randomInt(14, 60) * 86400000).toISOString().slice(0, 10),
      status: randomElement(['draft', 'sent', 'closed', 'cancelled']),
      total_estimated_cost: randomFloat(5000, 100000),
      notes: `RFQ for ${prod.name}`,
      created_at: randomDateTime(),
    });
  }
  data.rfqs = rfqs;
  saveCSV('purchase_rfqs.csv', rfqs);
  return rfqs;
};

// PURCHASE ORDERS (50 purchase orders)
const generatePurchaseOrders = () => {
  console.log('Generating 50 purchase orders...');
  const orders = [];
  const now = new Date();
  const sixMo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  for (let i = 1; i <= 50; i++) {
    const sup = randomElement(data.suppliers);
    const orderDate = randomDate(sixMo, now);
    const subtotal = randomFloat(10000, 200000);
    const tax = subtotal * 0.1;
    orders.push({
      id: i,
      purchase_order_number: `PO-${String(i).padStart(5, '0')}`,
      supplier_id: sup.id,
      order_date: orderDate,
      required_delivery_date: new Date(new Date(orderDate).getTime() + randomInt(14, 60) * 86400000).toISOString().slice(0, 10),
      status: randomElement(['draft', 'confirmed', 'partial_received', 'received', 'cancelled']),
      total_amount: subtotal + tax,
      notes: '',
      created_at: randomDateTime(),
    });
  }
  data.purchaseOrders = orders;
  saveCSV('purchase_orders.csv', orders);
  return orders;
};

// INVOICES (50 invoices)
const generateInvoices = () => {
  console.log('Generating 50 invoices...');
  const invs = [];
  const now = new Date();
  const sixMo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  for (let i = 1; i <= 50; i++) {
    const cust = randomElement(data.customers);
    const invDate = randomDate(sixMo, now);
    const subtotal = randomFloat(10000, 150000);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    const status = randomElement(['draft', 'posted', 'partial_paid', 'paid', 'overdue', 'cancelled']);
    const paid = status === 'paid' ? total : status === 'partial_paid' ? total * randomFloat(0.3, 0.7) : 0;
    invs.push({
      id: i,
      invoice_number: `INV-${String(i).padStart(5, '0')}`,
      customer_id: cust.id,
      sales_order_id: randomInt(1, 50),
      invoice_date: invDate,
      due_date: new Date(new Date(invDate).getTime() + randomInt(30, 60) * 86400000).toISOString().slice(0, 10),
      status,
      total_amount: total,
      paid_amount: paid,
      notes: '',
      created_at: randomDateTime(),
    });
  }
  data.invoices = invs;
  saveCSV('customer_invoices.csv', invs);
  return invs;
};

// VENDOR BILLS (50 bills)
const generateBills = () => {
  console.log('Generating 50 vendor bills...');
  const bills = [];
  const now = new Date();
  const sixMo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  for (let i = 1; i <= 50; i++) {
    const sup = randomElement(data.suppliers);
    const billDate = randomDate(sixMo, now);
    const subtotal = randomFloat(10000, 150000);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    const status = randomElement(['draft', 'received', 'partial_paid', 'paid', 'cancelled']);
    const paid = status === 'paid' ? total : status === 'partial_paid' ? total * randomFloat(0.3, 0.7) : 0;
    bills.push({
      id: i,
      bill_number: `BILL-${String(i).padStart(5, '0')}`,
      supplier_id: sup.id,
      purchase_order_id: randomInt(1, 50),
      bill_date: billDate,
      due_date: new Date(new Date(billDate).getTime() + randomInt(30, 60) * 86400000).toISOString().slice(0, 10),
      status,
      total_amount: total,
      paid_amount: paid,
      notes: '',
      created_at: randomDateTime(),
    });
  }
  data.bills = bills;
  saveCSV('vendor_bills.csv', bills);
  return bills;
};

// CREDIT NOTES (10 credit notes)
const generateCreditNotes = () => {
  console.log('Generating 10 credit notes...');
  const notes = [];
  const now = new Date();
  const threeMo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  for (let i = 1; i <= 10; i++) {
    const cust = randomElement(data.customers);
    notes.push({
      id: i,
      credit_note_number: `CN-${String(i).padStart(5, '0')}`,
      customer_id: cust.id,
      invoice_id: randomInt(1, 50),
      credit_date: randomDate(threeMo, now),
      status: randomElement(['draft', 'issued', 'applied']),
      total_amount: randomFloat(1000, 20000),
      reason: randomElement(['Customer Return', 'Sales Discount', 'Damaged Goods', 'Wrong Delivery', 'Price Adjustment']),
      notes: '',
      created_at: randomDateTime(),
    });
  }
  data.creditNotes = notes;
  saveCSV('credit_notes.csv', notes);
  return notes;
};

// DEBIT NOTES (10 debit notes)
const generateDebitNotes = () => {
  console.log('Generating 10 debit notes...');
  const notes = [];
  const now = new Date();
  const threeMo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  for (let i = 1; i <= 10; i++) {
    const sup = randomElement(data.suppliers);
    notes.push({
      id: i,
      debit_note_number: `DN-${String(i).padStart(5, '0')}`,
      supplier_id: sup.id,
      bill_id: randomInt(1, 50),
      debit_date: randomDate(threeMo, now),
      status: randomElement(['draft', 'issued', 'applied']),
      total_amount: randomFloat(1000, 20000),
      reason: randomElement(['Supplier Return', 'Price Adjustment', 'Damaged Goods', 'Short Shipment', 'Quality Issue']),
      notes: '',
      created_at: randomDateTime(),
    });
  }
  data.debitNotes = notes;
  saveCSV('debit_notes.csv', notes);
  return notes;
};

// SUPPLIER TYPES (reference table)
const generateSupplierTypes = () => {
  console.log('Generating supplier types...');
  const types = [
    { id: 1, name: 'Equipment Suppliers', description: 'Major equipment and machinery suppliers' },
    { id: 2, name: 'Component Suppliers', description: 'Electronic components and parts suppliers' },
    { id: 3, name: 'Logistics', description: 'Logistics and transportation providers' },
    { id: 4, name: 'Service Providers', description: 'Professional services providers' },
    { id: 5, name: 'Maintenance Services', description: 'Maintenance and repair services' },
  ];
  saveCSV('supplier_types.csv', types);
  return types;
};

// DEPARTMENTS (reference table)
const generateDepartments = () => {
  console.log('Generating departments...');
  const depts = [
    { id: 1, name: 'Administration', description: 'Administrative department' },
    { id: 2, name: 'Sales', description: 'Sales and marketing department' },
    { id: 3, name: 'Warehouse', description: 'Warehouse and logistics department' },
    { id: 4, name: 'Accounting', description: 'Accounting and finance department' },
    { id: 5, name: 'IT', description: 'Information technology department' },
  ];
  saveCSV('departments.csv', depts);
  return depts;
};

// PAYMENT METHODS (reference table)
const generatePaymentMethods = () => {
  console.log('Generating payment methods...');
  const methods = [
    { id: 1, name: 'Cash', description: 'Cash payment' },
    { id: 2, name: 'Bank Transfer', description: 'Bank wire transfer' },
    { id: 3, name: 'Credit Card', description: 'Credit card payment' },
    { id: 4, name: 'Check', description: 'Check payment' },
    { id: 5, name: 'COD', description: 'Cash on delivery' },
  ];
  saveCSV('payment_methods.csv', methods);
  return methods;
};

// CARRIERS (reference table)
const generateCarriers = () => {
  console.log('Generating carriers...');
  const carriers = [
    { id: 1, name: 'GHTK', contact_person_name: 'GHTK Support', contact_person_phone: '1900 6688', contact_person_email: 'support@ghtk.vn', company_address: 'Hanoi, Vietnam', cost_per_km: 3500, average_delivery_time_days: 2, status: 'active' },
    { id: 2, name: 'GHN', contact_person_name: 'GHN Support', contact_person_phone: '1900 6328', contact_person_email: 'support@ghn.vn', company_address: 'Ho Chi Minh City, Vietnam', cost_per_km: 3000, average_delivery_time_days: 2, status: 'active' },
    { id: 3, name: 'ViettelPost', contact_person_name: 'Viettel Support', contact_person_phone: '1900 8095', contact_person_email: 'support@viettelpost.vn', company_address: 'Hanoi, Vietnam', cost_per_km: 3200, average_delivery_time_days: 3, status: 'active' },
    { id: 4, name: 'Ninja Van', contact_person_name: 'Ninja Support', contact_person_phone: '1900 6010', contact_person_email: 'support@ninjavan.co', company_address: 'Ho Chi Minh City, Vietnam', cost_per_km: 2800, average_delivery_time_days: 2, status: 'active' },
  ];
  saveCSV('carriers.csv', carriers);
  return carriers;
};

// LEAD STAGES (reference table for CRM)
const generateLeadStages = () => {
  console.log('Generating lead stages...');
  const stages = [
    { id: 1, name: 'New', display_order: 1, color_code: '#3498db', probability_percent: 10 },
    { id: 2, name: 'Qualified', display_order: 2, color_code: '#9b59b6', probability_percent: 25 },
    { id: 3, name: 'Proposition', display_order: 3, color_code: '#f39c12', probability_percent: 50 },
    { id: 4, name: 'Negotiation', display_order: 4, color_code: '#e67e22', probability_percent: 75 },
    { id: 5, name: 'Won', display_order: 5, color_code: '#27ae60', probability_percent: 100 },
    { id: 6, name: 'Lost', display_order: 6, color_code: '#e74c3c', probability_percent: 0 },
  ];
  saveCSV('lead_stages.csv', stages);
  return stages;
};

// ACCOUNTS (reference table for Accounting)
const generateAccounts = () => {
  console.log('Generating accounts...');
  const accounts = [
    { id: 1, account_code: '1111', account_name: 'Cash', account_type: 'Asset', account_subtype: 'Cash', description: 'Cash on hand', normal_balance: 'Debit', status: 'active' },
    { id: 2, account_code: '1121', account_name: 'Bank - VCB', account_type: 'Asset', account_subtype: 'Bank', description: 'Vietcombank Account', normal_balance: 'Debit', status: 'active' },
    { id: 3, account_code: '1122', account_name: 'Bank - BIDV', account_type: 'Asset', account_subtype: 'Bank', description: 'BIDV Account', normal_balance: 'Debit', status: 'active' },
    { id: 4, account_code: '1311', account_name: 'Accounts Receivable', account_type: 'Asset', account_subtype: 'Receivable', description: 'Customer receivables', normal_balance: 'Debit', status: 'active' },
    { id: 5, account_code: '1521', account_name: 'Merchandise Inventory', account_type: 'Asset', account_subtype: 'Inventory', description: 'Inventory goods', normal_balance: 'Debit', status: 'active' },
    { id: 6, account_code: '3311', account_name: 'Accounts Payable', account_type: 'Liability', account_subtype: 'Payable', description: 'Supplier payables', normal_balance: 'Credit', status: 'active' },
    { id: 7, account_code: '4111', account_name: 'Sales Revenue', account_type: 'Revenue', account_subtype: 'Operating', description: 'Sales revenue', normal_balance: 'Credit', status: 'active' },
    { id: 8, account_code: '5111', account_name: 'Cost of Goods Sold', account_type: 'Expense', account_subtype: 'Operating', description: 'COGS', normal_balance: 'Debit', status: 'active' },
  ];
  saveCSV('accounts.csv', accounts);
  return accounts;
};

// UNITS OF MEASURE
const generateUnitsOfMeasure = () => {
  console.log('Generating units of measure...');
  const uoms = [
    { id: 1, code: 'PCS', name: 'Pieces' },
    { id: 2, code: 'BOX', name: 'Box' },
    { id: 3, code: 'SET', name: 'Set' },
    { id: 4, code: 'KG', name: 'Kilogram' },
    { id: 5, code: 'M', name: 'Meter' },
    { id: 6, code: 'ROLL', name: 'Roll' },
  ];
  saveCSV('units_of_measure.csv', uoms);
  return uoms;
};

// INITIAL INVENTORY
const generateInitialInventory = () => {
  console.log('Generating initial inventory...');
  const invs = [];
  let cnt = 1;
  for (const prod of data.products) {
    for (const wh of data.warehouses) {
      invs.push({
        id: cnt++,
        product_id: prod.id,
        warehouse_id: wh.id,
        quantity_on_hand: randomInt(0, 100),
        reorder_status: 'optimal',
        last_counted_at: randomDate('2024-01-01', new Date()),
        created_at: randomDateTime(),
      });
    }
  }
  saveCSV('initial_inventory.csv', invs);
  return invs;
};

// OPENING BALANCES
const generateOpeningBalances = () => {
  console.log('Generating opening balances...');
  const bals = [
    { id: 1, account_code: '1111', account_name: 'Cash', account_type: 'Asset', normal_balance: 'Debit', opening_debit: 500000000, opening_credit: 0 },
    { id: 2, account_code: '1121', account_name: 'Bank Account - VCB', account_type: 'Asset', normal_balance: 'Debit', opening_debit: 2000000000, opening_credit: 0 },
    { id: 3, account_code: '1122', account_name: 'Bank Account - BIDV', account_type: 'Asset', normal_balance: 'Debit', opening_debit: 1500000000, opening_credit: 0 },
    { id: 4, account_code: '1311', account_name: 'Accounts Receivable', account_type: 'Asset', normal_balance: 'Debit', opening_debit: 800000000, opening_credit: 0 },
    { id: 5, account_code: '3311', account_name: 'Accounts Payable', account_type: 'Liability', normal_balance: 'Credit', opening_debit: 0, opening_credit: 600000000 },
  ];
  saveCSV('opening_balances.csv', bals);
  return bals;
};

// ============================================================
// SAVE CSV
// ============================================================
const saveCSV = (filename, rows) => {
  if (!rows || rows.length === 0) return;
  const filepath = path.join(OUTPUT_DIR, filename);
  // Delete existing file first to avoid lock issues
  try { fs.unlinkSync(filepath); } catch (e) { /* ignore if not exists */ }
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvLines.push(values.join(','));
  }
  fs.writeFileSync(filepath, '\ufeff' + csvLines.join('\n'), 'utf-8');
  console.log(`  -> ${filename}: ${rows.length} records`);
};

// ============================================================
// MAIN
// ============================================================
console.log('\n========================================');
console.log('ERP DEMO DATA GENERATOR');
console.log('========================================\n');

try {
  // Reference Data (must come first due to FK)
  generateDepartments();
  generatePaymentMethods();
  generateCarriers();
  generateAccounts();
  generateUnitsOfMeasure();
  generateSupplierTypes();
  generateLeadStages();
  
  // Users & Master Data
  generateUsers();
  generateCategories();
  generateProducts();
  generateCustomers();
  generateSuppliers();
  generateWarehouses();
  generateBinLocations();
  
  // Transactions (using lead_stages instead of crmStages)
  generateLeads();
  generateQuotations();
  generateSalesOrders();
  generateDeliveryOrders();
  generateGoodsReceipts();
  generateStockCounts();
  generateRFQs();
  generatePurchaseOrders();
  generateInvoices();
  generateBills();
  generateCreditNotes();
  generateDebitNotes();
  
  // Reference Data
  generateInitialInventory();
  generateOpeningBalances();
  
  console.log('\n========================================');
  console.log('DATA GENERATION COMPLETE');
  console.log('========================================');
  console.log('\nSummary:');
  console.log('  Master Data: 20 Categories, 500 Products, 1000 Customers, 1000 Suppliers, 5 Users, 3 Warehouses, 30 Bin Locations');
  console.log('  CRM: 100 Leads');
  console.log('  Sales: 100 Quotations, 50 Sales Orders, 50 Delivery Orders');
  console.log('  Purchase: 100 RFQs, 50 Purchase Orders, 50 Goods Receipts');
  console.log('  Inventory: 30 Stock Counts');
  console.log('  Accounting: 50 Invoices, 50 Vendor Bills, 10 Credit Notes, 10 Debit Notes');
  console.log(`\nFiles saved to: ${OUTPUT_DIR}\n`);
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
