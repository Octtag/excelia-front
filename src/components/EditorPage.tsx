"use client"

import { useState, useRef, useEffect } from "react"
import ExcelGridHandsontable from "@/components/ExcelGridHandsontable"
import ChatWindow from "@/components/ChatWindow"
import { MessageCircle, Home, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSelectedCells } from "@/contexts/SelectedCellsContext"
import * as XLSX from "xlsx"

const MIN_CHAT_WIDTH = 250
const MAX_CHAT_WIDTH = 800
const DEFAULT_CHAT_WIDTH = 450

interface EditorPageProps {
  initialData?: string[][]
}

export default function EditorPage({ initialData }: EditorPageProps) {
  const router = useRouter()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const { selectedCells, hotInstance } = useSelectedCells()
  const [headerHeight, setHeaderHeight] = useState(0)
  const [data, setData] = useState<string[][] | null>(initialData || null)
  const resizeRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const ROWS = data ? data.length : 100
  const COLS = data && data[0] ? data[0].length : 26

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight)
      }
    }

    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)

    const resizeObserver = new ResizeObserver(updateHeaderHeight)
    if (headerRef.current) {
      resizeObserver.observe(headerRef.current)
    }

    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const newWidth = window.innerWidth - e.clientX
      const clampedWidth = Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, newWidth))
      setChatWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleGoHome = () => {
    if (confirm("¿Seguro que querés volver al inicio? Los cambios no guardados se perderán.")) {
      router.push("/")
    }
  }

  const handleDownloadXLSX = () => {
    if (!hotInstance) {
      alert("No hay datos para descargar")
      return
    }

    try {
      // Obtener todos los datos de Handsontable
      let allData: any[][] = []
      
      if (hotInstance.getData && typeof hotInstance.getData === 'function') {
        allData = hotInstance.getData()
      } else {
        // Fallback: obtener datos celda por celda
        const ROWS = data ? data.length : 100
        const COLS = data && data[0] ? data[0].length : 26
        
        for (let row = 0; row < ROWS; row++) {
          const rowData: any[] = []
          for (let col = 0; col < COLS; col++) {
            const value = hotInstance.getDataAtCell(row, col)
            rowData.push(value !== null && value !== undefined ? value : '')
          }
          allData.push(rowData)
        }
      }

      // Limpiar filas y columnas vacías al final
      // Encontrar la última fila y columna con datos
      let lastRow = -1
      let lastCol = -1
      
      for (let row = allData.length - 1; row >= 0; row--) {
        for (let col = (allData[row]?.length || 0) - 1; col >= 0; col--) {
          const value = allData[row]?.[col]
          if (value !== null && value !== undefined && value !== '') {
            lastRow = Math.max(lastRow, row)
            lastCol = Math.max(lastCol, col)
          }
        }
      }

      // Si no hay datos, crear al menos una fila vacía
      if (lastRow === -1) {
        allData = [['']]
        lastRow = 0
        lastCol = 0
      } else {
        // Recortar a las dimensiones reales
        allData = allData.slice(0, lastRow + 1).map(row => 
          row.slice(0, lastCol + 1)
        )
      }

      // Crear workbook y worksheet
      const ws = XLSX.utils.aoa_to_sheet(allData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1")

      // Generar nombre de archivo con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const filename = `excelia-${timestamp}.xlsx`

      // Descargar el archivo
      XLSX.writeFile(wb, filename)
    } catch (error) {
      console.error("Error al descargar el archivo:", error)
      alert("Error al descargar el archivo. Por favor, intenta nuevamente.")
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col">
      {/* Header */}
      <div ref={headerRef} className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 text-white px-8 py-1 shadow-lg flex-shrink-0 z-50">
        <div className="flex items-center justify-between ml-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoHome}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Volver al inicio"
            >
              <Home className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight ml-4">Excelia</h1>
              <p className="text-sm text-emerald-50 mt-1 ml-4">
                Excel con IA · Presiona <kbd className="px-2 py-0.5 bg-emerald-500/50 rounded text-xs shadow-sm">Ctrl+K</kbd> para comandos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="bg-emerald-500/30 px-3 py-2 rounded-lg backdrop-blur-sm">
              <span className="text-emerald-50">Celdas: </span>
              <span className="font-semibold">{ROWS}×{COLS}</span>
            </div>
            <button
              onClick={handleDownloadXLSX}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-colors"
              title="Descargar como XLSX"
            >
              <Download className="h-5 w-5" />
              <span className="text-sm font-medium">Descargar</span>
            </button>
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Chat</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className={isChatOpen ? "transition-all duration-300 flex-1 relative overflow-hidden min-h-0 h-full" : "flex-1 w-full relative overflow-hidden min-h-0 h-full"}
        style={isChatOpen ? { width: `calc(100% - ${chatWidth}px)`, height: `calc(100vh - ${headerHeight}px)` } : { height: `calc(100vh - ${headerHeight}px)` }}
      >
        <ExcelGridHandsontable
          isChatOpen={isChatOpen}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          initialData={data}
        />
      </div>
      {isChatOpen && (
        <div
          className="absolute right-0 border-l border-gray-200 flex-shrink-0 flex flex-col z-30 bg-white"
          style={{ width: `${chatWidth}px`, top: `${headerHeight}px`, height: `calc(100% - ${headerHeight}px)` }}
        >
          {/* Resize Handle */}
          <div
            ref={resizeRef}
            onMouseDown={handleResizeStart}
            className="absolute -left-2 top-0 w-4 h-full cursor-col-resize z-40 group"
            style={{ cursor: isResizing ? "col-resize" : "col-resize" }}
          >
            <div className="absolute left-1/2 top-0 w-0.5 h-full bg-transparent group-hover:bg-blue-500/50 transition-colors" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-20 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="h-full w-full relative z-20">
            <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
