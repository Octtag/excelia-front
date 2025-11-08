"use client"

import { useState, useEffect, useRef, memo, useCallback, useMemo } from "react"

interface Cell {
  value: string
  row: number
  col: number
}

const ROWS = 70
const COLS = 70
const CELL_WIDTH = 100
const CELL_HEIGHT = 32
const HEADER_SIZE = 40
const INITIAL_ROWS_TO_LOAD = 30 // Cargar primeras 30 filas
const ROWS_PER_BATCH = 20 // Cargar 20 filas por vez

// Componente de celda memoizado para evitar re-renders innecesarios
const CellComponent = memo(({
  cell,
  isSelected,
  onMouseDown,
  onMouseEnter,
  onChange
}: {
  cell: Cell
  isSelected: boolean
  onMouseDown: () => void
  onMouseEnter: () => void
  onChange: (value: string) => void
}) => {
  return (
    <input
      type="text"
      value={cell.value}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      className={`border-r border-b border-gray-200 px-2 text-sm outline-none transition-colors duration-100 ${
        isSelected
          ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400 z-10"
          : "bg-white focus:bg-emerald-50/50 focus:ring-2 focus:ring-emerald-300"
      }`}
      style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}
    />
  )
})

CellComponent.displayName = "CellComponent"

export default function ExcelGrid() {
  const [cells, setCells] = useState<Cell[][]>([])
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [showCommandModal, setShowCommandModal] = useState(false)
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 })
  const [command, setCommand] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadedRowsCount, setLoadedRowsCount] = useState(INITIAL_ROWS_TO_LOAD)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Inicializar grid con lazy loading
  useEffect(() => {
    const initialCells: Cell[][] = []
    // Inicializar todas las filas pero solo renderizaremos las primeras
    for (let row = 0; row < ROWS; row++) {
      initialCells[row] = []
      for (let col = 0; col < COLS; col++) {
        initialCells[row][col] = { value: "", row, col }
      }
    }
    setCells(initialCells)
  }, [])

  // Detectar scroll y cargar más filas
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

      // Si el usuario scrolleó más del 70% y aún hay filas por cargar
      if (scrollPercentage > 0.7 && loadedRowsCount < ROWS && !isLoadingMore) {
        setIsLoadingMore(true)
        
        // Simular un pequeño delay para cargar más filas (opcional, mejora UX)
        setTimeout(() => {
          setLoadedRowsCount(prev => Math.min(prev + ROWS_PER_BATCH, ROWS))
          setIsLoadingMore(false)
        }, 100)
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [loadedRowsCount, isLoadingMore])

  // Detectar Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        if (selectedCells.size > 0) {
          calculateModalPosition()
          setShowCommandModal(true)
        }
      }
      // ESC para cerrar
      if (e.key === "Escape") {
        setShowCommandModal(false)
        setCommand("")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedCells])

  const calculateModalPosition = () => {
    const selected = Array.from(selectedCells).map(key => {
      const [row, col] = key.split("-").map(Number)
      return { row, col }
    })

    const minRow = Math.min(...selected.map(c => c.row))
    const minCol = Math.min(...selected.map(c => c.col))

    // Posicionar el modal arriba de la primera celda seleccionada
    const x = HEADER_SIZE + (minCol * CELL_WIDTH)
    const y = HEADER_SIZE + (minRow * CELL_HEIGHT) - 10

    setModalPosition({ x, y })
  }

  const getCellKey = useCallback((row: number, col: number) => `${row}-${col}`, [])

  const handleMouseDown = useCallback((row: number, col: number) => {
    setIsSelecting(true)
    const newSelected = new Set<string>()
    newSelected.add(getCellKey(row, col))
    setSelectedCells(newSelected)
  }, [getCellKey])

  const handleMouseEnter = useCallback((row: number, col: number) => {
    if (isSelecting) {
      setSelectedCells(prev => {
        const newSet = new Set(prev)
        newSet.add(getCellKey(row, col))
        return newSet
      })
    }
  }, [isSelecting, getCellKey])

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false)
  }, [])

  const handleCellChange = useCallback((row: number, col: number, value: string) => {
    setCells(prev => {
      const newCells = [...prev]
      newCells[row][col] = { ...newCells[row][col], value }
      return newCells
    })
  }, [])

  const getSelectedCellsData = () => {
    const data: { row: number; col: number; value: string }[] = []
    selectedCells.forEach(key => {
      const [row, col] = key.split("-").map(Number)
      data.push({ row, col, value: cells[row][col].value })
    })
    return data
  }

  const findEmptyCellNearSelection = () => {
    const selected = Array.from(selectedCells).map(key => {
      const [row, col] = key.split("-").map(Number)
      return { row, col }
    })

    const maxRow = Math.max(...selected.map(c => c.row))
    const maxCol = Math.max(...selected.map(c => c.col))

    // Intentar celda a la derecha
    if (maxCol + 1 < COLS && !cells[maxRow][maxCol + 1].value) {
      return { row: maxRow, col: maxCol + 1 }
    }

    // Intentar celda abajo
    if (maxRow + 1 < ROWS && !cells[maxRow + 1][maxCol].value) {
      return { row: maxRow + 1, col: maxCol }
    }

    return { row: maxRow, col: maxCol }
  }

  const handleExecuteCommand = async () => {
    setIsProcessing(true)

    try {
      const selectedData = getSelectedCellsData()

      const response = await fetch("http://localhost:8000/api/excel/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command,
          selectedCells: selectedData,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const targetCell = result.targetCell || findEmptyCellNearSelection()
        handleCellChange(targetCell.row, targetCell.col, result.result)
      }
    } catch (error) {
      console.error("Error ejecutando comando:", error)
      alert("Error al procesar el comando. Verifica que el backend esté corriendo.")
    } finally {
      setIsProcessing(false)
      setShowCommandModal(false)
      setCommand("")
    }
  }

  const getColumnLabel = useCallback((col: number) => {
    let label = ""
    let num = col
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label
      num = Math.floor(num / 26) - 1
    }
    return label
  }, [])

  // Memoizar headers de columnas
  const columnHeaders = useMemo(() =>
    Array.from({ length: COLS }).map((_, col) => (
      <div
        key={col}
        className="bg-gradient-to-b from-gray-50 to-gray-100 border-r border-b-2 border-gray-300 flex items-center justify-center font-semibold text-xs text-gray-700"
        style={{ width: CELL_WIDTH, height: HEADER_SIZE }}
      >
        {getColumnLabel(col)}
      </div>
    )), [getColumnLabel])

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50" onMouseUp={handleMouseUp}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white px-8 py-4 shadow-lg">
        <div className="flex items-center justify-between ml-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight ml-4">Excelia</h1>
            <p className="text-sm text-emerald-50 mt-1 ml-4">
              Excel con IA · Presiona <kbd className="px-2 py-0.5 bg-emerald-500/50 rounded text-xs shadow-sm">Ctrl+K</kbd> para comandos
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="bg-emerald-500/30 px-3 py-2 rounded-lg backdrop-blur-sm">
              <span className="text-emerald-50">Celdas: </span>
              <span className="font-semibold">{ROWS}×{COLS}</span>
            </div>
            {selectedCells.size > 0 && (
              <div className="bg-teal-400/40 px-3 py-2 rounded-lg animate-pulse backdrop-blur-sm">
                <span className="text-white">Selección: </span>
                <span className="font-semibold">{selectedCells.size}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto relative" ref={scrollContainerRef}>
        <div className="inline-block min-w-full">
          {/* Header con letras de columnas */}
          <div className="sticky top-0 z-20 flex bg-white shadow-sm">
            <div
              className="sticky left-0 z-30 bg-gradient-to-br from-gray-100 to-gray-200 border-r-2 border-b-2 border-gray-300"
              style={{ width: HEADER_SIZE, height: HEADER_SIZE }}
            />
            {columnHeaders}
          </div>

          {/* Grid de celdas - Solo renderiza filas cargadas */}
          {cells.slice(0, loadedRowsCount).map((row, rowIndex) => (
            <div key={rowIndex} className="flex">
              {/* Número de fila */}
              <div
                className="sticky left-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-r-2 border-b border-gray-300 flex items-center justify-center font-semibold text-xs text-gray-700"
                style={{ width: HEADER_SIZE, height: CELL_HEIGHT }}
              >
                {rowIndex + 1}
              </div>

              {row.map((cell, colIndex) => {
                const isSelected = selectedCells.has(getCellKey(rowIndex, colIndex))
                return (
                  <CellComponent
                    key={colIndex}
                    cell={cell}
                    isSelected={isSelected}
                    onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                    onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                    onChange={(value) => handleCellChange(rowIndex, colIndex, value)}
                  />
                )
              })}
            </div>
          ))}

          {/* Placeholder para filas no cargadas - mantiene el scroll correcto */}
          {loadedRowsCount < ROWS && (
            <div 
              style={{ 
                height: (ROWS - loadedRowsCount) * CELL_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(to bottom, transparent, rgba(16, 185, 129, 0.05))'
              }}
            >
              {isLoadingMore && (
                <div className="flex items-center gap-2 text-emerald-600 bg-white px-4 py-2 rounded-lg shadow-md">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm font-medium">Cargando más filas...</span>
                </div>
              )}
            </div>
          )}

          {/* Indicador de filas cargadas */}
          {loadedRowsCount < ROWS && !isLoadingMore && (
            <div className="sticky bottom-0 left-0 right-0 bg-emerald-50/80 backdrop-blur-sm border-t-2 border-emerald-200 px-4 py-2 text-center text-xs text-emerald-700 font-medium">
              Mostrando {loadedRowsCount} de {ROWS} filas · Scroll para cargar más
            </div>
          )}
        </div>

        {/* Modal contextual de comandos */}
        {showCommandModal && (
          <div
            className="absolute z-50 bg-white rounded-xl shadow-2xl border-2 border-emerald-200 p-5 min-w-[420px] animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              left: Math.min(modalPosition.x, window.innerWidth - 450),
              top: Math.max(modalPosition.y - 100, 80),
            }}
          >
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Comando de IA</h3>
                </div>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
                  {selectedCells.size} celda{selectedCells.size !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Describe qué quieres hacer con la selección
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder='Ej: "Calcula el promedio"'
                className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isProcessing && command.trim()) {
                    handleExecuteCommand()
                  }
                }}
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowCommandModal(false)
                    setCommand("")
                  }}
                  className="px-4 py-2 text-sm text-gray-700 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExecuteCommand}
                  className="px-5 py-2 text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:via-teal-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 transition-all shadow-md hover:shadow-lg font-medium"
                  disabled={isProcessing || !command.trim()}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Procesando...
                    </span>
                  ) : (
                    "Ejecutar"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
