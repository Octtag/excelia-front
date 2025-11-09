"use client"

import { motion } from "framer-motion"
import { FileSpreadsheet, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef } from "react"
import * as XLSX from "xlsx"

export default function LandingPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCreateNew = () => {
    // Redirigir al editor con tabla vacía
    router.push("/editor")
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: "array" })

          // Validar que solo tenga una hoja
          if (workbook.SheetNames.length > 1) {
            alert("Error: El archivo debe tener solo una hoja. Este archivo tiene " + workbook.SheetNames.length + " hojas.")
            return
          }

          // Obtener la primera (y única) hoja
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]

          // Convertir a JSON con headers opcionales
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
            raw: false // Convertir todo a strings
          }) as string[][]

          // Guardar los datos en sessionStorage para pasarlos al editor
          sessionStorage.setItem("excelData", JSON.stringify(jsonData))

          // Redirigir al editor
          router.push("/editor")
        } catch (error) {
          console.error("Error al procesar el archivo:", error)
          alert("Error al procesar el archivo Excel. Por favor, verifica que sea un archivo válido.")
        }
      }

      reader.onerror = () => {
        alert("Error al leer el archivo.")
      }

      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error("Error:", error)
      alert("Error al cargar el archivo.")
    }

    // Resetear el input para permitir subir el mismo archivo de nuevo
    if (event.target) {
      event.target.value = ""
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full"
      >
        {/* Logo/Título */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
            Excel IA
          </h1>
          <p className="text-xl text-gray-600 font-light">
            ¿Qué querés hacer hoy?
          </p>
        </motion.div>

        {/* Botones de acción */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Crear nuevo Excel */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateNew}
            className="group relative overflow-hidden bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-emerald-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-emerald-100 rounded-full group-hover:bg-emerald-200 transition-colors duration-300">
                <FileSpreadsheet className="w-12 h-12 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Crear un nuevo Excel
                </h3>
                <p className="text-sm text-gray-500">
                  Comenzá con una hoja en blanco
                </p>
              </div>
            </div>

            {/* Efecto de brillo */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000" />
            </div>
          </motion.button>

          {/* Subir Excel existente */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUploadClick}
            className="group relative overflow-hidden bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-teal-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-teal-100 rounded-full group-hover:bg-teal-200 transition-colors duration-300">
                <Upload className="w-12 h-12 text-teal-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Subir un Excel existente
                </h3>
                <p className="text-sm text-gray-500">
                  Importá tu archivo .xlsx o .xls
                </p>
              </div>
            </div>

            {/* Efecto de brillo */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000" />
            </div>
          </motion.button>

          {/* Input oculto para subir archivos */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Información adicional */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-gray-400">
            Potenciado por IA para análisis y cálculos automáticos
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
