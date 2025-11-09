"use client"

import { useState } from "react"
import ExcelGridHandsontable from "@/components/ExcelGridHandsontable";
import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false)

  console.log(isChatOpen)
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className={isChatOpen ? "w-[80%] transition-all duration-300" : "flex-1"}>
        <ExcelGridHandsontable 
          isChatOpen={isChatOpen}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
        />
      </div>
      {isChatOpen && (
        <div className="w-[20%] h-full border-l border-gray-200 flex-shrink-0 flex flex-col">
          <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </div>
      )}
    </div>
  );
}