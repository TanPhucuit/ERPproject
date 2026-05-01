/**
 * Scenario-based Demo Data
 * 
 * Chia dữ liệu theo "Scenario" thay vì "Object"
 * Mỗi scenario là một kịch bản hoàn chỉnh với Customer → Quotation → Sales Order → Invoice
 * 
 * Lợi ích:
 * - Dữ liệu không bị rời rạc
 * - Mỗi thành viên có môi trường làm việc riêng
 * - Dễ tracking workflow từ Customer đến Invoice
 * - Quản lý công nợ rõ ràng
 */

export interface ScenarioData {
  id: string
  name: string
  description: string
  customers: any[]
  quotations: any[]
  salesOrders: any[]
  invoices: any[]
  teamMember: string
}

// Scenario 1: High-Tech Manufacturing Company
export const SCENARIO_1: ScenarioData = {
  id: 'scenario-1',
  name: 'High-Tech Manufacturing Company',
  description: 'Supply chain for electronics component manufacturer',
  teamMember: 'Thành viên 1: Quản lý doanh số',

  customers: [
    {
      id: 'cust-s1-001',
      name: 'Advanced Electronics Vietnam',
      email: 'sales@advancedelec.vn',
      phone: '+84912345678',
      address: 'District 1, Ho Chi Minh City',
      type: 'corporate',
      creditLimit: 5000000000,
    },
    {
      id: 'cust-s1-002',
      name: 'Tech Solutions JSC',
      email: 'contact@techsol.vn',
      phone: '+84987654321',
      address: 'Binh Duong Province',
      type: 'corporate',
      creditLimit: 3000000000,
    },
  ],

  quotations: [
    {
      id: 'quote-s1-001',
      quoteNumber: 'QT-S1-001',
      customerId: 'cust-s1-001',
      customerName: 'Advanced Electronics Vietnam',
      date: '2024-03-15',
      expiryDate: '2024-04-15',
      status: 'sent',
      total: 450000000,
      description: 'Supply of microprocessor components - 5000 units',
      items: [{ name: 'RISC-V 64-bit Processor', quantity: 5000, unitPrice: 90000 }],
    },
    {
      id: 'quote-s1-002',
      quoteNumber: 'QT-S1-002',
      customerId: 'cust-s1-002',
      customerName: 'Tech Solutions JSC',
      date: '2024-03-18',
      expiryDate: '2024-04-18',
      status: 'draft',
      total: 280000000,
      description: 'Memory module replacement - 2000 units',
      items: [{ name: 'DDR4 8GB Module', quantity: 2000, unitPrice: 140000 }],
    },
  ],

  salesOrders: [
    {
      id: 'so-s1-001',
      orderNumber: 'ORD-S1-001',
      customerId: 'cust-s1-001',
      customerName: 'Advanced Electronics Vietnam',
      date: '2024-03-16',
      dueDate: '2024-04-16',
      status: 'confirmed',
      total: 450000000,
      quotationId: 'quote-s1-001',
      items: [{ productId: 'prod-1', name: 'RISC-V 64-bit Processor', quantity: 5000, price: 90000 }],
    },
  ],

  invoices: [
    {
      id: 'inv-s1-001',
      invoice_number: 'INV-S1-001',
      customer_name: 'Advanced Electronics Vietnam',
      invoice_date: '2024-03-20',
      due_date: '2024-04-20',
      total_amount: 450000000,
      status: 'pending',
      payment_terms: '30 days net',
      salesOrderId: 'so-s1-001',
    },
  ],
}

