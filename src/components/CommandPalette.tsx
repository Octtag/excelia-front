"use client"

import { useState, useEffect, useRef } from "react"

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onExecute: (command: string) => void
  selectedRange: string
  cellCount: number
  position?: { x: number; y: number }
  isProcessing?: boolean
}

export default function CommandPalette({
  isOpen,
  onClose,
  onExecute,
  selectedRange,
  cellCount,
  position = { x: 0, y: 0 },
  isProcessing = false
}: CommandPaletteProps) {
  const [command, setCommand] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener("keydown", handleEscape, { capture: true })
    return () => window.removeEventListener("keydown", handleEscape, { capture: true })
  }, [isOpen, onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (command.trim() && !isProcessing) {
      onExecute(command.trim())
    }
  }

  if (!isOpen) return null

  // Calcular posicion para que aparezca arriba de la seleccion
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${Math.min(Math.max(position.x, 20), window.innerWidth - 620)}px`,
    top: `${Math.max(position.y - 180, 90)}px`,
    zIndex: 9999
  }

  return (
    <>
      {/* Overlay semitransparente */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.15s ease-out' }}
      />

      {/* Command Palette */}
      <div
        style={style}
        className="w-[600px] bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-600">
                Comando de IA
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-mono font-semibold text-emerald-700">
                  {selectedRange}
                </span>
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {cellCount} {cellCount === 1 ? 'celda' : 'celdas'}
              </span>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Describe la operacion... (ej: suma, promedio, maximo)"
                disabled={isProcessing}
                className="w-full pl-12 pr-4 py-3.5 text-[15px] bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 placeholder:text-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Sugerencias rapidas */}
            <div className="mt-3 flex flex-wrap gap-2">
              {['suma', 'promedio', 'maximo', 'minimo', 'contar'].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setCommand(suggestion)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-white border border-gray-200 rounded shadow-sm font-mono">
                Enter
              </kbd>
              <span>ejecutar</span>
              <span className="text-gray-300 mx-1">•</span>
              <kbd className="px-2 py-1 bg-white border border-gray-200 rounded shadow-sm font-mono">
                Esc
              </kbd>
              <span>cerrar</span>
            </div>

            <button
              type="submit"
              disabled={!command.trim() || isProcessing}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none transform transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
                'Ejecutar'
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}
