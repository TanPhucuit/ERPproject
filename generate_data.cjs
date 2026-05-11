/**
 * NovaTech Distribution ERP - Comprehensive Data Generator
 * 
 * Generates realistic seed data for all ERP modules:
 * - Master Data: Categories, Products, Customers, Suppliers, Users, Warehouses, Bin Locations, UOM
 * - Sales: Quotations, Sales Orders, Delivery Orders, Customer Invoices, Credit Notes
 * - Purchase: RFQs, Purchase Orders, Goods Receipts, Vendor Bills, Debit Notes
 * - Inventory: Stock Counts, Initial Inventory
 * - Accounting: Opening Balances
 * - CRM: Opportunities, Stages
 * 
 * Run with: node generate_data.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURATION
// ============================================================

const OUTPUT_DIR = path.join(__dirname, 'generated_data');
const BATCH_SIZE = 500;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
const randomElement = (arr) => arr[randomInt(0, arr.length - 1)];
const randomDate = (start, end) => {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
};
const randomDateTime = (start, end) => {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().replace('T', ' ').split('.')[0];
};

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// ============================================================
// COMPANY & BUSINESS DATA
// ============================================================

const COMPANY_DATA = {
  name: 'NovaTech Distribution',
  slogan: 'SmartHome & IoT Distribution Excellence',
  address: '123 Nguyen Hue, District 1, Ho Chi Minh City',
  phone: '028-1234-5678',
  email: 'contact@novatech.vn',
  taxId: '0123456789',
};

const LOCATIONS = {
  cities: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Can Tho', 'Hai Phong', 'Bien Hoa'],
  districts: {
    'Ho Chi Minh City': ['District 1', 'District 2', 'District 3', 'District 4', 'District 5', 'District 7', 'District 9', 'Binh Thanh', 'Phu Nhuan', 'Tan Binh'],
    'Hanoi': ['Ba Dinh', 'Hoan Kiem', 'Hai Ba Trung', 'Dong Da', 'Cau Giay', 'Thanh Xuan', 'Long Bien', 'Gia Lam'],
    'Da Nang': ['Hai Chau', 'Thanh Khe', 'Son Tra', 'Lien Chieu', 'Cam Le', 'Ngu Hanh Son'],
    'Can Tho': ['Ninh Kieu', 'Binh Thuy', 'Cai Rang', 'O Mon', 'Thot Not'],
    'Hai Phong': ['Hong Bang', 'Le Chan', 'Ngo Quyen', 'Duong Kinh', 'Kien An'],
    'Bien Hoa': ['Bien Hoa 1', 'Bien Hoa 2', 'Tam Hiep', 'Long Binh', 'Trung Dung'],
  },
  streets: ['Nguyen Hue', 'Dien Bien Phu', 'Le Dai Hanh', 'Tran Hung Dao', 'Hai Ba Trung', 'Pho Chua', 'Dong Khoi', 'Le Thanh Ton'],
};

// ============================================================
// PRODUCT DATA - SmartHome & IoT
// ============================================================

const PRODUCT_CATEGORIES = [
  { name: 'Smart Cameras', description: 'IP cameras, Dome cameras, PTZ cameras, Doorbell cameras', display_order: 1, parent_id: '' },
  { name: 'Smart Lighting', description: 'Smart bulbs, LED strips, Light switches, Dimmer switches', display_order: 2, parent_id: '' },
  { name: 'Smart Security', description: 'Smart locks, Door sensors, Window sensors, Motion detectors', display_order: 3, parent_id: '' },
  { name: 'Climate Control', description: 'Smart thermostats, Air quality monitors, Humidity sensors', display_order: 4, parent_id: '' },
  { name: 'Home Entertainment', description: 'Smart speakers, Sound bars, Streaming devices', display_order: 5, parent_id: '' },
  { name: 'Networking', description: 'Routers, Mesh systems, WiFi extenders, Network switches', display_order: 6, parent_id: '' },
  { name: 'Smart Sensors', description: 'Temperature sensors, Water leak sensors, Gas sensors', display_order: 7, parent_id: '' },
  { name: 'Smart Plugs & Switches', description: 'Smart plugs, Smart switches, Power strips', display_order: 8, parent_id: '' },
  { name: 'Robotics', description: 'Robot vacuums, Robot mops, Pool cleaners', display_order: 9, parent_id: '' },
  { name: 'Smart Appliances', description: 'Smart refrigerators, Smart washing machines, Smart ovens', display_order: 10, parent_id: '' },
  { name: 'Smart Curtains & Blinds', description: 'Motorized curtains, Smart blinds, Sun sensors', display_order: 11, parent_id: '' },
  { name: 'Smart Doorbells', description: 'Video doorbells, Intercom systems, Gate controllers', display_order: 12, parent_id: '' },
  { name: 'Smart Hubs & Controllers', description: 'Central hubs, IR blasters, Universal remotes', display_order: 13, parent_id: '' },
  { name: 'Cables & Connectors', description: 'HDMI cables, USB cables, Network cables, Adapters', display_order: 14, parent_id: '' },
  { name: 'Accessories', description: 'Mounts, Stands, Cases, Batteries, Chargers', display_order: 15, parent_id: '' },
];

const PRODUCT_NAMES = {
  'Smart Cameras': ['IP Camera Pro 4K', 'Dome Camera Mini', 'PTZ Outdoor Camera', 'Doorbell Camera HD', 'Baby Monitor Smart', 'Fish Eye Camera 360'],
  'Smart Lighting': ['Smart Bulb RGB', 'LED Strip 5m', 'Dimmer Switch Pro', 'Light Sensor Kit', 'Ceiling Light Smart', 'Table Lamp WiFi'],
  'Smart Security': ['Smart Lock Fingerprint', 'Door Sensor Zigbee', 'Window Sensor V2', 'Motion Detector PIR', 'Glass Break Sensor', 'Security Hub Pro'],
  'Climate Control': ['Thermostat Learning', 'Air Quality Monitor', 'Humidity Sensor', 'Temperature Probe', 'Smart AC Controller', 'Fan Speed Controller'],
  'Home Entertainment': ['Smart Speaker Pro', 'Sound Bar 5.1', 'Streaming Stick 4K', 'Smart Remote Hub', 'Media Player NAS', 'TV Box Android'],
  'Networking': ['Router WiFi 6', 'Mesh System 3-Pack', 'WiFi Extender Pro', 'Network Switch 8-Port', 'PoE Injector Kit', 'Access Point Indoor'],
  'Smart Sensors': ['Temperature Sensor', 'Water Leak Detector', 'Gas Sensor MQ2', 'Light Sensor Lux', 'Vibration Sensor', 'Multi Sensor 4-in-1'],
  'Smart Plugs & Switches': ['Smart Plug Mini', 'Smart Switch 3-Gang', 'Power Strip 6-Outlet', 'USB Charger Smart', 'Timer Plug WiFi', 'Energy Monitor Plug'],
  'Robotics': ['Robot Vacuum Pro', 'Robot Mop Electric', 'Pool Cleaner Auto', 'Robot Window Cleaner', 'Robot Lawn Mower', 'Robot Arm Kit'],
  'Smart Appliances': ['Smart Fridge Cam', 'Smart Washing Machine', 'Smart Oven Mini', 'Smart Coffee Maker', 'Smart Kettle WiFi', 'Air Purifier Smart'],
  'Smart Curtains & Blinds': ['Motorized Curtain Track', 'Smart Blind Roller', 'Sun Sensor Outdoor', 'Curtain Motor DC', 'Blind Remote RF', 'Window Opener Motor'],
  'Smart Doorbells': ['Video Doorbell Pro', 'Intercom IP System', 'Gate Controller WiFi', 'Doorbell Chime', 'Doorbell Camera Solar', 'Smart Door Viewer'],
  'Smart Hubs & Controllers': ['Central Hub Zigbee', 'IR Blaster Universal', 'Remote Control Hub', 'Home Automation Kit', 'Scene Controller', 'Voice Control Hub'],
  'Cables & Connectors': ['HDMI Cable 2.1', 'USB-C Cable 100W', 'Network Cable Cat6', 'Power Cable Extension', 'Audio Cable Optical', 'Adapter Hub USB-C'],
  'Accessories': ['Wall Mount Universal', 'Camera Stand Tripod', 'Protection Case IP66', 'Battery Pack Li-Ion', 'Fast Charger 65W', 'Tool Kit Installation'],
};

const UOM_CODES = [
  { code: 'UNIT', name: 'Unit', abbreviation: 'pcs', is_integer: true, factor: 1 },
  { code: 'BOX', name: 'Box', abbreviation: 'box', is_integer: true, factor: 10 },
  { code: 'SET', name: 'Set', abbreviation: 'set', is_integer: true, factor: 1 },
  { code: 'PACK', name: 'Pack', abbreviation: 'pk', is_integer: true, factor: 5 },
  { code: 'METER', name: 'Meter', abbreviation: 'm', is_integer: false, factor: 1 },
  { code: 'ROLL', name: 'Roll', abbreviation: 'roll', is_integer: true, factor: 50 },
];

const SUPPLIER_TYPES = [
  { id: 1, name: 'Equipment & Product Suppliers' },
  { id: 2, name: 'Component & Part Suppliers' },
  { id: 3, name: 'Logistics & Transportation' },
  { id: 4, name: 'Service Providers' },
  { id: 5, name: 'Maintenance & Repair Services' },
];

// ============================================================
// CRM DATA
// ============================================================

const CRM_STAGES = [
  { name: 'New', probability_percent: 10, display_order: 1, color: '#6B7280', is_won_stage: false, is_lost_stage: false },
  { name: 'Site Survey', probability_percent: 25, display_order: 2, color: '#3B82F6', is_won_stage: false, is_lost_stage: false },
  { name: 'Proposition', probability_percent: 50, display_order: 3, color: '#F59E0B', is_won_stage: false, is_lost_stage: false },
  { name: 'Negotiation', probability_percent: 75, display_order: 4, color: '#8B5CF6', is_won_stage: false, is_lost_stage: false },
  { name: 'Won', probability_percent: 100, display_order: 5, color: '#10B981', is_won_stage: true, is_lost_stage: false },
  { name: 'Lost', probability_percent: 0, display_order: 6, color: '#EF4444', is_won_stage: false, is_lost_stage: true },
];

const LEAD_SOURCES = ['Website', 'Referral', 'Showroom', 'Architect Partner', 'Trade Show', 'Cold Call', 'Social Media', 'Partner Channel'];

// ============================================================
// BUSINESS NAME GENERATORS
// ============================================================

const generateCompanyName = () => {
  const prefixes = ['Global', 'Prime', 'Elite', 'Smart', 'Tech', 'Digital', 'Future', 'Nexus', 'Apex', 'Pro', 'Max', 'Ultra', 'Meta', 'Cyber', 'Net'];
  const suffixes = ['Tech', 'Systems', 'Solutions', 'Industries', 'Corp', 'Group', 'International', 'Vietnam', 'Asia', 'Pacific', 'Global', 'Ventures'];
  const types = ['Co.', 'Ltd.', 'Inc.', 'JSC', 'PLC'];
  return `${randomElement(prefixes)} ${randomElement(suffixes)} ${randomElement(types)}`;
};

const generateContactName = () => {
  const firstNames = ['John', 'Mary', 'David', 'Sarah', 'Michael', 'Jennifer', 'Robert', 'Lisa', 'James', 'Patricia', 'William', 'Linda', 'Richard', 'Elizabeth', 'Thomas', 'Helen', 'Charles', 'Nancy', 'Daniel', 'Karen', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Dorothy'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Nguyen'];
  return `${randomElement(firstNames)} ${randomElement(lastNames)}`;
};

const generateEmail = (name) => {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'company.com', 'business.vn'];
  const cleanName = name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '.');
  const patterns = [
    () => `${cleanName}@${randomElement(domains)}`,
    () => `${cleanName}.${randomInt(1, 99)}@${randomElement(domains)}`,
    () => `${cleanName[0]}${cleanName.split(' ')[1] || cleanName}@${randomElement(domains)}`,
  ];
  return randomElement(patterns)();
};

const generatePhone = () => {
  const prefixes = ['090', '091', '092', '093', '094', '095', '096', '097', '098', '099', '089', '088'];
  return `${randomElement(prefixes)}${randomInt(1000000, 9999999)}`;
};

const generateAddress = () => {
  const city = randomElement(LOCATIONS.cities);
  const district = randomElement(LOCATIONS.districts[city]);
  const street = randomElement(LOCATIONS.streets);
  const number = randomInt(1, 999);
  return `${number} ${street}, ${district}, ${city}`;
};

// ============================================================
// OPENING BALANCES DATA
// ============================================================

const ACCOUNT_TYPES = [
  { code: '1000', name: 'Cash and Cash Equivalents', type: 'asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset' },
  { code: '1200', name: 'Inventory', type: 'asset' },
  { code: '1500', name: 'Property, Plant & Equipment', type: 'asset' },
  { code: '1600', name: 'Other Assets', type: 'asset' },
  { code: '2000', name: 'Accounts Payable', type: 'liability' },
  { code: '2100', name: 'Notes Payable', type: 'liability' },
  { code: '2200', name: 'Accrued Expenses', type: 'liability' },
  { code: '2500', name: 'Long-term Debt', type: 'liability' },
  { code: '3000', name: 'Common Stock', type: 'equity' },
  { code: '3100', name: 'Retained Earnings', type: 'equity' },
  { code: '4000', name: 'Sales Revenue', type: 'revenue' },
  { code: '4100', name: 'Service Revenue', type: 'revenue' },
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
  { code: '5100', name: 'Operating Expenses', type: 'expense' },
  { code: '5200', name: 'Sales & Marketing Expenses', type: 'expense' },
  { code: '5300', name: 'Administrative Expenses', type: 'expense' },
];

// ============================================================
// CSV WRITER
// ============================================================

const writeCSV = (filename, headers, rows) => {
  const filepath = path.join(OUTPUT_DIR, filename);
  const headerLine = headers.join(',');
  const dataLines = rows.map(row => {
    // Handle both object format and array format
    const cells = Array.isArray(row) ? row : headers.map(h => row[h]);
    return cells.map(cell => {
      if (cell === null || cell === undefined || cell === '') return '""';
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    }).join(',');
  });
  fs.writeFileSync(filepath, [headerLine, ...dataLines].join('\n'), 'utf8');
  console.log(`  Generated: ${filename} (${rows.length} rows)`);
};

// ============================================================
// DATA GENERATORS
// ============================================================

const generateUsers = () => {
  const headers = ['id', 'email', 'password_hash', 'full_name', 'role', 'phone', 'status', 'avatar_url', 'created_at'];
  const users = [
    { id: 1, email: 'admin@novatech.vn', password_hash: 'hashed_password_admin', full_name: 'Nguyen Van Admin', role: 'Admin', phone: '0901234567', status: 'active', avatar_url: '', created_at: '2024-01-01 00:00:00' },
    { id: 2, email: 'sales@novatech.vn', password_hash: 'hashed_password_sales', full_name: 'Tran Thi Sales', role: 'Sales_Manager', phone: '0901234568', status: 'active', avatar_url: '', created_at: '2024-01-01 00:00:00' },
    { id: 3, email: 'purchase@novatech.vn', password_hash: 'hashed_password_purchase', full_name: 'Le Van Purchase', role: 'Purchasing_Manager', phone: '0901234569', status: 'active', avatar_url: '', created_at: '2024-01-01 00:00:00' },
    { id: 4, email: 'warehouse@novatech.vn', password_hash: 'hashed_password_warehouse', full_name: 'Pham Van Warehouse', role: 'Warehouse_Manager', phone: '0901234570', status: 'active', avatar_url: '', created_at: '2024-01-01 00:00:00' },
    { id: 5, email: 'accounting@novatech.vn', password_hash: 'hashed_password_accounting', full_name: 'Hoang Thi Accounting', role: 'Accountant', phone: '0901234571', status: 'active', avatar_url: '', created_at: '2024-01-01 00:00:00' },
  ];
  
  for (let i = 6; i <= 50; i++) {
    const roleOptions = ['Admin', 'Sales_Manager', 'Purchasing_Manager', 'Warehouse_Manager', 'Accountant', 'Sales', 'Purchasing', 'Warehouse_Staff', 'User'];
    const name = generateContactName();
    users.push({
      id: i,
      email: generateEmail(name).toLowerCase(),
      password_hash: `hashed_password_${i}`,
      full_name: name,
      role: randomElement(roleOptions),
      phone: generatePhone(),
      status: Math.random() > 0.1 ? 'active' : 'inactive',
      avatar_url: '',
      created_at: randomDateTime(new Date('2024-01-01'), new Date('2024-12-31')),
    });
  }
  
  writeCSV('users.csv', headers, users);
  return users;
};

const generateWarehouses = () => {
  const headers = ['id', 'warehouse_code', 'name', 'description', 'location_address', 'city', 'province', 'postal_code', 'capacity_sqm', 'current_occupancy_sqm', 'status', 'created_at'];
  const warehouses = [
    { id: 1, warehouse_code: 'WH-HCM-01', name: 'Ho Chi Minh Central Warehouse', description: 'Main distribution center for Southern Vietnam', location_address: '456 Industrial Zone 7, District 7, HCMC', city: 'Ho Chi Minh City', province: 'Ho Chi Minh City', postal_code: '700000', capacity_sqm: 5000, current_occupancy_sqm: 3200, status: 'active', created_at: '2024-01-01 00:00:00' },
    { id: 2, warehouse_code: 'WH-HN-01', name: 'Hanoi Distribution Center', description: 'Main distribution center for Northern Vietnam', location_address: '789 Industrial Park, Long Bien, Hanoi', city: 'Hanoi', province: 'Hanoi', postal_code: '100000', capacity_sqm: 4500, current_occupancy_sqm: 2800, status: 'active', created_at: '2024-01-01 00:00:00' },
    { id: 3, warehouse_code: 'WH-SRV-01', name: 'Service & Warranty Center', description: 'Returns processing and warranty service center', location_address: '123 Le Dai Hanh, Hai Ba Trung, Hanoi', city: 'Hanoi', province: 'Hanoi', postal_code: '100000', capacity_sqm: 1500, current_occupancy_sqm: 450, status: 'active', created_at: '2024-01-01 00:00:00' },
    { id: 4, warehouse_code: 'WH-HCM-02', name: 'Showroom Storage', description: 'Storage for showroom display items', location_address: '88 Nguyen Hue, District 1, HCMC', city: 'Ho Chi Minh City', province: 'Ho Chi Minh City', postal_code: '700000', capacity_sqm: 800, current_occupancy_sqm: 600, status: 'active', created_at: '2024-06-01 00:00:00' },
    { id: 5, warehouse_code: 'WH-DN-01', name: 'Da Nang Regional Hub', description: 'Central Vietnam distribution hub', location_address: '56 Hoang Dieu, Hai Chau, Da Nang', city: 'Da Nang', province: 'Da Nang', postal_code: '550000', capacity_sqm: 2000, current_occupancy_sqm: 1200, status: 'active', created_at: '2024-03-01 00:00:00' },
  ];
  
  writeCSV('warehouses.csv', headers, warehouses);
  return warehouses;
};

const generateBinLocations = (warehouses) => {
  const headers = ['id', 'warehouse_id', 'bin_code', 'description', 'capacity_units', 'current_occupancy_units', 'status', 'created_at'];
  const binLocations = [];
  let id = 1;
  
  const binTypes = ['A', 'B', 'C', 'D']; // A=High value, B=Medium, C=Low, D=Bulk
  
  warehouses.forEach(warehouse => {
    for (let row = 1; row <= 10; row++) {
      for (let rack = 1; rack <= 5; rack++) {
        for (let level = 1; level <= 4; level++) {
          const binType = row <= 3 ? 'A' : row <= 6 ? 'B' : row <= 8 ? 'C' : 'D';
          binLocations.push({
            id: id++,
            warehouse_id: warehouse.id,
            bin_code: `${warehouse.warehouse_code}-${binType}-R${String(row).padStart(2, '0')}-${String(rack).padStart(2, '0')}-L${level}`,
            description: `Row ${row}, Rack ${rack}, Level ${level} (${binType} zone)`,
            capacity_units: binType === 'D' ? 100 : binType === 'A' ? 20 : 50,
            current_occupancy_units: randomInt(0, binType === 'D' ? 80 : binType === 'A' ? 15 : 40),
            status: 'active',
            created_at: '2024-01-01 00:00:00',
          });
        }
      }
    }
  });
  
  writeCSV('bin_locations.csv', headers, binLocations);
  return binLocations;
};

const generateUnitsOfMeasure = () => {
  const headers = ['id', 'code', 'name', 'abbreviation', 'is_integer', 'factor', 'created_at'];
  const uoms = UOM_CODES.map((uom, idx) => ({
    id: idx + 1,
    code: uom.code,
    name: uom.name,
    abbreviation: uom.abbreviation,
    is_integer: uom.is_integer ? 'true' : 'false',
    factor: uom.factor,
    created_at: '2024-01-01 00:00:00',
  }));
  
  writeCSV('units_of_measure.csv', headers, uoms);
  return uoms;
};

const generateProductCategories = () => {
  const headers = ['id', 'name', 'description', 'display_order', 'parent_id', 'created_at'];
  const categories = PRODUCT_CATEGORIES.map((cat, idx) => ({
    id: idx + 1,
    name: cat.name,
    description: cat.description,
    display_order: cat.display_order,
    parent_id: cat.parent_id,
    created_at: '2024-01-01 00:00:00',
  }));
  
  writeCSV('product_categories.csv', headers, categories);
  return categories;
};

const generateProducts = (categories, uoms) => {
  const headers = ['id', 'sku', 'name', 'description', 'category_id', 'uom_id', 'list_price', 'cost_price', 'reorder_level', 'reorder_quantity', 'barcode', 'image_url', 'status', 'weight_kg', 'dimensions_cm', 'created_at'];
  const products = [];
  let id = 1;
  
  categories.forEach(category => {
    const productNames = PRODUCT_NAMES[category.name] || [`${category.name} Product 1`, `${category.name} Product 2`];
    productNames.forEach(productName => {
      const basePrice = randomFloat(50, 2000, 2);
      const costPrice = basePrice * randomFloat(0.55, 0.75, 2);
      products.push({
        id: id++,
        sku: `SKU-${category.id.toString().padStart(3, '0')}-${id.toString().padStart(4, '0')}`,
        name: productName,
        description: `High-quality ${productName} for SmartHome applications. Features advanced technology and reliable performance.`,
        category_id: category.id,
        uom_id: randomElement(uoms).id,
        list_price: basePrice,
        cost_price: costPrice,
        reorder_level: randomInt(5, 50),
        reorder_quantity: randomInt(20, 200),
        barcode: `${randomInt(100000000000, 999999999999)}`,
        image_url: `/images/products/${productName.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        status: Math.random() > 0.05 ? 'active' : 'discontinued',
        weight_kg: randomFloat(0.1, 15, 2),
        dimensions_cm: `${randomInt(5, 50)}x${randomInt(5, 40)}x${randomInt(2, 30)}`,
        created_at: randomDateTime(new Date('2024-01-01'), new Date('2024-12-31')),
      });
    });
  });
  
  writeCSV('products.csv', headers, products);
  return products;
};

const generateCustomers = () => {
  const headers = ['id', 'customer_number', 'name', 'customer_type', 'contact_person_name', 'contact_person_email', 'contact_person_phone', 'billing_address', 'shipping_address', 'payment_terms', 'credit_limit', 'tax_code', 'status', 'notes', 'created_at'];
  const customers = [];
  
  // B2B Customers
  for (let i = 1; i <= 100; i++) {
    const name = generateCompanyName();
    const contactName = generateContactName();
    const billingAddress = generateAddress();
    customers.push({
      id: i,
      customer_number: `CUS-B2B-${i.toString().padStart(4, '0')}`,
      name: name,
      customer_type: 'B2B',
      contact_person_name: contactName,
      contact_person_email: generateEmail(contactName),
      contact_person_phone: generatePhone(),
      billing_address: billingAddress,
      shipping_address: billingAddress,
      payment_terms: randomElement(['NET15', 'NET30', 'NET45', 'NET60', 'COD', 'Prepaid']),
      credit_limit: randomInt(50000000, 500000000),
      tax_code: `${randomInt(1000000000, 9999999999)}`,
      status: Math.random() > 0.1 ? 'active' : 'inactive',
      notes: '',
      created_at: randomDateTime(new Date('2024-01-01'), new Date('2024-12-31')),
    });
  }
  
  // B2C Customers
  for (let i = 101; i <= 200; i++) {
    const name = generateContactName();
    customers.push({
      id: i,
      customer_number: `CUS-B2C-${i.toString().padStart(4, '0')}`,
      name: name,
      customer_type: 'B2C',
      contact_person_name: name,
      contact_person_email: generateEmail(name),
      contact_person_phone: generatePhone(),
      billing_address: generateAddress(),
      shipping_address: generateAddress(),
      payment_terms: randomElement(['COD', 'Prepaid', 'NET15']),
      credit_limit: randomInt(1000000, 10000000),
      tax_code: '',
      status: Math.random() > 0.05 ? 'active' : 'inactive',
      notes: '',
      created_at: randomDateTime(new Date('2024-01-01'), new Date('2024-12-31')),
    });
  }
  
  writeCSV('customers.csv', headers, customers);
  return customers;
};

const generateSuppliers = () => {
  const headers = ['id', 'supplier_number', 'name', 'supplier_type_id', 'contact_person_name', 'contact_person_email', 'contact_person_phone', 'company_address', 'payment_terms', 'average_lead_time_days', 'quality_rating', 'tax_code', 'status', 'notes', 'created_at'];
  const suppliers = [];
  
  for (let i = 1; i <= 60; i++) {
    const name = generateCompanyName();
    const contactName = generateContactName();
    suppliers.push({
      id: i,
      supplier_number: `SUP-${i.toString().padStart(4, '0')}`,
      name: name,
      supplier_type_id: randomElement(SUPPLIER_TYPES).id,
      contact_person_name: contactName,
      contact_person_email: generateEmail(contactName),
      contact_person_phone: generatePhone(),
      company_address: generateAddress(),
      payment_terms: randomElement(['NET30', 'NET45', 'NET60', 'COD', 'Prepaid']),
      average_lead_time_days: randomInt(2, 14),
      quality_rating: randomFloat(3.0, 5.0, 1),
      tax_code: `${randomInt(1000000000, 9999999999)}`,
      status: Math.random() > 0.1 ? 'active' : 'inactive',
      notes: '',
      created_at: randomDateTime(new Date('2024-01-01'), new Date('2024-12-31')),
    });
  }
  
  writeCSV('suppliers.csv', headers, suppliers);
  return suppliers;
};

const generateCRMStages = () => {
  const headers = ['id', 'name', 'probability_percent', 'display_order', 'color', 'is_won_stage', 'is_lost_stage', 'created_at'];
  const stages = CRM_STAGES.map((stage, idx) => ({
    id: idx + 1,
    name: stage.name,
    probability_percent: stage.probability_percent,
    display_order: stage.display_order,
    color: stage.color,
    is_won_stage: stage.is_won_stage ? 'true' : 'false',
    is_lost_stage: stage.is_lost_stage ? 'true' : 'false',
    created_at: '2024-01-01 00:00:00',
  }));
  
  writeCSV('crm_stages.csv', headers, stages);
  return stages;
};

const generateCRMOportunities = (customers, stages) => {
  const headers = ['id', 'lead_number', 'company_name', 'contact_person_name', 'contact_person_email', 'contact_person_phone', 'stage_id', 'lead_source', 'estimated_value', 'probability_percent', 'expected_close_date', 'actual_close_date', 'notes', 'internal_notes', 'next_follow_up_date', 'assigned_to_user_id', 'created_at', 'updated_at'];
  const opportunities = [];
  
  for (let i = 1; i <= 150; i++) {
    const customer = randomElement(customers);
    const stage = randomElement(stages);
    const expectedCloseDate = stage.is_won_stage || stage.is_lost_stage ? null : randomDate(new Date('2025-01-01'), new Date('2025-12-31'));
    const actualCloseDate = stage.is_won_stage ? randomDate(new Date('2024-06-01'), new Date('2025-03-31')) : null;
    opportunities.push({
      id: i,
      lead_number: `LEAD-${i.toString().padStart(5, '0')}`,
      company_name: customer.customer_type === 'B2B' ? customer.name : `Individual - ${customer.contact_person_name}`,
      contact_person_name: customer.contact_person_name,
      contact_person_email: customer.contact_person_email,
      contact_person_phone: customer.contact_person_phone,
      stage_id: stage.id,
      lead_source: randomElement(LEAD_SOURCES),
      estimated_value: randomFloat(5000000, 500000000, 0),
      probability_percent: stage.probability_percent,
      expected_close_date: expectedCloseDate || '',
      actual_close_date: actualCloseDate || '',
      notes: '',
      internal_notes: '',
      next_follow_up_date: stage.is_won_stage || stage.is_lost_stage ? '' : randomDate(new Date('2025-04-01'), new Date('2025-06-30')),
      assigned_to_user_id: randomInt(1, 10),
      created_at: randomDateTime(new Date('2024-01-01'), new Date('2024-12-31')),
      updated_at: randomDateTime(new Date('2024-06-01'), new Date('2025-05-01')),
    });
  }
  
  writeCSV('crm_opportunities.csv', headers, opportunities);
  return opportunities;
};

const generateSalesQuotations = (customers, products, users) => {
  const headers = ['id', 'quotation_number', 'customer_id', 'user_id', 'lead_id', 'quote_date', 'valid_until_date', 'status', 'total_amount', 'discount_percent', 'tax_percent', 'notes', 'description', 'internal_notes', 'created_at', 'updated_at'];
  const quotations = [];
  const statuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
  
  for (let i = 1; i <= 200; i++) {
    const customer = randomElement(customers.filter(c => c.status === 'active'));
    const status = randomElement(statuses);
    const quoteDate = randomDate(new Date('2024-01-01'), new Date('2025-03-31'));
    const totalAmount = randomFloat(5000000, 100000000, 0);
    quotations.push({
      id: i,
      quotation_number: `QT-${quoteDate.split('-')[0]}-${i.toString().padStart(5, '0')}`,
      customer_id: customer.id,
      user_id: randomElement(users.filter(u => u.role.includes('Sales') || u.role === 'Admin')).id,
      lead_id: null,
      quote_date: quoteDate,
      valid_until_date: new Date(new Date(quoteDate).setDate(new Date(quoteDate).getDate() + 30)).toISOString().split('T')[0],
      status: status,
      total_amount: totalAmount,
      discount_percent: Math.random() > 0.7 ? randomFloat(0, 15, 2) : 0,
      tax_percent: 10,
      notes: '',
      description: '',
      internal_notes: '',
      created_at: quoteDate,
      updated_at: randomDateTime(new Date(quoteDate), new Date('2025-04-01')),
    });
  }
  
  writeCSV('sales_quotations.csv', headers, quotations);
  return quotations;
};

const generateSalesOrders = (customers, quotations, users) => {
  const headers = ['id', 'sales_order_number', 'quotation_id', 'customer_id', 'user_id', 'order_date', 'required_delivery_date', 'shipped_date', 'status', 'total_amount', 'discount_amount', 'tax_amount', 'shipping_address', 'notes', 'internal_notes', 'created_at', 'updated_at'];
  const orders = [];
  const statuses = ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  for (let i = 1; i <= 150; i++) {
    const customer = randomElement(customers.filter(c => c.status === 'active'));
    const status = randomElement(statuses);
    const orderDate = randomDate(new Date('2024-01-01'), new Date('2025-04-15'));
    const totalAmount = randomFloat(5000000, 150000000, 0);
    orders.push({
      id: i,
      sales_order_number: `SO-${orderDate.split('-')[0]}-${i.toString().padStart(5, '0')}`,
      quotation_id: Math.random() > 0.3 ? randomElement(quotations.filter(q => q.status === 'accepted')).id : null,
      customer_id: customer.id,
      user_id: randomElement(users.filter(u => u.role.includes('Sales') || u.role === 'Admin')).id,
      order_date: orderDate,
      required_delivery_date: new Date(new Date(orderDate).setDate(new Date(orderDate).getDate() + randomInt(7, 45))).toISOString().split('T')[0],
      shipped_date: ['shipped', 'delivered'].includes(status) ? randomDate(new Date(orderDate), new Date('2025-04-30')) : '',
      status: status,
      total_amount: totalAmount,
      discount_amount: Math.random() > 0.5 ? randomFloat(0, totalAmount * 0.1, 0) : 0,
      tax_amount: totalAmount * 0.1,
      shipping_address: customer.shipping_address || customer.billing_address,
      notes: '',
      internal_notes: '',
      created_at: orderDate,
      updated_at: randomDateTime(new Date(orderDate), new Date('2025-04-30')),
    });
  }
  
  writeCSV('sales_orders.csv', headers, orders);
  return orders;
};

const generateDeliveryOrders = (salesOrders, warehouses, customers) => {
  const headers = ['id', 'delivery_order_number', 'sales_order_id', 'warehouse_id', 'customer_id', 'scheduled_delivery_date', 'actual_delivery_date', 'status', 'notes', 'created_at', 'updated_at'];
  const deliveries = [];
  const statuses = ['draft', 'ready', 'picked', 'shipped', 'in_transit', 'delivered', 'cancelled'];
  
  for (let i = 1; i <= 100; i++) {
    const order = randomElement(salesOrders.filter(o => ['confirmed', 'processing', 'shipped', 'delivered'].includes(o.status)));
    const status = randomElement(statuses);
    const warehouse = randomElement(warehouses);
    deliveries.push({
      id: i,
      delivery_order_number: `DO-${i.toString().padStart(5, '0')}`,
      sales_order_id: order.id,
      warehouse_id: warehouse.id,
      customer_id: order.customer_id,
      scheduled_delivery_date: order.required_delivery_date,
      actual_delivery_date: ['delivered'].includes(status) ? randomDate(new Date(order.required_delivery_date), new Date('2025-04-30')) : '',
      status: status,
      notes: '',
      created_at: order.order_date,
      updated_at: randomDateTime(new Date(order.order_date), new Date('2025-04-30')),
    });
  }
  
  writeCSV('delivery_orders.csv', headers, deliveries);
  return deliveries;
};

const generatePurchaseRFQs = (suppliers, users) => {
  const headers = ['id', 'rfq_number', 'user_id', 'issued_date', 'closing_date', 'status', 'total_estimated_cost', 'description', 'notes', 'created_at', 'updated_at'];
  const rfqs = [];
  const statuses = ['draft', 'sent', 'awarded', 'cancelled', 'closed'];
  
  for (let i = 1; i <= 100; i++) {
    const issuedDate = randomDate(new Date('2024-01-01'), new Date('2025-03-31'));
    const status = randomElement(statuses);
    rfqs.push({
      id: i,
      rfq_number: `RFQ-${issuedDate.split('-')[0]}-${i.toString().padStart(5, '0')}`,
      user_id: randomElement(users.filter(u => u.role.includes('Purchasing') || u.role === 'Admin')).id,
      issued_date: issuedDate,
      closing_date: new Date(new Date(issuedDate).setDate(new Date(issuedDate).getDate() + randomInt(7, 30))).toISOString().split('T')[0],
      status: status,
      total_estimated_cost: randomFloat(10000000, 500000000, 0),
      description: `Request for quotation - SmartHome products batch ${i}`,
      notes: '',
      created_at: issuedDate,
      updated_at: randomDateTime(new Date(issuedDate), new Date('2025-04-01')),
    });
  }
  
  writeCSV('purchase_rfqs.csv', headers, rfqs);
  return rfqs;
};

const generatePurchaseOrders = (suppliers, rfqs, users) => {
  const headers = ['id', 'purchase_order_number', 'rfq_id', 'supplier_id', 'user_id', 'order_date', 'required_delivery_date', 'received_date', 'status', 'total_amount', 'discount_amount', 'tax_amount', 'notes', 'internal_notes', 'created_at', 'updated_at'];
  const orders = [];
  const statuses = ['draft', 'confirmed', 'partial_received', 'received', 'cancelled'];
  
  for (let i = 1; i <= 100; i++) {
    const supplier = randomElement(suppliers.filter(s => s.status === 'active'));
    const status = randomElement(statuses);
    const orderDate = randomDate(new Date('2024-01-01'), new Date('2025-04-15'));
    const totalAmount = randomFloat(10000000, 200000000, 0);
    orders.push({
      id: i,
      purchase_order_number: `PO-${orderDate.split('-')[0]}-${i.toString().padStart(5, '0')}`,
      rfq_id: Math.random() > 0.4 ? randomElement(rfqs.filter(r => r.status === 'awarded')).id : null,
      supplier_id: supplier.id,
      user_id: randomElement(users.filter(u => u.role.includes('Purchasing') || u.role === 'Admin')).id,
      order_date: orderDate,
      required_delivery_date: new Date(new Date(orderDate).setDate(new Date(orderDate).getDate() + supplier.average_lead_time_days + randomInt(3, 14))).toISOString().split('T')[0],
      received_date: ['received', 'partial_received'].includes(status) ? randomDate(new Date(orderDate), new Date('2025-04-30')) : '',
      status: status,
      total_amount: totalAmount,
      discount_amount: Math.random() > 0.6 ? randomFloat(0, totalAmount * 0.05, 0) : 0,
      tax_amount: totalAmount * 0.1,
      notes: '',
      internal_notes: '',
      created_at: orderDate,
      updated_at: randomDateTime(new Date(orderDate), new Date('2025-04-30')),
    });
  }
  
  writeCSV('purchase_orders.csv', headers, orders);
  return orders;
};

const generateGoodsReceipts = (purchaseOrders, warehouses, suppliers) => {
  const headers = ['id', 'goods_receipt_number', 'purchase_order_id', 'warehouse_id', 'supplier_id', 'received_date', 'status', 'notes', 'quality_check_notes', 'created_at', 'updated_at'];
  const receipts = [];
  const statuses = ['draft', 'received', 'verified', 'completed', 'cancelled'];
  
  for (let i = 1; i <= 80; i++) {
    const po = randomElement(purchaseOrders.filter(p => ['received', 'partial_received', 'confirmed'].includes(p.status)));
    const status = randomElement(statuses);
    const warehouse = randomElement(warehouses);
    receipts.push({
      id: i,
      goods_receipt_number: `GR-${i.toString().padStart(5, '0')}`,
      purchase_order_id: po.id,
      warehouse_id: warehouse.id,
      supplier_id: po.supplier_id,
      received_date: po.received_date || randomDate(new Date(po.order_date), new Date('2025-04-30')),
      status: status,
      notes: '',
      quality_check_notes: status === 'verified' ? 'Quality check passed' : '',
      created_at: po.order_date,
      updated_at: randomDateTime(new Date(po.order_date), new Date('2025-04-30')),
    });
  }
  
  writeCSV('goods_receipts.csv', headers, receipts);
  return receipts;
};

const generateCustomerInvoices = (customers, salesOrders) => {
  const headers = ['id', 'invoice_number', 'customer_id', 'sales_order_id', 'invoice_date', 'due_date', 'paid_date', 'status', 'total_amount', 'tax_amount', 'discount_amount', 'payment_terms', 'description', 'notes', 'created_at', 'updated_at'];
  const invoices = [];
  const statuses = ['draft', 'issued', 'sent', 'partial_paid', 'paid', 'overdue', 'cancelled'];
  
  for (let i = 1; i <= 120; i++) {
    const customer = randomElement(customers.filter(c => c.status === 'active'));
    const order = randomElement(salesOrders.filter(o => ['delivered', 'shipped'].includes(o.status)));
    const status = randomElement(statuses);
    const invoiceDate = order ? randomDate(new Date(order.required_delivery_date), new Date('2025-04-15')) : randomDate(new Date('2024-01-01'), new Date('2025-04-15'));
    const totalAmount = order ? order.total_amount : randomFloat(5000000, 100000000, 0);
    invoices.push({
      id: i,
      invoice_number: `INV-${invoiceDate.split('-')[0]}-${i.toString().padStart(5, '0')}`,
      customer_id: customer.id,
      sales_order_id: order ? order.id : null,
      invoice_date: invoiceDate,
      due_date: new Date(new Date(invoiceDate).setDate(new Date(invoiceDate).getDate() + (customer.payment_terms === 'NET60' ? 60 : customer.payment_terms === 'NET45' ? 45 : customer.payment_terms === 'NET30' ? 30 : 15))).toISOString().split('T')[0],
      paid_date: ['paid', 'partial_paid'].includes(status) ? randomDate(new Date(invoiceDate), new Date('2025-04-30')) : '',
      status: status,
      total_amount: totalAmount,
      tax_amount: totalAmount * 0.1,
      discount_amount: Math.random() > 0.7 ? randomFloat(0, totalAmount * 0.05, 0) : 0,
      payment_terms: customer.payment_terms,
      description: '',
      notes: '',
      created_at: invoiceDate,
      updated_at: randomDateTime(new Date(invoiceDate), new Date('2025-04-30')),
    });
  }
  
  writeCSV('customer_invoices.csv', headers, invoices);
  return invoices;
};

const generateVendorBills = (suppliers, purchaseOrders) => {
  const headers = ['id', 'bill_number', 'supplier_id', 'purchase_order_id', 'bill_date', 'due_date', 'paid_date', 'status', 'total_amount', 'tax_amount', 'discount_amount', 'payment_terms', 'notes', 'created_at', 'updated_at'];
  const bills = [];
  const statuses = ['draft', 'issued', 'sent', 'partial_paid', 'paid', 'overdue', 'cancelled'];
  
  for (let i = 1; i <= 80; i++) {
    const supplier = randomElement(suppliers.filter(s => s.status === 'active'));
    const order = randomElement(purchaseOrders.filter(p => ['received', 'partial_received'].includes(p.status)));
    const status = randomElement(statuses);
    const billDate = order ? randomDate(new Date(order.received_date || order.order_date), new Date('2025-04-15')) : randomDate(new Date('2024-01-01'), new Date('2025-04-15'));
    const totalAmount = order ? order.total_amount : randomFloat(10000000, 200000000, 0);
    bills.push({
      id: i,
      bill_number: `BILL-${billDate.split('-')[0]}-${i.toString().padStart(5, '0')}`,
      supplier_id: supplier.id,
      purchase_order_id: order ? order.id : null,
      bill_date: billDate,
      due_date: new Date(new Date(billDate).setDate(new Date(billDate).getDate() + (supplier.payment_terms === 'NET60' ? 60 : supplier.payment_terms === 'NET45' ? 45 : 30))).toISOString().split('T')[0],
      paid_date: ['paid', 'partial_paid'].includes(status) ? randomDate(new Date(billDate), new Date('2025-04-30')) : '',
      status: status,
      total_amount: totalAmount,
      tax_amount: totalAmount * 0.1,
      discount_amount: Math.random() > 0.8 ? randomFloat(0, totalAmount * 0.03, 0) : 0,
      payment_terms: supplier.payment_terms,
      notes: '',
      created_at: billDate,
      updated_at: randomDateTime(new Date(billDate), new Date('2025-04-30')),
    });
  }
  
  writeCSV('vendor_bills.csv', headers, bills);
  return bills;
};

const generateCreditNotes = (customers, invoices) => {
  const headers = ['id', 'credit_note_number', 'customer_id', 'invoice_id', 'reason', 'credit_date', 'status', 'total_amount', 'description', 'notes', 'created_at', 'updated_at'];
  const creditNotes = [];
  const statuses = ['draft', 'posted', 'applied', 'cancelled'];
  
  for (let i = 1; i <= 30; i++) {
    const customer = randomElement(customers.filter(c => c.status === 'active'));
    const invoice = randomElement(invoices.filter(inv => inv.customer_id === customer.id && ['paid', 'partial_paid'].includes(inv.status)));
    const reasons = ['Customer Return', 'Damaged Goods', 'Wrong Item Shipped', 'Price Adjustment', 'Overcharge', 'Quality Issue', 'Cancelled Order'];
    creditNotes.push({
      id: i,
      credit_note_number: `CN-${new Date().getFullYear()}-${i.toString().padStart(5, '0')}`,
      customer_id: customer.id,
      invoice_id: invoice ? invoice.id : null,
      reason: randomElement(reasons),
      credit_date: invoice ? randomDate(new Date(invoice.invoice_date), new Date('2025-04-30')) : randomDate(new Date('2024-01-01'), new Date('2025-04-30')),
      status: randomElement(statuses),
      total_amount: invoice ? randomFloat(100000, invoice.total_amount * 0.3, 0) : randomFloat(100000, 10000000, 0),
      description: '',
      notes: '',
      created_at: randomDateTime(new Date('2024-01-01'), new Date('2025-04-30')),
      updated_at: randomDateTime(new Date('2024-01-01'), new Date('2025-04-30')),
    });
  }
  
  writeCSV('credit_notes.csv', headers, creditNotes);
  return creditNotes;
};

const generateDebitNotes = (suppliers, bills) => {
  const headers = ['id', 'debit_note_number', 'supplier_id', 'bill_id', 'reason', 'debit_date', 'status', 'total_amount', 'description', 'notes', 'created_at', 'updated_at'];
  const debitNotes = [];
  const statuses = ['draft', 'posted', 'applied', 'cancelled'];
  
  for (let i = 1; i <= 25; i++) {
    const supplier = randomElement(suppliers.filter(s => s.status === 'active'));
    const bill = randomElement(bills.filter(b => b.supplier_id === supplier.id && ['paid', 'partial_paid'].includes(b.status)));
    const reasons = ['Supplier Return', 'Damaged Goods Received', 'Wrong Item Delivered', 'Price Adjustment', 'Undercharge', 'Quality Issue', 'Shortage Claim'];
    debitNotes.push({
      id: i,
      debit_note_number: `DN-${new Date().getFullYear()}-${i.toString().padStart(5, '0')}`,
      supplier_id: supplier.id,
      bill_id: bill ? bill.id : null,
      reason: randomElement(reasons),
      debit_date: bill ? randomDate(new Date(bill.bill_date), new Date('2025-04-30')) : randomDate(new Date('2024-01-01'), new Date('2025-04-30')),
      status: randomElement(statuses),
      total_amount: bill ? randomFloat(100000, bill.total_amount * 0.25, 0) : randomFloat(100000, 15000000, 0),
      description: '',
      notes: '',
      created_at: randomDateTime(new Date('2024-01-01'), new Date('2025-04-30')),
      updated_at: randomDateTime(new Date('2024-01-01'), new Date('2025-04-30')),
    });
  }
  
  writeCSV('debit_notes.csv', headers, debitNotes);
  return debitNotes;
};

const generateStockCounts = (warehouses, binLocations, products) => {
  const headers = ['id', 'count_number', 'warehouse_id', 'bin_location_id', 'product_id', 'system_quantity', 'counted_quantity', 'variance', 'variance_reason', 'count_date', 'counted_by_user_id', 'verified_by_user_id', 'status', 'notes', 'created_at', 'updated_at'];
  const counts = [];
  const statuses = ['draft', 'confirmed', 'completed', 'cancelled'];
  
  for (let i = 1; i <= 50; i++) {
    const warehouse = randomElement(warehouses);
    const filteredBins = binLocations.filter(b => b.warehouse_id === warehouse.id);
    const bin = filteredBins.length > 0 ? randomElement(filteredBins) : randomElement(binLocations);
    const product = randomElement(products);
    const systemQty = randomInt(10, 200);
    const countedQty = systemQty + randomInt(-10, 10);
    const variance = countedQty - systemQty;
    
    counts.push({
      id: i,
      count_number: `SC-${new Date().getFullYear()}-${i.toString().padStart(5, '0')}`,
      warehouse_id: warehouse.id,
      bin_location_id: bin.id,
      product_id: product.id,
      system_quantity: systemQty,
      counted_quantity: countedQty,
      variance: variance,
      variance_reason: variance === 0 ? '' : (variance > 0 ? 'Found extra items' : 'Missing items'),
      count_date: randomDate(new Date('2024-06-01'), new Date('2025-04-15')),
      counted_by_user_id: randomInt(4, 10),
      verified_by_user_id: randomInt(2, 5),
      status: randomElement(statuses),
      notes: '',
      created_at: randomDateTime(new Date('2024-06-01'), new Date('2025-04-15')),
      updated_at: randomDateTime(new Date('2024-06-01'), new Date('2025-04-30')),
    });
  }
  
  writeCSV('stock_counts.csv', headers, counts);
  return counts;
};

const generateInitialInventory = (products, warehouses, binLocations) => {
  const headers = ['id', 'product_id', 'warehouse_id', 'bin_location_id', 'quantity_on_hand', 'last_count_date', 'created_at'];
  const inventory = [];
  
  products.forEach(product => {
    const warehouse = randomElement(warehouses);
    const filteredBins = binLocations.filter(b => b.warehouse_id === warehouse.id);
    const bin = filteredBins.length > 0 ? randomElement(filteredBins) : randomElement(binLocations);
    
    inventory.push({
      id: inventory.length + 1,
      product_id: product.id,
      warehouse_id: warehouse.id,
      bin_location_id: bin.id,
      quantity_on_hand: randomInt(product.reorder_level + 10, product.reorder_level + 200),
      last_count_date: randomDate(new Date('2024-01-01'), new Date('2024-03-31')),
      created_at: '2024-01-01 00:00:00',
    });
  });
  
  writeCSV('initial_inventory.csv', headers, inventory);
  return inventory;
};

const generateOpeningBalances = () => {
  const headers = ['id', 'account_code', 'account_name', 'account_type', 'opening_debit', 'opening_credit', 'as_of_date', 'description', 'created_at'];
  const balances = [];
  
  ACCOUNT_TYPES.forEach((account, idx) => {
    const isDebitNormal = ['asset', 'expense'].includes(account.type);
    const isCreditNormal = ['liability', 'equity', 'revenue'].includes(account.type);
    
    let openingDebit = '';
    let openingCredit = '';
    
    if (isDebitNormal && Math.random() > 0.3) {
      openingDebit = randomFloat(1000000, 1000000000, 0);
    } else if (isCreditNormal && Math.random() > 0.3) {
      openingCredit = randomFloat(1000000, 1000000000, 0);
    }
    
    balances.push({
      id: idx + 1,
      account_code: account.code,
      account_name: account.name,
      account_type: account.type,
      opening_debit: openingDebit,
      opening_credit: openingCredit,
      as_of_date: '2024-01-01',
      description: `${account.type.charAt(0).toUpperCase() + account.type.slice(1)} account`,
      created_at: '2024-01-01 00:00:00',
    });
  });
  
  writeCSV('opening_balances.csv', headers, balances);
  return balances;
};

// ============================================================
// MAIN EXECUTION
// ============================================================

console.log('\n========================================');
console.log('NovaTech Distribution ERP - Data Generator');
console.log('========================================\n');

console.log('Generating master data...');
const users = generateUsers();
const warehouses = generateWarehouses();
const binLocations = generateBinLocations(warehouses);
const uoms = generateUnitsOfMeasure();
const categories = generateProductCategories();
const products = generateProducts(categories, uoms);
const customers = generateCustomers();
const suppliers = generateSuppliers();

console.log('\nGenerating CRM data...');
const stages = generateCRMStages();
const opportunities = generateCRMOportunities(customers, stages);

console.log('\nGenerating sales data...');
const quotations = generateSalesQuotations(customers, products, users);
const salesOrders = generateSalesOrders(customers, quotations, users);
const deliveries = generateDeliveryOrders(salesOrders, warehouses, customers);

console.log('\nGenerating purchase data...');
const rfqs = generatePurchaseRFQs(suppliers, users);
const purchaseOrders = generatePurchaseOrders(suppliers, rfqs, users);
const goodsReceipts = generateGoodsReceipts(purchaseOrders, warehouses, suppliers);

console.log('\nGenerating accounting data...');
const invoices = generateCustomerInvoices(customers, salesOrders);
const vendorBills = generateVendorBills(suppliers, purchaseOrders);
const creditNotes = generateCreditNotes(customers, invoices);
const debitNotes = generateDebitNotes(suppliers, vendorBills);

console.log('\nGenerating inventory data...');
const stockCounts = generateStockCounts(warehouses, binLocations, products);
const initialInventory = generateInitialInventory(products, warehouses, binLocations);

console.log('\nGenerating opening balances...');
const openingBalances = generateOpeningBalances();

console.log('\n========================================');
console.log('Data generation complete!');
console.log('========================================\n');

console.log('Summary:');
console.log(`  - Users: ${users.length}`);
console.log(`  - Warehouses: ${warehouses.length}`);
console.log(`  - Bin Locations: ${binLocations.length}`);
console.log(`  - Units of Measure: ${uoms.length}`);
console.log(`  - Product Categories: ${categories.length}`);
console.log(`  - Products: ${products.length}`);
console.log(`  - Customers: ${customers.length}`);
console.log(`  - Suppliers: ${suppliers.length}`);
console.log(`  - CRM Stages: ${stages.length}`);
console.log(`  - CRM Opportunities: ${opportunities.length}`);
console.log(`  - Sales Quotations: ${quotations.length}`);
console.log(`  - Sales Orders: ${salesOrders.length}`);
console.log(`  - Delivery Orders: ${deliveries.length}`);
console.log(`  - Purchase RFQs: ${rfqs.length}`);
console.log(`  - Purchase Orders: ${purchaseOrders.length}`);
console.log(`  - Goods Receipts: ${goodsReceipts.length}`);
console.log(`  - Customer Invoices: ${invoices.length}`);
console.log(`  - Vendor Bills: ${vendorBills.length}`);
console.log(`  - Credit Notes: ${creditNotes.length}`);
console.log(`  - Debit Notes: ${debitNotes.length}`);
console.log(`  - Stock Counts: ${stockCounts.length}`);
console.log(`  - Initial Inventory: ${initialInventory.length}`);
console.log(`  - Opening Balances: ${openingBalances.length}`);
console.log('\nTotal files: 23 CSV files');
console.log(`Output directory: ${OUTPUT_DIR}`);
console.log('\n');
