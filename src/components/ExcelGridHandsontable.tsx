"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { HotTable } from '@handsontable/react'
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/dist/handsontable.full.min.css'
import Handsontable from 'handsontable'
import CommandPalette from "@/components/CommandPalette"
import KeyboardHint from "@/components/KeyboardHint"

// Registrar todos los módulos de Handsontable
registerAllModules()

const ROWS = 100
const COLS = 26

export default function ExcelGridHandsontable() {
  const hotTableRef = useRef<any>(null)
  const [selectedCells, setSelectedCells] = useState<Array<{row: number, col: number, value: string}>>([])
  const [showCommandModal, setShowCommandModal] = useState(false)
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 })
  const [selectedRange, setSelectedRange] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Datos iniciales vacíos
  const [data, setData] = useState<string[][]>(() => 
    Array(ROWS).fill(null).map(() => Array(COLS).fill(''))
  )

  // Convertir número de columna a letra (0->A, 1->B, ..., 25->Z, 26->AA)
  const getColumnLabel = useCallback((col: number): string => {
    let label = ''
    let num = col
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label
      num = Math.floor(num / 26) - 1
    }
    return label
  }, [])

  // Formatear rango de selección (ej: "A1:C5" o "B3")
  const formatRange = useCallback((selection: [number, number, number, number]): string => {
    const [startRow, startCol, endRow, endCol] = selection
    const startLabel = `${getColumnLabel(startCol)}${startRow + 1}`

    if (startRow === endRow && startCol === endCol) {
      return startLabel
    }

    const endLabel = `${getColumnLabel(endCol)}${endRow + 1}`
    return `${startLabel}:${endLabel}`
  }, [getColumnLabel])

  // Only render Handsontable on the client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Detectar Ctrl+K para comando de IA
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        const hot = hotTableRef.current?.hotInstance
        if (!hot) return

        const selected = hot.getSelected() || []
        if (selected.length === 0) return

        const [startRow, startCol, endRow, endCol] = selected[0]

        // Extraer celdas seleccionadas
        const cells: Array<{row: number, col: number, value: string}> = []
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

        // Calcular posición del modal cerca de la celda
        const cellCoords = hot.getCell(startRow, startCol)
        if (cellCoords) {
          const rect = cellCoords.getBoundingClientRect()
          setModalPosition({
            x: rect.left,
            y: rect.top
          })
        }

        setSelectedCells(cells)
        setSelectedRange(formatRange(selected[0]))
        setShowCommandModal(true)
        
        return false
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [formatRange])

  const handleCloseModal = useCallback(() => {
    setShowCommandModal(false)
    setSelectedCells([])
    setSelectedRange("")
  }, [])

  const handleExecuteCommand = async (command: string) => {
    setIsProcessing(true)

    try {
      const response = await fetch("http://localhost:8000/api/excel/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command,
          selectedCells: selectedCells,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const hot = hotTableRef.current?.hotInstance
        if (!hot) return

        // Encontrar celda vacía cercana para el resultado
        const lastCell = selectedCells[selectedCells.length - 1]
        let targetRow = lastCell.row
        let targetCol = lastCell.col + 1

        // Si está fuera del límite, buscar abajo
        if (targetCol >= COLS) {
          targetCol = lastCell.col
          targetRow = lastCell.row + 1
        }

        // Insertar resultado
        hot.setDataAtCell(targetRow, targetCol, result.result)
        
        // Seleccionar la celda con el resultado
        hot.selectCell(targetRow, targetCol)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error("Error ejecutando comando:", error)
      alert("Error al procesar el comando. Verifica que el backend esté corriendo.")
    } finally {
      setIsProcessing(false)
      handleCloseModal()
    }
  }

  // Configuración de Handsontable
  const settings: Handsontable.GridSettings = {
    data: data,
    colHeaders: true,
    rowHeaders: true,
    height: 'calc(100vh - 80px)',
    width: '100%',
    licenseKey: 'non-commercial-and-evaluation',
    contextMenu: true,
    manualColumnResize: true,
    manualRowResize: true,
    copyPaste: true,
    undo: true,
    search: true,
    autoWrapRow: true,
    autoWrapCol: true,
    stretchH: 'all',
    // Estilo personalizado con colores verdes
    className: 'htCenter htMiddle excelia-table',
    cells: function(row, col) {
      const cellProperties: any = {}
      cellProperties.className = 'excelia-cell'
      return cellProperties
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white px-8 py-4 shadow-lg">
        <div className="flex items-center justify-between ml-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight ml-4">Excelia</h1>
            <p className="text-sm text-emerald-50 mt-1 ml-4 flex items-center gap-3">
              <span>Excel con IA</span>
              <span className="text-emerald-200/50">•</span>
              <KeyboardHint keys={['Ctrl', 'K']} action="comandos" variant="compact" />
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="bg-emerald-500/30 px-3 py-2 rounded-lg backdrop-blur-sm">
              <span className="text-emerald-50">Celdas: </span>
              <span className="font-semibold">{ROWS}×{COLS}</span>
            </div>
            {selectedCells.length > 0 && (
              <div className="bg-teal-400/40 px-3 py-2 rounded-lg animate-pulse backdrop-blur-sm">
                <span className="text-white">Seleccion: </span>
                <span className="font-semibold">{selectedCells.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Handsontable Container */}
      <div className="flex-1 overflow-hidden relative">
        {isMounted ? (
          <HotTable
            ref={hotTableRef}
            settings={settings}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Loading spreadsheet...</div>
          </div>
        )}

        {/* Command Palette estilo Cursor */}
        <CommandPalette
          isOpen={showCommandModal}
          onClose={handleCloseModal}
          onExecute={handleExecuteCommand}
          selectedRange={selectedRange}
          cellCount={selectedCells.length}
          position={modalPosition}
          isProcessing={isProcessing}
        />
      </div>

      {/* Estilos personalizados para Handsontable */}
      <style jsx global>{`
        .excelia-table .htCore td {
          border-color: #e5e7eb !important;
        }
        
        .excelia-table .htCore td.area {
          background-color: #f3f4f6 !important;
        }
        
        .excelia-table .htCore th {
          background: linear-gradient(to bottom, #f9fafb, #f3f4f6) !important;
          border-color: #d1d5db !important;
          font-weight: 600;
          color: #374151;
        }
        
        .excelia-table .htCore td.current {
          background-color: #f3f4f6 !important;
        }
        
        .excelia-table .wtBorder.current {
          border-color: #6b7280 !important;
        }
        
        .excelia-table .wtBorder.area {
          border-color: #6b7280 !important;
        }
        
        .excelia-cell {
          transition: background-color 0.1s ease;
        }
        
        .excelia-cell:hover {
          background-color: #f9fafb !important;
        }
      `}</style>
    </div>
  )
}