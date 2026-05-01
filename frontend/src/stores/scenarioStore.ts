/**
 * Scenario Selection Store
 * Quản lý scenario hiện tại đang được sử dụng
 */

import { create } from 'zustand'
import { SCENARIO_1 } from '../services/scenarioData'

interface ScenarioStore {
  currentScenario: string
  setScenario: (scenarioId: string) => void
}

export const useScenarioStore = create<ScenarioStore>((set) => ({
  currentScenario: SCENARIO_1.id, // Default to scenario 1
  setScenario: (scenarioId: string) => set({ currentScenario: scenarioId }),
}))
