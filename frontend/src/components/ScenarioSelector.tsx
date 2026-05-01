/**
 * Scenario Selector Component
 * Cho phép người dùng chọn scenario công việc khác nhau
 */

import React from 'react'
import { Settings, CheckCircle } from 'lucide-react'
import { useScenarioStore } from '../stores/scenarioStore'
import { ALL_SCENARIOS } from '../services/scenarioData'

const ScenarioSelector: React.FC = () => {
  const { currentScenario, setScenario } = useScenarioStore()
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700 font-medium"
        title="Chọn kịch bản công việc (Scenario)"
      >
        <Settings size={16} />
        <span className="hidden sm:inline">Scenario</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
            <h3 className="font-semibold text-gray-900 text-sm">Chọn Kịch Bản Công Việc</h3>
            <p className="text-xs text-gray-600 mt-1">Mỗi kịch bản có dữ liệu riêng (Customer, Quotation, SO, Invoice)</p>
          </div>

          {/* Scenarios List */}
          <div className="max-h-96 overflow-y-auto">
            {ALL_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => {
                  setScenario(scenario.id)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                  currentScenario === scenario.id ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{scenario.name}</span>
                      {currentScenario === scenario.id && <CheckCircle size={16} className="text-blue-600" />}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{scenario.description}</p>
                    <p className="text-xs text-blue-600 font-medium mt-2">👤 {scenario.teamMember}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer Info */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-600">
              💡 <strong>Tip:</strong> Mỗi scenario độc lập. Bạn chỉ thấy dữ liệu của scenario được chọn.
            </p>
          </div>
        </div>
      )}

      {/* Close on outside click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default ScenarioSelector
