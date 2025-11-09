import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert column number to Excel column label (0->A, 1->B, ..., 25->Z, 26->AA)
export function getColumnLabel(col: number): string {
  let label = ''
  let num = col
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label
    num = Math.floor(num / 26) - 1
  }
  return label
}

// Format selected cells into ranges (e.g., "A1:B5", "C3", "A1:A10, C5")
export function formatCellRanges(selectedCells: Array<{row: number, col: number, value: string}>): string[] {
  if (selectedCells.length === 0) return []
  
  // Create a set of selected cell keys for quick lookup
  const cellSet = new Set(selectedCells.map(c => `${c.row},${c.col}`))
  
  // Helper to check if a cell is selected
  const isSelected = (row: number, col: number) => cellSet.has(`${row},${col}`)
  
  // Helper to check if a rectangular range is fully selected
  const isRectangularRange = (startRow: number, startCol: number, endRow: number, endCol: number): boolean => {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (!isSelected(r, c)) return false
      }
    }
    return true
  }
  
  // Find all rectangular ranges
  const ranges: Array<{start: {row: number, col: number}, end: {row: number, col: number}}> = []
  const processed = new Set<string>()
  
  // Sort cells by row, then by column
  const sorted = [...selectedCells].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row
    return a.col - b.col
  })
  
  for (const cell of sorted) {
    const cellKey = `${cell.row},${cell.col}`
    if (processed.has(cellKey)) continue
    
    // Try to find the largest rectangular range starting from this cell
    let maxEndRow = cell.row
    let maxEndCol = cell.col
    
    // Expand horizontally first
    for (let c = cell.col + 1; c < 1000; c++) {
      if (!isSelected(cell.row, c)) break
      maxEndCol = c
    }
    
    // Expand vertically
    for (let r = cell.row + 1; r < 1000; r++) {
      let canExpand = true
      for (let c = cell.col; c <= maxEndCol; c++) {
        if (!isSelected(r, c)) {
          canExpand = false
          break
        }
      }
      if (!canExpand) break
      maxEndRow = r
    }
    
    // Verify this is a valid rectangular range
    if (isRectangularRange(cell.row, cell.col, maxEndRow, maxEndCol)) {
      ranges.push({
        start: { row: cell.row, col: cell.col },
        end: { row: maxEndRow, col: maxEndCol }
      })
      
      // Mark all cells in this range as processed
      for (let r = cell.row; r <= maxEndRow; r++) {
        for (let c = cell.col; c <= maxEndCol; c++) {
          processed.add(`${r},${c}`)
        }
      }
    } else {
      // Single cell
      ranges.push({
        start: { row: cell.row, col: cell.col },
        end: { row: cell.row, col: cell.col }
      })
      processed.add(cellKey)
    }
  }
  
  // Convert ranges to Excel notation
  return ranges.map(range => {
    const startLabel = `${getColumnLabel(range.start.col)}${range.start.row + 1}`
    if (range.start.row === range.end.row && range.start.col === range.end.col) {
      return startLabel
    }
    const endLabel = `${getColumnLabel(range.end.col)}${range.end.row + 1}`
    return `${startLabel}:${endLabel}`
  })
}
