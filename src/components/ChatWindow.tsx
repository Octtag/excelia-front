"use client"

import * as React from "react"
import { X, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatWindowProps {
  isOpen: boolean
  onClose: () => void
}

export default function ChatWindow({ isOpen, onClose }: ChatWindowProps) {
  const [messages, setMessages] = React.useState<Array<{ id: number; text: string; sender: "user" | "assistant" }>>([])
  const [inputValue, setInputValue] = React.useState("")

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
      <div className="flex items-center justify-between p-4 border-b border-emerald-200 bg-primary-500 text-white shadow-lg">
        <h2 className="text-lg font-semibold">Chat</h2>
        <button
          onClick={onClose}
          className="rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-emerald-300 p-1 text-white"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
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

