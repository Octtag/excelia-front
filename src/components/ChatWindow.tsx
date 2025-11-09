"use client"

import * as React from "react"
import { X, Send } from "lucide-react"
import { cn, formatCellRanges } from "@/lib/utils"
import { useSelectedCells } from "@/contexts/SelectedCellsContext"

interface ChatWindowProps {
  isOpen: boolean
  onClose: () => void
}

export default function ChatWindow({ isOpen, onClose }: ChatWindowProps) {
  const [messages, setMessages] = React.useState<Array<{ id: number; text: string; sender: "user" | "assistant" }>>([])
  const [inputValue, setInputValue] = React.useState("")
  const { selectedCells } = useSelectedCells()
  
  // Format selected cells into range string
  const selectedRange = React.useMemo(() => {
    if (selectedCells.length === 0) return ""
    const ranges = formatCellRanges(selectedCells)
    return ranges.join(", ")
  }, [selectedCells])

  const handleSend = () => {
    if (!inputValue.trim()) return

    const newMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user" as const,
    }

    setMessages([...messages, newMessage])
    setInputValue("")
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
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 border border-white/30 rounded-lg backdrop-blur-sm">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-mono font-semibold text-white">
                {selectedRange}
              </span>
            </div>
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
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
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

