"use client"

import { createContext, useContext, useState, ReactNode, useCallback } from "react"

export interface SelectedCell {
  row: number
  col: number
  value: string
}

interface HandsontableInstance {
  getSelected: () => number[][] | undefined
  getDataAtCell: (row: number, col: number) => any
}

interface SelectedCellsContextType {
  selectedCells: SelectedCell[]
  updateSelectedCellsFromHotInstance: (hotInstance: HandsontableInstance | null | undefined) => void
  clearSelectedCells: () => void
}

const SelectedCellsContext = createContext<SelectedCellsContextType | undefined>(undefined)

export function SelectedCellsProvider({ children }: { children: ReactNode }) {
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([])

  const updateSelectedCellsFromHotInstance = useCallback((hotInstance: HandsontableInstance | null | undefined) => {
    if (!hotInstance) {
      setSelectedCells(prev => prev.length === 0 ? prev : [])
      return
    }

    const hot = hotInstance
    const selected = hot.getSelected() || []
    
    if (selected.length === 0) {
      setSelectedCells(prev => prev.length === 0 ? prev : [])
      return
    }

    const [startRow, startCol, endRow, endCol] = selected[0]

    // Extraer celdas seleccionadas
    const cells: SelectedCell[] = []
    for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
      for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
        const value = hot.getDataAtCell(row, col)
        cells.push({
          row,
          col,
          value: value ? String(value) : ''
        })
      }
    }

    // Solo actualizar si las celdas han cambiado
    setSelectedCells(prev => {
      if (prev.length !== cells.length) {
        return cells
      }
      
      // Comparar si las celdas son diferentes
      const hasChanged = prev.some((cell, index) => {
        const newCell = cells[index]
        return !newCell || cell.row !== newCell.row || cell.col !== newCell.col || cell.value !== newCell.value
      })
      
      return hasChanged ? cells : prev
    })
  }, [])

  const clearSelectedCells = useCallback(() => {
    setSelectedCells([])
  }, [])

  return (
    <SelectedCellsContext.Provider
      value={{
        selectedCells,
        updateSelectedCellsFromHotInstance,
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