// Scenario 2: Small Business Import-Export
export const SCENARIO_2: ScenarioData = {
  id: 'scenario-2',
  name: 'Small Business Import-Export',
  description: 'Import/export wholesale trading company',
  teamMember: 'Thành viên 2: Quản lý xuất nhập khẩu',

  customers: [
    {
      id: 'cust-s2-001',
      name: 'Global Trading Partners',
      email: 'supply@globaltrading.vn',
      phone: '+84911111111',
      address: 'Hai Phong Port Area',
      type: 'corporate',
      creditLimit: 2000000000,
    },
    {
      id: 'cust-s2-002',
      name: 'Regional Distribution Network',
      email: 'ops@regionaldist.vn',
      phone: '+84922222222',
      address: 'Can Tho',
      type: 'corporate',
      creditLimit: 1500000000,
    },
  ],

  quotations: [
    {
      id: 'quote-s2-001',
      quoteNumber: 'QT-S2-001',
      customerId: 'cust-s2-001',
      customerName: 'Global Trading Partners',
      date: '2024-03-10',
      expiryDate: '2024-03-31',
      status: 'sent',
      total: 750000000,
      description: 'Bulk textile imports - Cotton and synthetic fabrics',
      items: [{ name: 'Premium Cotton Fabric Roll', quantity: 500, unitPrice: 1500000 }],
    },
  ],

  salesOrders: [
    {
      id: 'so-s2-001',
      orderNumber: 'ORD-S2-001',
      customerId: 'cust-s2-001',
      customerName: 'Global Trading Partners',
      date: '2024-03-12',
      dueDate: '2024-04-12',
      status: 'pending',
      total: 750000000,
      quotationId: 'quote-s2-001',
      items: [{ productId: 'prod-2', name: 'Premium Cotton Fabric Roll', quantity: 500, price: 1500000 }],
    },
  ],

  invoices: [
    {
      id: 'inv-s2-001',
      invoice_number: 'INV-S2-001',
      customer_name: 'Global Trading Partners',
      invoice_date: '2024-03-14',
      due_date: '2024-04-14',
      total_amount: 750000000,
      status: 'draft',
      payment_terms: '45 days net',
      salesOrderId: 'so-s2-001',
    },
  ],
}

// Scenario 3: Service-Based Professional Firm
export const SCENARIO_3: ScenarioData = {
  id: 'scenario-3',
  name: 'Professional Services Consulting',
  description: 'IT consulting and software development firm',
  teamMember: 'Thành viên 3: Quản lý dự án IT',

  customers: [
    {
      id: 'cust-s3-001',
      name: 'Financial Innovation Labs',
      email: 'procurement@finlab.vn',
      phone: '+84933333333',
      address: 'Da Nang',
      type: 'corporate',
      creditLimit: 3500000000,
    },
    {
      id: 'cust-s3-002',
      name: 'Healthcare Systems International',
      email: 'admin@healthsys.vn',
      phone: '+84944444444',
      address: 'Hanoi',
      type: 'corporate',
      creditLimit: 2500000000,
    },
  ],

  quotations: [
    {
      id: 'quote-s3-001',
      quoteNumber: 'QT-S3-001',
      customerId: 'cust-s3-001',
      customerName: 'Financial Innovation Labs',
      date: '2024-02-28',
      expiryDate: '2024-03-30',
      status: 'won',
      total: 1200000000,
      description: 'Custom blockchain payment system development - 120 person-days',
      items: [{ name: 'Blockchain Dev Services', quantity: 120, unitPrice: 10000000 }],
    },
  ],

  salesOrders: [
    {
      id: 'so-s3-001',
      orderNumber: 'ORD-S3-001',
      customerId: 'cust-s3-001',
      customerName: 'Financial Innovation Labs',
      date: '2024-03-01',
      dueDate: '2024-05-01',
      status: 'completed',
      total: 1200000000,
      quotationId: 'quote-s3-001',
      items: [{ productId: 'prod-3', name: 'Blockchain Dev Services', quantity: 120, price: 10000000 }],
    },
  ],

  invoices: [
    {
      id: 'inv-s3-001',
      invoice_number: 'INV-S3-001',
      customer_name: 'Financial Innovation Labs',
      invoice_date: '2024-03-05',
      due_date: '2024-04-05',
      total_amount: 600000000,
      status: 'paid',
      payment_terms: '50% milestone, 50% completion',
      salesOrderId: 'so-s3-001',
    },
    {
      id: 'inv-s3-002',
      invoice_number: 'INV-S3-002',
      customer_name: 'Financial Innovation Labs',
      invoice_date: '2024-03-20',
      due_date: '2024-04-20',
      total_amount: 600000000,
      status: 'pending',
      payment_terms: '50% milestone, 50% completion',
      salesOrderId: 'so-s3-001',
    },
  ],
}

