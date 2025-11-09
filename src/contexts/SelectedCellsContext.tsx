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
  getData?: () => any[][]
  setDataAtCell: (row: number, col: number, value: any) => void
  selectCells: (ranges: number[][], scrollToSelection?: boolean, changeListener?: boolean) => void
  selectCell: (row: number, col: number, endRow?: number, endCol?: number, scrollToCell?: boolean, changeListener?: boolean) => void
}

interface SelectedCellsContextType {
  selectedCells: SelectedCell[]
  allCells: string[][] | null
  hotInstance: HandsontableInstance | null
  setHotInstance: (hotInstance: HandsontableInstance | null) => void
  updateSelectedCellsFromHotInstance: (hotInstance: HandsontableInstance | null | undefined) => void
  updateSelectedCellsFromCoordinates: (hotInstance: HandsontableInstance, r: number, c: number, r2: number, c2: number) => void
  updateAllCells: (hotInstance: HandsontableInstance | null | undefined) => void
  restoreSelection: () => void
  clearSelectedCells: () => void
  isProcessing: boolean
  setIsProcessing: (isProcessing: boolean) => void
}

const SelectedCellsContext = createContext<SelectedCellsContextType | undefined>(undefined)

export function SelectedCellsProvider({ children }: { children: ReactNode }) {
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([])
  const [allCells, setAllCells] = useState<string[][] | null>(null)
  const [hotInstance, setHotInstance] = useState<HandsontableInstance | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

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

  const updateSelectedCellsFromCoordinates = useCallback((hotInstance: HandsontableInstance, r: number, c: number, r2: number, c2: number) => {
    // Extraer celdas seleccionadas usando las coordenadas del hook afterSelection
    const cells: SelectedCell[] = []
    for (let row = Math.min(r, r2); row <= Math.max(r, r2); row++) {
      for (let col = Math.min(c, c2); col <= Math.max(c, c2); col++) {
        const value = hotInstance.getDataAtCell(row, col)
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

  const restoreSelection = useCallback(() => {
    if (!hotInstance || selectedCells.length === 0) return

    // Calcular el rango de selección desde las celdas seleccionadas
    const rows = selectedCells.map(cell => cell.row)
    const cols = selectedCells.map(cell => cell.col)
    
    const startRow = Math.min(...rows)
    const startCol = Math.min(...cols)
    const endRow = Math.max(...rows)
    const endCol = Math.max(...cols)

    // Restaurar la selección usando selectCells
    // Referencia: https://handsontable.com/docs/javascript-data-grid/api/core/#selectcells
    // Formato: array de arrays [[rowStart, columnStart, rowEnd, columnEnd]]
    hotInstance.selectCells([[startRow, startCol, endRow, endCol]], false, false)
  }, [hotInstance, selectedCells])

  const clearSelectedCells = useCallback(() => {
    setSelectedCells([])
  }, [])

  const updateAllCells = useCallback((hotInstance: HandsontableInstance | null | undefined) => {
    if (!hotInstance) {
      setAllCells(null)
      return
    }

    const hot = hotInstance
    let allData: string[][] = []
    
    // Intentar usar getData() si está disponible (más eficiente)
    if (hot.getData && typeof hot.getData === 'function') {
      const data = hot.getData()
      allData = data.map((row: any[]) => 
        row.map((cell: any) => cell ? String(cell) : '')
      )
    } else {
      // Fallback: usar getDataAtCell para todas las celdas
      // Asumimos un tamaño estándar de 100 filas y 26 columnas (A-Z)
      const ROWS = 100
      const COLS = 26
      
      for (let row = 0; row < ROWS; row++) {
        const rowData: string[] = []
        for (let col = 0; col < COLS; col++) {
          const value = hot.getDataAtCell(row, col)
          rowData.push(value ? String(value) : '')
        }
        allData.push(rowData)
      }
    }
    
    setAllCells(allData)
  }, [])

  return (
    <SelectedCellsContext.Provider
      value={{
        selectedCells,
        allCells,
        hotInstance,
        setHotInstance,
        updateSelectedCellsFromHotInstance,
        updateSelectedCellsFromCoordinates,
        updateAllCells,
        restoreSelection,
        clearSelectedCells,
        isProcessing,
        setIsProcessing,
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

