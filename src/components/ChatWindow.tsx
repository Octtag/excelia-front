"use client"

import * as React from "react"
import { X, Send, Copy, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Skeleton from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css"
import { cn, formatCellRanges } from "@/lib/utils"
import { useSelectedCells } from "@/contexts/SelectedCellsContext"

interface ChatWindowProps {
  isOpen: boolean
  onClose: () => void
}

interface Message {
  id: number
  text: string
  sender: "user" | "assistant"
}

const COLS = 26

export default function ChatWindow({ isOpen, onClose }: ChatWindowProps) {
  const firstMessage: Message = {
    id: 1,
    text: `**¡Hola!** Soy un asistente experto en análisis de datos de hojas de cálculo Excel.

Puedo ayudarte a:

**Realizar cálculos y análisis estadísticos** utilizando las herramientas disponibles.
**Comparar celdas con el resto de la hoja de cálculo**.
**Entender la estructura general de los datos y sus relaciones**.
**Identificar patrones o tendencias**.
Para empezar, por favor, dime qué te gustaría analizar o qué pregunta tienes sobre los datos de la hoja de cálculo.`,
    sender: "assistant"
  }
  const [messages, setMessages] = React.useState<Array<Message>>([firstMessage])
  const [inputValue, setInputValue] = React.useState("")
  const [copiedTableId, setCopiedTableId] = React.useState<string | null>(null)
  const { selectedCells, allCells, restoreSelection, clearSelectedCells, hotInstance, isProcessing, setIsProcessing, updateAllCells } = useSelectedCells()
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)
  
  // Format selected cells into range string
  const selectedRange = React.useMemo(() => {
    if (selectedCells.length === 0) return ""
    const ranges = formatCellRanges(selectedCells)
    return ranges.join(", ")
  }, [selectedCells])

  // Scroll to bottom when messages change or when processing starts
  const scrollToBottom = React.useCallback(() => {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }, [])

  React.useEffect(() => {
    scrollToBottom()
  }, [messages, isProcessing, scrollToBottom])

  // Función para seleccionar un rango de celdas
  const handleSelectRange = React.useCallback((startRow: number, startCol: number, endRow: number, endCol: number) => {
    if (!hotInstance) return
    
    // Seleccionar las celdas usando selectCells
    hotInstance.selectCells([[startRow, startCol, endRow, endCol]], true, false)
  }, [hotInstance])

  // Procesar el texto para reemplazar etiquetas <selectRange> con un formato especial
  const processTextWithSelectRange = React.useCallback((text: string): string => {
    // Expresión regular para encontrar etiquetas <selectRange> con atributos opcionales como label
    // Maneja: <selectRange startRow="18" startCol="0" endRow="22" endCol="16" label="esta sección">esta sección</selectRange>
    // También maneja el caso sin label: <selectRange startRow="18" startCol="0" endRow="22" endCol="16">esta sección</selectRange>
    const selectRangeRegex = /<selectRange\s+startRow="(\d+)"\s+startCol="(\d+)"\s+endRow="(\d+)"\s+endCol="(\d+)"(?:\s+label="([^"]*)")?\s*>(.*?)<\/selectRange>/g
    
    // Reemplazar las etiquetas con un formato especial que luego procesaremos
    return text.replace(selectRangeRegex, (match, startRow, startCol, endRow, endCol, label, linkText) => {
      // Usar el label si está disponible, sino usar el linkText
      const displayText = (label && label.trim()) || (linkText && linkText.trim()) || 'Ver celdas'
      // Usar un formato especial que luego procesaremos en los componentes
      return `[SELECTRANGE:${startRow}:${startCol}:${endRow}:${endCol}:${displayText}]`
    })
  }, [])

  // Procesar el texto procesado para convertir los marcadores especiales en componentes React
  const renderProcessedText = React.useCallback((text: string | React.ReactNode): React.ReactNode => {
    // Si no es un string, devolverlo tal cual
    if (typeof text !== 'string') {
      return text
    }
    
    // Expresión regular para encontrar los marcadores especiales
    const markerRegex = /\[SELECTRANGE:(\d+):(\d+):(\d+):(\d+):(.*?)\]/g
    
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match
    let keyCounter = 0
    
    // Resetear el regex para evitar problemas con múltiples llamadas
    markerRegex.lastIndex = 0
    
    while ((match = markerRegex.exec(text)) !== null) {
      const [fullMatch, startRow, startCol, endRow, endCol, linkText] = match
      const matchIndex = match.index
      
      // Agregar el texto antes del marcador
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex))
      }
      
      // Agregar el componente de enlace
      parts.push(
        <a
          key={`selectRange-${keyCounter++}`}
          href="#"
          onClick={(e) => {
            e.preventDefault()
            handleSelectRange(
              parseInt(startRow),
              parseInt(startCol),
              parseInt(endRow),
              parseInt(endCol)
            )
          }}
          className="text-emerald-600 underline hover:text-emerald-700 cursor-pointer font-medium"
        >
          {linkText}
        </a>
      )
      
      lastIndex = matchIndex + fullMatch.length
    }
    
    // Agregar el texto restante
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return parts.length > 0 ? <>{parts}</> : text
  }, [handleSelectRange])

  // Función para copiar tabla al portapapeles
  const copyTableToClipboard = React.useCallback((tableElement: HTMLTableElement, tableId: string) => {
    try {
      // Extraer datos de la tabla
      const rows: string[][] = []
      const tableRows = tableElement.querySelectorAll('tr')
      
      tableRows.forEach((row) => {
        const cells: string[] = []
        const thCells = row.querySelectorAll('th')
        const tdCells = row.querySelectorAll('td')
        
        thCells.forEach((cell) => {
          cells.push(cell.textContent?.trim() || '')
        })
        
        tdCells.forEach((cell) => {
          cells.push(cell.textContent?.trim() || '')
        })
        
        if (cells.length > 0) {
          rows.push(cells)
        }
      })
      
      // Convertir a formato tab-separated values (TSV) para Excel
      const tsvContent = rows.map(row => row.join('\t')).join('\n')
      
      // Copiar al portapapeles
      navigator.clipboard.writeText(tsvContent).then(() => {
        setCopiedTableId(tableId)
        setTimeout(() => {
          setCopiedTableId(null)
        }, 2000)
      }).catch((err) => {
        console.error('Error al copiar tabla:', err)
      })
    } catch (error) {
      console.error('Error al copiar tabla:', error)
    }
  }, [])

  // Obtener todas las celdas de la instancia de Handsontable y convertirlas al formato de SelectedCell[]
  const getSheetContextFromHotInstance = React.useCallback((hotInstance: any): Array<{ row: number; col: number; value: string }> => {
    if (!hotInstance) return []
    
    const sheetContext: Array<{ row: number; col: number; value: string }> = []
    const ROWS = 100
    const COLS = 26
    
    // Intentar usar getData() si está disponible (más eficiente)
    let allData: string[][] = []
    if (hotInstance.getData && typeof hotInstance.getData === 'function') {
      const data = hotInstance.getData()
      allData = data.map((row: any[]) => 
        row.map((cell: any) => cell ? String(cell) : '')
      )
    } else {
      // Fallback: usar getDataAtCell para todas las celdas
      for (let row = 0; row < ROWS; row++) {
        const rowData: string[] = []
        for (let col = 0; col < COLS; col++) {
          const value = hotInstance.getDataAtCell(row, col)
          rowData.push(value ? String(value) : '')
        }
        allData.push(rowData)
      }
    }
    
    // Convertir a formato de sheet_context (solo celdas con valor)
    for (let row = 0; row < allData.length; row++) {
      for (let col = 0; col < allData[row].length; col++) {
        const value = allData[row][col]
        // Solo incluir celdas que tengan valor (no vacías)
        if (value && value.trim() !== '') {
          sheetContext.push({
            row,
            col,
            value: String(value)
          })
        }
      }
    }
    
    return sheetContext
  }, [])

  const handleExecuteCommand = async (command: string) => {
    setIsProcessing(true)

    try {
      // Obtener sheet_context directamente de la instancia de Handsontable
      const sheetContext = hotInstance ? getSheetContextFromHotInstance(hotInstance) : []
      
      // Actualizar el estado de allCells para futuras referencias
      if (hotInstance) {
        updateAllCells(hotInstance)
      }
      
      const response = await fetch("http://localhost:8000/api/excel/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command,
          selectedCells: selectedCells.length > 0 ? selectedCells : null,
          sheetContext: sheetContext,
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

          // // Insertar resultado
          // hot.setDataAtCell(targetRow, targetCol, result.result)
          
          // // Seleccionar la celda con el resultado
          // hot.selectCell(targetRow, targetCol)
        }

        // Agregar mensaje de respuesta del asistente
        setMessages(prev => {
          const assistantMessage = {
            id: prev.length + 1,
            text: result.result || "",
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
        
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
        {messages.length === 0 && !isProcessing && (
          <div className="flex items-center justify-center h-full text-emerald-700 text-sm">
            Start a conversation...
          </div>
        )}
        
        {messages.length > 0 && (
          <>
            {messages.map((message) => (
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
                  {message.sender === "assistant" ? (
                    <div className="text-sm markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}: any) => {
                            const children = React.Children.toArray(props.children)
                            const processedChildren = children.map((child: any, index: number) => {
                              if (typeof child === 'string') {
                                const processed = processTextWithSelectRange(child)
                                return <React.Fragment key={`h1-${index}`}>{renderProcessedText(processed)}</React.Fragment>
                              }
                              return <React.Fragment key={`h1-${index}`}>{child}</React.Fragment>
                            })
                            return <h1 className="text-lg font-semibold mb-2 mt-3 text-gray-900" {...props}>{processedChildren}</h1>
                          },
                          h2: ({node, ...props}: any) => {
                            const children = React.Children.toArray(props.children)
                            const processedChildren = children.map((child: any, index: number) => {
                              if (typeof child === 'string') {
                                const processed = processTextWithSelectRange(child)
                                return <React.Fragment key={`h2-${index}`}>{renderProcessedText(processed)}</React.Fragment>
                              }
                              return <React.Fragment key={`h2-${index}`}>{child}</React.Fragment>
                            })
                            return <h2 className="text-base font-semibold mb-2 mt-3 text-gray-900" {...props}>{processedChildren}</h2>
                          },
                          h3: ({node, ...props}: any) => {
                            const children = React.Children.toArray(props.children)
                            const processedChildren = children.map((child: any, index: number) => {
                              if (typeof child === 'string') {
                                const processed = processTextWithSelectRange(child)
                                return <React.Fragment key={`h3-${index}`}>{renderProcessedText(processed)}</React.Fragment>
                              }
                              return <React.Fragment key={`h3-${index}`}>{child}</React.Fragment>
                            })
                            return <h3 className="text-sm font-semibold mb-1 mt-2 text-gray-900" {...props}>{processedChildren}</h3>
                          },
                          p: ({node, ...props}: any) => {
                            const children = React.Children.toArray(props.children)
                            const processedChildren = children.map((child: any, index: number) => {
                              if (typeof child === 'string') {
                                // Procesar el texto para reemplazar etiquetas selectRange
                                const processed = processTextWithSelectRange(child)
                                return <React.Fragment key={`p-${index}`}>{renderProcessedText(processed)}</React.Fragment>
                              }
                              return <React.Fragment key={`p-${index}`}>{child}</React.Fragment>
                            })
                            return <p className="mb-2 text-gray-900 leading-relaxed" {...props}>{processedChildren}</p>
                          },
                          text: ({node, ...props}: any) => {
                            // Procesar el texto directamente
                            if (typeof props.children === 'string') {
                              const processed = processTextWithSelectRange(props.children)
                              return renderProcessedText(processed)
                            }
                            return <>{props.children}</>
                          },
                          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1 text-gray-900" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-900" {...props} />,
                          li: ({node, ...props}: any) => {
                            const children = React.Children.toArray(props.children)
                            const processedChildren = children.map((child: any, index: number) => {
                              if (typeof child === 'string') {
                                const processed = processTextWithSelectRange(child)
                                return <React.Fragment key={`li-${index}`}>{renderProcessedText(processed)}</React.Fragment>
                              }
                              return <React.Fragment key={`li-${index}`}>{child}</React.Fragment>
                            })
                            return <li className="text-gray-900" {...props}>{processedChildren}</li>
                          },
                          code: ({node, inline, ...props}: any) => 
                            inline ? (
                              <code className="bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                            ) : (
                              <code className="block bg-gray-100 border border-gray-200 rounded p-2 overflow-x-auto text-xs font-mono" {...props} />
                            ),
                          pre: ({node, ...props}) => <pre className="bg-gray-100 border border-gray-200 rounded p-2 overflow-x-auto mb-2" {...props} />,
                          strong: ({node, ...props}: any) => {
                            const children = React.Children.toArray(props.children)
                            const processedChildren = children.map((child: any, index: number) => {
                              if (typeof child === 'string') {
                                const processed = processTextWithSelectRange(child)
                                return <React.Fragment key={`strong-${index}`}>{renderProcessedText(processed)}</React.Fragment>
                              }
                              return <React.Fragment key={`strong-${index}`}>{child}</React.Fragment>
                            })
                            return <strong className="font-semibold text-gray-900" {...props}>{processedChildren}</strong>
                          },
                          em: ({node, ...props}) => <em className="italic text-gray-900" {...props} />,
                          a: ({node, ...props}) => <a className="text-emerald-600 underline hover:text-emerald-700" {...props} />,
                          blockquote: ({node, ...props}: any) => {
                            const children = React.Children.toArray(props.children)
                            const processedChildren = children.map((child: any, index: number) => {
                              if (typeof child === 'string') {
                                const processed = processTextWithSelectRange(child)
                                return <React.Fragment key={`blockquote-${index}`}>{renderProcessedText(processed)}</React.Fragment>
                              }
                              return <React.Fragment key={`blockquote-${index}`}>{child}</React.Fragment>
                            })
                            return <blockquote className="border-l-4 border-emerald-300 pl-3 italic my-2 text-gray-700" {...props}>{processedChildren}</blockquote>
                          },
                          hr: ({node, ...props}) => <hr className="my-3 border-gray-300" {...props} />,
                          table: ({node, ...props}: any) => {
                            const [tableId] = React.useState(() => `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
                            const containerRef = React.useRef<HTMLDivElement>(null)
                            const isCopied = copiedTableId === tableId
                            
                            const handleCopy = () => {
                              if (containerRef.current) {
                                const tableElement = containerRef.current.querySelector('table') as HTMLTableElement
                                if (tableElement) {
                                  copyTableToClipboard(tableElement, tableId)
                                }
                              }
                            }
                            
                            return (
                              <div ref={containerRef} className="relative my-4 rounded-lg border border-emerald-200 shadow-sm group">
                                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-md shadow-sm hover:bg-emerald-50 hover:border-emerald-400 transition-colors text-sm font-medium text-emerald-700"
                                    title="Copiar tabla"
                                  >
                                    {isCopied ? (
                                      <>
                                        <Check className="w-4 h-4" />
                                        <span>Copiado</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-4 h-4" />
                                        <span>Copiar</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="overflow-x-auto">
                                  <table 
                                    className="border-collapse w-full min-w-full" 
                                    {...props} 
                                  />
                                </div>
                              </div>
                            )
                          },
                          thead: ({node, ...props}) => <thead className="bg-gradient-to-r from-emerald-100 to-teal-100" {...props} />,
                          tbody: ({node, ...props}) => <tbody className="bg-white divide-y divide-emerald-100" {...props} />,
                          tr: ({node, ...props}) => <tr className="hover:bg-emerald-50 transition-colors" {...props} />,
                          th: ({node, ...props}: any) => {
                            // Obtener alineación del nodo o de props
                            const alignment = (node?.properties?.align as string) || props.align || 'left'
                            const alignClass = alignment === 'right' ? 'text-right' : alignment === 'center' ? 'text-center' : 'text-left'
                            return (
                              <th 
                                className={`border-b-2 border-emerald-300 px-4 py-2.5 font-semibold text-gray-900 ${alignClass}`} 
                                {...props} 
                              />
                            )
                          },
                          td: ({node, ...props}: any) => {
                            // Obtener alineación del nodo o de props
                            const alignment = (node?.properties?.align as string) || props.align || 'left'
                            const alignClass = alignment === 'right' ? 'text-right' : alignment === 'center' ? 'text-center' : 'text-left'
                            return (
                              <td 
                                className={`border-b border-emerald-100 px-4 py-2.5 text-gray-700 ${alignClass}`} 
                                {...props} 
                              />
                            )
                          },
                        }}
                      >
                        {processTextWithSelectRange(message.text)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{message.text}</p>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
        
        {/* Loading Skeleton Message */}
        {(isProcessing) && (
          <div className="w-full justify-start animate-fade-in">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-white border border-emerald-200 shadow-sm">
              <div className="space-y-3">
                <Skeleton height={16} width="100%" />
                <Skeleton height={16} width="83%" />
                <Skeleton height={16} width="80%" />
              </div>
            </div>
          </div>
        )}
        {/* Scroll target */}
        <div ref={messagesEndRef} />
      </div>

        {/* Selected Range Display */}
        {selectedRange && (
          <div className="px-4 pb-3 pt-2 border-t border-emerald-200/50 bg-gradient-to-r from-emerald-100/80 via-teal-100/80 to-green-100/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                  Pregunta sobre:
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div 
                onClick={restoreSelection}
                className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-emerald-400 rounded-lg cursor-pointer hover:bg-emerald-50 hover:border-emerald-500 transition-all shadow-sm"
                title="Click to restore selection in grid"
              >
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-mono font-bold text-emerald-900">
                  {selectedRange}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearSelectedCells()
                }}
                className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-white/60 rounded transition-colors"
                title="Clear selection"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear selection</span>
              </button>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/60 rounded-lg border border-emerald-200">
                <span className="text-xs text-emerald-800 font-medium">
                  {selectedCells.length} {selectedCells.length === 1 ? 'celda' : 'celdas'} seleccionada{selectedCells.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
        )}
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

