"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { HotTable } from '@handsontable/react'
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/dist/handsontable.full.min.css'
import Handsontable from 'handsontable'
import { MessageCircle } from "lucide-react"

// Registrar todos los módulos de Handsontable
registerAllModules()

const ROWS = 100
const COLS = 26

interface ExcelGridHandsontableProps {
  isChatOpen: boolean
  onToggleChat: () => void
}

export default function ExcelGridHandsontable({ isChatOpen, onToggleChat }: ExcelGridHandsontableProps) {
  const hotTableRef = useRef<HotTable>(null)
  const [selectedCells, setSelectedCells] = useState<Array<{row: number, col: number, value: string}>>([])
  const [showCommandModal, setShowCommandModal] = useState(false)
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 })
  const [command, setCommand] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Datos iniciales vacíos
  const [data, setData] = useState<string[][]>(() => 
    Array(ROWS).fill(null).map(() => Array(COLS).fill(''))
  )

  // Detectar Ctrl+K para comando de IA
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        
        const hot = hotTableRef.current?.hotInstance
        if (!hot) return

        const selected = hot.getSelected() || []
        if (selected.length === 0) return

        // Extraer celdas seleccionadas
        const cells: Array<{row: number, col: number, value: string}> = []
        selected.forEach(([startRow, startCol, endRow, endCol]) => {
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
        })

        setSelectedCells(cells)
        calculateModalPosition(selected[0])
        setShowCommandModal(true)
      }

      // ESC para cerrar
      if (e.key === "Escape") {
        setShowCommandModal(false)
        setCommand("")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const calculateModalPosition = (selection: [number, number, number, number]) => {
    const [startRow, startCol] = selection
    const cellCoords = hotTableRef.current?.hotInstance?.getCell(startRow, startCol)
    
    if (cellCoords) {
      const rect = cellCoords.getBoundingClientRect()
      setModalPosition({
        x: rect.left,
        y: Math.max(rect.top - 10, 80)
      })
    }
  }

  const handleExecuteCommand = async () => {
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
      setShowCommandModal(false)
      setCommand("")
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
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
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
            {selectedCells.length > 0 && (
              <div className="bg-teal-400/40 px-3 py-2 rounded-lg animate-pulse backdrop-blur-sm">
                <span className="text-white">Selección: </span>
                <span className="font-semibold">{selectedCells.length}</span>
              </div>
            )}
            <button
              onClick={onToggleChat}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Handsontable Container */}
      <div className="flex-1 overflow-hidden relative">
        <HotTable
          ref={hotTableRef}
          settings={settings}
        />

        {/* Modal contextual de comandos */}
        {showCommandModal && (
          <div
            className="absolute z-50 bg-white rounded-xl shadow-2xl border-2 border-emerald-200 p-5 min-w-[420px] animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              left: Math.min(modalPosition.x, window.innerWidth - 450),
              top: modalPosition.y,
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
                  {selectedCells.length} celda{selectedCells.length !== 1 ? "s" : ""}
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

      {/* Estilos personalizados para Handsontable */}
      <style jsx global>{`
        .excelia-table .htCore td {
          border-color: #e5e7eb !important;
        }
        
        .excelia-table .htCore td.area {
          background-color: #d1fae5 !important;
        }
        
        .excelia-table .htCore th {
          background: linear-gradient(to bottom, #f9fafb, #f3f4f6) !important;
          border-color: #d1d5db !important;
          font-weight: 600;
          color: #374151;
        }
        
        .excelia-table .htCore td.current {
          background-color: #a7f3d0 !important;
        }
        
        .excelia-table .wtBorder.current {
          border-color: #10b981 !important;
        }
        
        .excelia-table .wtBorder.area {
          border-color: #10b981 !important;
        }
        
        .excelia-cell {
          transition: background-color 0.1s ease;
        }
        
        .excelia-cell:hover {
          background-color: #f0fdf4 !important;
        }
      `}</style>
    </div>
  )
}