// Scenario 4: Retail & Distribution
export const SCENARIO_4: ScenarioData = {
  id: 'scenario-4',
  name: 'Retail & Distribution Network',
  description: 'Large retail chain with nationwide distribution',
  teamMember: 'Thành viên 4: Quản lý bán lẻ',

  customers: [
    {
      id: 'cust-s4-001',
      name: 'Metro Retail Chain',
      email: 'supply@metroretail.vn',
      phone: '+84955555555',
      address: 'Ho Chi Minh City',
      type: 'corporate',
      creditLimit: 8000000000,
    },
    {
      id: 'cust-s4-002',
      name: 'Convenience Store Franchise',
      email: 'management@convstore.vn',
      phone: '+84966666666',
      address: 'Multiple locations',
      type: 'corporate',
      creditLimit: 2000000000,
    },
  ],

  quotations: [
    {
      id: 'quote-s4-001',
      quoteNumber: 'QT-S4-001',
      customerId: 'cust-s4-001',
      customerName: 'Metro Retail Chain',
      date: '2024-03-15',
      expiryDate: '2024-04-15',
      status: 'draft',
      total: 2500000000,
      description: 'FMCG weekly supply - Food, beverages, daily essentials',
      items: [{ name: 'Assorted FMCG Bundle', quantity: 10000, unitPrice: 250000 }],
    },
  ],

  salesOrders: [
    {
      id: 'so-s4-001',
      orderNumber: 'ORD-S4-001',
      customerId: 'cust-s4-001',
      customerName: 'Metro Retail Chain',
      date: '2024-03-17',
      dueDate: '2024-03-24',
      status: 'dispatched',
      total: 2500000000,
      quotationId: 'quote-s4-001',
      items: [{ productId: 'prod-4', name: 'Assorted FMCG Bundle', quantity: 10000, price: 250000 }],
    },
    {
      id: 'so-s4-002',
      orderNumber: 'ORD-S4-002',
      customerId: 'cust-s4-002',
      customerName: 'Convenience Store Franchise',
      date: '2024-03-15',
      dueDate: '2024-03-22',
      status: 'confirmed',
      total: 850000000,
      quotationId: 'quote-s4-001',
      items: [{ productId: 'prod-4', name: 'Assorted FMCG Bundle', quantity: 3400, price: 250000 }],
    },
  ],

  invoices: [
    {
      id: 'inv-s4-001',
      invoice_number: 'INV-S4-001',
      customer_name: 'Metro Retail Chain',
      invoice_date: '2024-03-18',
      due_date: '2024-04-01',
      total_amount: 2500000000,
      status: 'partially_paid',
      payment_terms: 'COD (Cash on Delivery)',
      salesOrderId: 'so-s4-001',
    },
    {
      id: 'inv-s4-002',
      invoice_number: 'INV-S4-002',
      customer_name: 'Convenience Store Franchise',
      invoice_date: '2024-03-16',
      due_date: '2024-03-30',
      total_amount: 850000000,
      status: 'pending',
      payment_terms: '14 days net',
      salesOrderId: 'so-s4-002',
    },
  ],
}

/**
 * All Scenarios
 */
export const ALL_SCENARIOS: ScenarioData[] = [SCENARIO_1, SCENARIO_2, SCENARIO_3, SCENARIO_4]

/**
 * Get scenario by ID
 */
export const getScenario = (scenarioId: string): ScenarioData | undefined => {
  return ALL_SCENARIOS.find((s) => s.id === scenarioId)
}

/**
 * Get all customers from a scenario
 */
export const getScenarioCustomers = (scenarioId: string) => {
  const scenario = getScenario(scenarioId)
  return scenario?.customers || []
}

/**
 * Get all quotations from a scenario
 */
export const getScenarioQuotations = (scenarioId: string) => {
  const scenario = getScenario(scenarioId)
  return scenario?.quotations || []
}

/**
 * Get all sales orders from a scenario
 */
export const getScenarioSalesOrders = (scenarioId: string) => {
  const scenario = getScenario(scenarioId)
  return scenario?.salesOrders || []
}

/**
 * Get all invoices from a scenario
 */
export const getScenarioInvoices = (scenarioId: string) => {
  const scenario = getScenario(scenarioId)
  return scenario?.invoices || []
}
