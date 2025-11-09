"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export interface SelectedCell {
  row: number
  col: number
  value: string
}

interface SelectedCellsContextType {
  selectedCells: SelectedCell[]
  setSelectedCells: (cells: SelectedCell[]) => void
  clearSelectedCells: () => void
}

const SelectedCellsContext = createContext<SelectedCellsContextType | undefined>(undefined)

export function SelectedCellsProvider({ children }: { children: ReactNode }) {
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([])

  const clearSelectedCells = () => {
    setSelectedCells([])
  }

  return (
    <SelectedCellsContext.Provider
      value={{
        selectedCells,
        setSelectedCells,
        clearSelectedCells,
      }}
    >
      {children}
    </SelectedCellsContext.Provider>
  )
}

export function useSelectedCells() {
  const context = useContext(SelectedCellsContext)
  if (context === undefined) {
    throw new Error("useSelectedCells must be used within a SelectedCellsProvider")
  }
  return context
}

