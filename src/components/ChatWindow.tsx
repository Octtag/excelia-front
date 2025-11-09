"use client"

import * as React from "react"
import { X, Send } from "lucide-react"
import { cn, formatCellRanges } from "@/lib/utils"
import { useSelectedCells } from "@/contexts/SelectedCellsContext"

interface ChatWindowProps {
  isOpen: boolean
  onClose: () => void
}

const COLS = 26

export default function ChatWindow({ isOpen, onClose }: ChatWindowProps) {
  const [messages, setMessages] = React.useState<Array<{ id: number; text: string; sender: "user" | "assistant" }>>([])
  const [inputValue, setInputValue] = React.useState("")
  const { selectedCells, restoreSelection, clearSelectedCells, hotInstance, isProcessing, setIsProcessing } = useSelectedCells()
  
  // Format selected cells into range string
  const selectedRange = React.useMemo(() => {
    if (selectedCells.length === 0) return ""
    const ranges = formatCellRanges(selectedCells)
    return ranges.join(", ")
  }, [selectedCells])

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
        const hot = hotInstance
        if (hot && selectedCells.length > 0) {
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
        }

        // Agregar mensaje de respuesta del asistente
        setMessages(prev => {
          const assistantMessage = {
            id: prev.length + 1,
            text: `Resultado: ${result.result}`,
            sender: "assistant" as const,
          }
          return [...prev, assistantMessage]
        })
      } else {
        // Agregar mensaje de error del asistente
        setMessages(prev => {
          const errorMessage = {
            id: prev.length + 1,
            text: `Error: ${result.error}`,
            sender: "assistant" as const,
          }
          return [...prev, errorMessage]
        })
      }
    } catch (error) {
      console.error("Error ejecutando comando:", error)
      // Agregar mensaje de error del asistente
      setMessages(prev => {
        const errorMessage = {
          id: prev.length + 1,
          text: "Error al procesar el comando. Verifica que el backend esté corriendo.",
          sender: "assistant" as const,
        }
        return [...prev, errorMessage]
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSend = () => {
    if (!inputValue.trim() || isProcessing) return

    const newMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user" as const,
    }

    setMessages(prev => [...prev, newMessage])
    const command = inputValue
    setInputValue("")
    
    // Ejecutar el comando
    handleExecuteCommand(command)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-full w-full bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex flex-col border-b border-emerald-200 bg-primary-500 text-white shadow-lg">
        <div className="flex items-center justify-between py-2 px-4">
          <h2 className="text-lg font-semibold">Chat</h2>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-emerald-300 p-1 text-white"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        
        {/* Selected Range Display */}
        {selectedRange && (
          <div className="px-4 pb-2 flex items-center gap-2">
            <div 
              onClick={restoreSelection}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 border border-white/30 rounded-lg backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
              title="Click to restore selection in grid"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-mono font-semibold text-white">
                {selectedRange}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                clearSelectedCells()
              }}
              className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded transition-colors"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Clear selection</span>
            </button>
            <span className="text-xs text-white/80 font-medium">
              {selectedCells.length} {selectedCells.length === 1 ? 'celda' : 'celdas'}
            </span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-emerald-700 text-sm">
            Start a conversation...
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.sender === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2",
                  message.sender === "user"
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white shadow-md"
                    : "bg-white text-gray-900 border border-emerald-200 shadow-sm"
                )}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-emerald-200 p-4 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isProcessing ? "Processing..." : "Type a message..."}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isProcessing}
            className="p-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:via-teal-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}

