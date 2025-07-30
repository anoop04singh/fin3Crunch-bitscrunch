"use client"

import { AppProvider } from "@/app/context/AppContext"
import { ReactNode } from "react"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      {children}
      <Toaster richColors theme="dark" />
    </AppProvider>
  )
}