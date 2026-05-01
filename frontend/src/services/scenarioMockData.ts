/**
 * Scenario-Aware Mock Data Provider
 * Cung cấp dữ liệu từ scenario được chọn thay vì hard-coded mock data
 */

import { useScenarioStore } from '../stores/scenarioStore'
import { getScenario, getScenarioCustomers, getScenarioQuotations, getScenarioSalesOrders, getScenarioInvoices } from '../services/scenarioData'
import * as mockData from './mockData'

export const useScenarioMockData = () => {
  const { currentScenario } = useScenarioStore()
  const scenario = getScenario(currentScenario)

  return {
    mockLeads: scenario ? getScenarioCustomers(currentScenario) : mockData.mockLeads,
    mockQuotations: scenario ? getScenarioQuotations(currentScenario) : mockData.mockQuotations,
    mockSalesOrders: scenario ? getScenarioSalesOrders(currentScenario) : mockData.mockSalesOrders,
    mockInvoices: scenario ? getScenarioInvoices(currentScenario) : mockData.mockInvoices,
    mockPayments: mockData.mockPayments, // Payments không phân theo scenario
    mockMetrics: mockData.mockMetrics, // Metrics là global
  }
}

/**
 * Get customers from current scenario
 */
export const getScenarioBasedCustomers = () => {
  const currentScenario = useScenarioStore((s) => s.currentScenario)
  return getScenarioCustomers(currentScenario)
}

/**
 * Get quotations from current scenario
 */
export const getScenarioBasedQuotations = () => {
  const currentScenario = useScenarioStore((s) => s.currentScenario)
  return getScenarioQuotations(currentScenario)
}

/**
 * Get sales orders from current scenario
 */
export const getScenarioBasedSalesOrders = () => {
  const currentScenario = useScenarioStore((s) => s.currentScenario)
  return getScenarioSalesOrders(currentScenario)
}

/**
 * Get invoices from current scenario
 */
export const getScenarioBasedInvoices = () => {
  const currentScenario = useScenarioStore((s) => s.currentScenario)
  return getScenarioInvoices(currentScenario)
}
