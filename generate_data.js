import { faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'generated_data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const writeCsv = (fileName, headers, data) => {
    const filePath = path.join(dataDir, fileName);
    let csvContent = headers.join(',') + '\n';
    data.forEach(row => {
        csvContent += headers.map(header => {
            const val = row[header];
            if (val === null || val === undefined) return '""';
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',') + '\n';
    });
    fs.writeFileSync(filePath, csvContent);
};

// --- MASTER DATA ---

const generateUsers = (count) => {
    const users = [];
    users.push({
        id: 1,
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        full_name: 'Admin User',
        phone: '+84912345001',
        avatar_url: null,
        role: 'Admin',
        department_id: null,
        status: 'active',
        last_login: null,
        login_attempts: 0,
        locked_until: null
    });
    users.push({
        id: 2,
        email: 'sales@example.com',
        password_hash: 'hashed_password',
        full_name: 'Sales Manager',
        phone: '+84912345002',
        avatar_url: null,
        role: 'Sales_Manager',
        department_id: null,
        status: 'active',
        last_login: null,
        login_attempts: 0,
        locked_until: null
    });
    users.push({
        id: 3,
        email: 'purchasing@example.com',
        password_hash: 'hashed_password',
        full_name: 'Purchasing Manager',
        phone: '+84912345003',
        avatar_url: null,
        role: 'Purchasing_Manager',
        department_id: null,
        status: 'active',
        last_login: null,
        login_attempts: 0,
        locked_until: null
    });
    users.push({
        id: 4,
        email: 'warehouse@example.com',
        password_hash: 'hashed_password',
        full_name: 'Warehouse Manager',
        phone: '+84912345004',
        avatar_url: null,
        role: 'Warehouse_Manager',
        department_id: null,
        status: 'active',
        last_login: null,
        login_attempts: 0,
        locked_until: null
    });
    users.push({
        id: 5,
        email: 'accountant@example.com',
        password_hash: 'hashed_password',
        full_name: 'Chief Accountant',
        phone: '+84912345005',
        avatar_url: null,
        role: 'Accountant',
        department_id: null,
        status: 'active',
        last_login: null,
        login_attempts: 0,
        locked_until: null
    });
    return users;
};

const generateWarehouses = (count) => {
    const warehouses = [];
    const cities = ['Ho Chi Minh', 'Hanoi', 'Da Nang'];
    const provinces = ['Ho Chi Minh', 'Hanoi', 'Da Nang'];
    const locations = ['Northern District', 'Central District', 'Southern District'];
    
    for (let i = 1; i <= count; i++) {
        warehouses.push({
            id: i,
            warehouse_code: `WH-${i}`,
            name: `${locations[i-1]} Warehouse`,
            description: `Main warehouse location ${i}`,
            location_address: `${faker.location.streetAddress()}, ${cities[i-1]}`,
            city: cities[i-1],
            province: provinces[i-1],
            postal_code: faker.location.zipCode(),
            manager_id: i <= 3 ? 4 : null,
            capacity_sqm: 5000 + (i * 1000),
            current_occupancy_sqm: faker.number.int({ min: 1000, max: 4500 }),
            status: 'active'
        });
    }
    return warehouses;
};

const generateBinLocations = (count, warehouseCount) => {
    const bins = [];
    const zoneLetters = ['A', 'B', 'C', 'D', 'E'];
    
    for (let i = 1; i <= count; i++) {
        const warehouseId = ((i - 1) % warehouseCount) + 1;
        const zone = zoneLetters[Math.floor((i - 1) / 10) % zoneLetters.length];
        const binNum = ((i - 1) % 10) + 1;
        
        bins.push({
            id: i,
            warehouse_id: warehouseId,
            zone_id: null,
            bin_code: `${zone}${binNum}`,
            description: `Bin location ${zone}${binNum} in warehouse ${warehouseId}`,
            capacity_units: faker.number.int({ min: 100, max: 500 }),
            current_occupancy_units: faker.number.int({ min: 0, max: 400 }),
            status: 'active'
        });
    }
    return bins;
};

const generateProductCategories = (count) => {
    const categories = [];
    const categoryNames = [
        'Smart Home Devices', 'IoT Sensors', 'Network Equipment', 'Power Systems',
        'Accessories', 'Lighting', 'Security', 'Climate Control', 'Entertainment', 'Smart Appliances'
    ];
    
    for (let i = 1; i <= Math.min(count, categoryNames.length); i++) {
        categories.push({
            id: i,
            name: categoryNames[i-1],
            description: `Category for ${categoryNames[i-1]}`,
            parent_id: null,
            image_url: null,
            display_order: i
        });
    }
    return categories;
};

const generateUnitsOfMeasure = () => {
    return [
        { id: 1, code: 'pcs', name: 'Pieces', conversion_factor: 1.0 },
        { id: 2, code: 'box', name: 'Box', conversion_factor: 12.0 },
        { id: 3, code: 'pack', name: 'Pack', conversion_factor: 10.0 },
        { id: 4, code: 'kg', name: 'Kilogram', conversion_factor: 1.0 },
        { id: 5, code: 'm', name: 'Meter', conversion_factor: 1.0 }
    ];
};

const generateProducts = (count, categoryCount) => {
    const products = [];
    for (let i = 1; i <= count; i++) {
        const cost = parseFloat(faker.commerce.price({ min: 10, max: 1000 }));
        const list = cost * 1.3;
        products.push({
            id: i,
            sku: `SKU${i.toString().padStart(5, '0')}`,
            name: faker.commerce.productName(),
            description: faker.commerce.productDescription(),
            category_id: faker.number.int({ min: 1, max: categoryCount }),
            uom_id: faker.number.int({ min: 1, max: 5 }),
            image_url: null,
            list_price: list.toFixed(2),
            cost_price: cost.toFixed(2),
            reorder_level: faker.number.int({ min: 5, max: 50 }),
            reorder_quantity: faker.number.int({ min: 20, max: 100 }),
            supplier_lead_time_days: faker.number.int({ min: 3, max: 30 }),
            status: faker.helpers.arrayElement(['active', 'discontinued']),
            barcode: `BAR${i.toString().padStart(8, '0')}`
        });
    }
    return products;
};

const generateSuppliers = (count) => {
    const supplierTypes = [1, 2, 3, 4, 5];
    const suppliers = [];
    
    for (let i = 1; i <= count; i++) {
        const companyName = faker.company.name();
        suppliers.push({
            id: i,
            supplier_number: `SUPP${i.toString().padStart(5, '0')}`,
            name: companyName,
            company_tax_id: `TAX${i.toString().padStart(7, '0')}`,
            supplier_type_id: faker.helpers.arrayElement(supplierTypes),
            contact_person_name: faker.person.fullName(),
            contact_person_email: faker.internet.email(),
            contact_person_phone: faker.phone.number(),
            company_address: faker.location.streetAddress(),
            company_city: faker.location.city(),
            company_province: faker.location.state(),
            company_postal_code: faker.location.zipCode(),
            company_website: faker.internet.url(),
            logo_url: null,
            payment_terms: faker.helpers.arrayElement(['NET30', 'NET60', 'COD', 'Prepaid']),
            average_lead_time_days: faker.number.int({ min: 5, max: 30 }),
            quality_rating: parseFloat((Math.random() * 5).toFixed(1)),
            is_preferred: faker.datatype.boolean(0.3),
            status: faker.helpers.arrayElement(['active', 'inactive']),
            total_spent: faker.finance.amount(),
            average_response_time_hours: faker.number.float({ min: 1, max: 48, precision: 0.1 })
        });
    }
    return suppliers;
};

const generateCustomers = (count) => {
    const customers = [];
    for (let i = 1; i <= count; i++) {
        const customerName = faker.company.name();
        customers.push({
            id: i,
            customer_number: `CUST${i.toString().padStart(5, '0')}`,
            name: customerName,
            company_tax_id: `TAX${i.toString().padStart(7, '0')}`,
            customer_type: faker.helpers.arrayElement(['B2B', 'B2C']),
            contact_person_name: faker.person.fullName(),
            contact_person_email: faker.internet.email(),
            contact_person_phone: faker.phone.number(),
            billing_address: faker.location.streetAddress(),
            shipping_address: faker.location.streetAddress(),
            billing_city: faker.location.city(),
            billing_province: faker.location.state(),
            billing_postal_code: faker.location.zipCode(),
            shipping_same_as_billing: faker.datatype.boolean(),
            credit_limit: faker.finance.amount({ min: 10000, max: 500000 }),
            credit_used: 0,
            payment_terms: faker.helpers.arrayElement(['NET30', 'NET60', 'COD', 'Prepaid']),
            lead_id: null,
            status: faker.helpers.arrayElement(['active', 'inactive']),
            created_by_id: 2
        });
    }
    return customers;
};

const generateProductCategories2 = (count) => {
    const categories = [];
    const categoryNames = [
        'Smart Home Devices', 'IoT Sensors', 'Network Equipment', 'Power Systems',
        'Accessories', 'Lighting', 'Security', 'Climate Control', 'Entertainment', 'Smart Appliances'
    ];
    
    for (let i = 1; i <= Math.min(count, categoryNames.length); i++) {
        categories.push({
            id: i,
            name: categoryNames[i-1],
            description: `Category for ${categoryNames[i-1]}`,
            display_order: i
        });
    }
    return categories;
};

const generateSalesQuotations = (count, customerCount) => {
    const quotations = [];
    for (let i = 1; i <= count; i++) {
        const issuedDate = faker.date.recent({ days: 30 });
        const validUntilDate = new Date(issuedDate.getTime() + 30*24*60*60*1000);
        quotations.push({
            id: i,
            customer_id: faker.number.int({ min: 1, max: customerCount }),
            status: faker.helpers.arrayElement(['draft', 'sent', 'accepted', 'rejected']),
            total_amount: faker.finance.amount({ min: 100, max: 50000 }),
            valid_until_date: validUntilDate.toISOString().split('T')[0]
        });
    }
    return quotations;
};

const generateSalesOrders = (count, customerCount) => {
    const orders = [];
    for (let i = 1; i <= count; i++) {
        const orderDate = faker.date.recent({ days: 60 });
        const requiredDeliveryDate = new Date(orderDate.getTime() + (7 + faker.number.int({min: 0, max: 7}))*24*60*60*1000);
        orders.push({
            id: i,
            customer_id: faker.number.int({ min: 1, max: customerCount }),
            status: faker.helpers.arrayElement(['draft', 'confirmed', 'partially_shipped', 'shipped', 'delivered', 'cancelled']),
            total_amount: faker.finance.amount({ min: 200, max: 100000 }),
            required_delivery_date: requiredDeliveryDate.toISOString().split('T')[0]
        });
    }
    return orders;
};

const generateDeliveryOrders = (count, salesOrderCount, warehouseCount) => {
    const orders = [];
    for (let i = 1; i <= count; i++) {
        orders.push({
            id: i,
            sales_order_id: faker.number.int({ min: 1, max: salesOrderCount }),
            warehouse_id: faker.number.int({ min: 1, max: warehouseCount }),
            status: faker.helpers.arrayElement(['draft', 'ready', 'picked', 'shipped', 'in_transit', 'delivered', 'cancelled'])
        });
    }
    return orders;
};

const generateGoodsReceipts = (count, purchaseOrderCount, warehouseCount) => {
    const receipts = [];
    for (let i = 1; i <= count; i++) {
        receipts.push({
            id: i,
            purchase_order_id: faker.number.int({ min: 1, max: purchaseOrderCount }),
            warehouse_id: faker.number.int({ min: 1, max: warehouseCount }),
            status: faker.helpers.arrayElement(['draft', 'received', 'verified', 'completed', 'cancelled'])
        });
    }
    return receipts;
};

const generatePurchaseRfqs = (count) => {
    const rfqs = [];
    for (let i = 1; i <= count; i++) {
        const issuedDate = faker.date.recent({ days: 30 });
        const closingDate = new Date(issuedDate.getTime() + (5 + faker.number.int({min: 0, max: 3}))*24*60*60*1000);
        rfqs.push({
            id: i,
            status: faker.helpers.arrayElement(['draft', 'sent', 'closed', 'cancelled']),
            issued_date: issuedDate.toISOString().split('T')[0],
            closing_date: closingDate.toISOString().split('T')[0]
        });
    }
    return rfqs;
};

const generatePurchaseOrders = (count, supplierCount) => {
    const orders = [];
    for (let i = 1; i <= count; i++) {
        const orderDate = faker.date.recent({ days: 60 });
        const requiredDeliveryDate = new Date(orderDate.getTime() + (10 + faker.number.int({min: 0, max: 20}))*24*60*60*1000);
        orders.push({
            id: i,
            supplier_id: faker.number.int({ min: 1, max: supplierCount }),
            status: faker.helpers.arrayElement(['draft', 'confirmed', 'partial_received', 'received', 'cancelled']),
            total_amount: faker.finance.amount({ min: 500, max: 200000 }),
            required_delivery_date: requiredDeliveryDate.toISOString().split('T')[0]
        });
    }
    return orders;
};

const generateCustomerInvoices = (count, customerCount, salesOrderCount) => {
    const invoices = [];
    for (let i = 1; i <= count; i++) {
        const invoiceDate = faker.date.recent({ days: 60 });
        const dueDate = new Date(invoiceDate.getTime() + 30*24*60*60*1000);
        invoices.push({
            id: i,
            customer_id: faker.number.int({ min: 1, max: customerCount }),
            sales_order_id: faker.number.int({ min: 1, max: salesOrderCount }),
            status: faker.helpers.arrayElement(['draft', 'issued', 'sent', 'partial_paid', 'paid', 'overdue', 'cancelled']),
            total_amount: faker.finance.amount({ min: 100, max: 50000 }),
            due_date: dueDate.toISOString().split('T')[0]
        });
    }
    return invoices;
};

const generateVendorBills = (count, supplierCount, purchaseOrderCount) => {
    const bills = [];
    for (let i = 1; i <= count; i++) {
        const billDate = faker.date.recent({ days: 60 });
        const dueDate = new Date(billDate.getTime() + 30*24*60*60*1000);
        bills.push({
            id: i,
            supplier_id: faker.number.int({ min: 1, max: supplierCount }),
            purchase_order_id: faker.number.int({ min: 1, max: purchaseOrderCount }),
            status: faker.helpers.arrayElement(['draft', 'issued', 'sent', 'partial_paid', 'paid', 'overdue', 'cancelled']),
            total_amount: faker.finance.amount({ min: 100, max: 50000 }),
            due_date: dueDate.toISOString().split('T')[0]
        });
    }
    return bills;
};

// Constants
const WAREHOUSE_COUNT = 3;
const BIN_LOCATION_COUNT = 30;
const CATEGORY_COUNT = 10;
const PRODUCT_COUNT = 500;
const SUPPLIER_COUNT = 50;
const CUSTOMER_COUNT = 100;
const QUOTATION_COUNT = 100;
const SALES_ORDER_COUNT = 50;
const DELIVERY_ORDER_COUNT = 40;
const PURCHASE_RFQ_COUNT = 100;
const PURCHASE_ORDER_COUNT = 50;
const GOODS_RECEIPT_COUNT = 45;
const CUSTOMER_INVOICE_COUNT = 50;
const VENDOR_BILL_COUNT = 50;

console.log('Generating data...');

// Generate and save master data
const users = generateUsers(5);
writeCsv('users.csv', ['id', 'email', 'password_hash', 'full_name', 'phone', 'avatar_url', 'role', 'department_id', 'status', 'last_login', 'login_attempts', 'locked_until'], users);

const warehouses = generateWarehouses(WAREHOUSE_COUNT);
writeCsv('warehouses.csv', ['id', 'warehouse_code', 'name', 'description', 'location_address', 'city', 'province', 'postal_code', 'manager_id', 'capacity_sqm', 'current_occupancy_sqm', 'status'], warehouses);

const binLocations = generateBinLocations(BIN_LOCATION_COUNT, WAREHOUSE_COUNT);
writeCsv('bin_locations.csv', ['id', 'warehouse_id', 'zone_id', 'bin_code', 'description', 'capacity_units', 'current_occupancy_units', 'status'], binLocations);

const categories = generateProductCategories(CATEGORY_COUNT);
writeCsv('product_categories.csv', ['id', 'name', 'description', 'parent_id', 'image_url', 'display_order'], categories);

const uom = generateUnitsOfMeasure();
writeCsv('units_of_measure.csv', ['id', 'code', 'name', 'conversion_factor'], uom);

const products = generateProducts(PRODUCT_COUNT, CATEGORY_COUNT);
writeCsv('products.csv', ['id', 'sku', 'name', 'description', 'category_id', 'uom_id', 'image_url', 'list_price', 'cost_price', 'reorder_level', 'reorder_quantity', 'supplier_lead_time_days', 'status', 'barcode'], products);

const suppliers = generateSuppliers(SUPPLIER_COUNT);
writeCsv('suppliers.csv', ['id', 'supplier_number', 'name', 'company_tax_id', 'supplier_type_id', 'contact_person_name', 'contact_person_email', 'contact_person_phone', 'company_address', 'company_city', 'company_province', 'company_postal_code', 'company_website', 'logo_url', 'payment_terms', 'average_lead_time_days', 'quality_rating', 'is_preferred', 'status', 'total_spent', 'average_response_time_hours'], suppliers);

const customers = generateCustomers(CUSTOMER_COUNT);
writeCsv('customers.csv', ['id', 'customer_number', 'name', 'company_tax_id', 'customer_type', 'contact_person_name', 'contact_person_email', 'contact_person_phone', 'billing_address', 'shipping_address', 'billing_city', 'billing_province', 'billing_postal_code', 'shipping_same_as_billing', 'credit_limit', 'credit_used', 'payment_terms', 'lead_id', 'status', 'created_by_id'], customers);

// Generate and save transactions
const quotations = generateSalesQuotations(QUOTATION_COUNT, CUSTOMER_COUNT);
writeCsv('sales_quotations.csv', ['id', 'customer_id', 'status', 'total_amount', 'valid_until_date'], quotations);

const orders = generateSalesOrders(SALES_ORDER_COUNT, CUSTOMER_COUNT);
writeCsv('sales_orders.csv', ['id', 'customer_id', 'status', 'total_amount', 'required_delivery_date'], orders);

const deliveryOrders = generateDeliveryOrders(DELIVERY_ORDER_COUNT, SALES_ORDER_COUNT, WAREHOUSE_COUNT);
writeCsv('delivery_orders.csv', ['id', 'sales_order_id', 'warehouse_id', 'status'], deliveryOrders);

const purchaseRfqs = generatePurchaseRfqs(PURCHASE_RFQ_COUNT);
writeCsv('purchase_rfqs.csv', ['id', 'status', 'issued_date', 'closing_date'], purchaseRfqs);

const purchaseOrders = generatePurchaseOrders(PURCHASE_ORDER_COUNT, SUPPLIER_COUNT);
writeCsv('purchase_orders.csv', ['id', 'supplier_id', 'status', 'total_amount', 'required_delivery_date'], purchaseOrders);

const goodsReceipts = generateGoodsReceipts(GOODS_RECEIPT_COUNT, PURCHASE_ORDER_COUNT, WAREHOUSE_COUNT);
writeCsv('goods_receipts.csv', ['id', 'purchase_order_id', 'warehouse_id', 'status'], goodsReceipts);

const customerInvoices = generateCustomerInvoices(CUSTOMER_INVOICE_COUNT, CUSTOMER_COUNT, SALES_ORDER_COUNT);
writeCsv('customer_invoices.csv', ['id', 'customer_id', 'sales_order_id', 'status', 'total_amount', 'due_date'], customerInvoices);

const vendorBills = generateVendorBills(VENDOR_BILL_COUNT, SUPPLIER_COUNT, PURCHASE_ORDER_COUNT);
writeCsv('vendor_bills.csv', ['id', 'supplier_id', 'purchase_order_id', 'status', 'total_amount', 'due_date'], vendorBills);

// Placeholder data for other tables
writeCsv('crm_stages.csv', ['id', 'name'], [
    { id: 1, name: 'New' },
    { id: 2, name: 'Site Survey' },
    { id: 3, name: 'Proposition' },
    { id: 4, name: 'Won' },
    { id: 5, name: 'Lost' }
]);

writeCsv('crm_opportunities.csv', ['id', 'lead_id', 'status'], [
    { id: 1, lead_id: 1, status: 'active' }
]);

writeCsv('credit_notes.csv', ['id', 'invoice_id', 'customer_id', 'status'], [
    { id: 1, invoice_id: 1, customer_id: 1, status: 'draft' }
]);

writeCsv('debit_notes.csv', ['id', 'bill_id', 'supplier_id', 'status'], [
    { id: 1, bill_id: 1, supplier_id: 1, status: 'draft' }
]);

writeCsv('opening_balances.csv', ['id', 'account_code', 'amount'], [
    { id: 1, account_code: 'CASH', amount: 100000 }
]);

writeCsv('initial_inventory.csv', ['id', 'product_id', 'warehouse_id', 'quantity'], [
    { id: 1, product_id: 1, warehouse_id: 1, quantity: 100 }
]);

writeCsv('stock_counts.csv', ['id', 'warehouse_id', 'count_date'], [
    { id: 1, warehouse_id: 1, count_date: '2026-05-01' }
]);

console.log('All data generated successfully in "generated_data" directory!');
