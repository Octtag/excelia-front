"use client"

import { useEffect, useState } from "react"
import EditorPage from "@/components/EditorPage"

export default function Editor() {
  const [initialData, setInitialData] = useState<string[][] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Intentar cargar datos desde sessionStorage
    const storedData = sessionStorage.getItem("excelData")

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData)
        setInitialData(parsedData)
        // Limpiar sessionStorage después de cargar
        sessionStorage.removeItem("excelData")
      } catch (error) {
        console.error("Error al parsear datos del Excel:", error)
      }
    }

    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando editor...</p>
        </div>
      </div>
    )
  }

  return <EditorPage initialData={initialData} />
}
