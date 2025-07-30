"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react"

interface Message {
  role: "user" | "assistant"
  content: string
  data?: any
  recommendation?: { type: "buy" | "sell" | "hold" | "neutral"; message: string }
  chartData?: { date: string; price: number }[]
  volumeChartData?: { date: string; value: number }[]
  salesChartData?: { date: string; value: number }[]
  transactionsChartData?: { date: string; value: number }[]
  assetsChartData?: { date: string; value: number }[]
  tradersChartData?: { date: string; value: number }[]
  buyersChartData?: { date: string; value: number }[]
  sellersChartData?: { date: string; value: number }[]
  holdersChartData?: { date: string; value: number }[]
  whalesChartData?: { date: string; value: number }[]
  reportData?: any
}

interface AgentNetworkState {
  messages: Message[]
  marketAnalytics: any | null
  marketSummary: string | null
  isLoading: boolean
  error: string | null
}

interface AppContextType {
  walletAddress: string | null
  setWalletAddress: (address: string | null) => void
  blockchain: string
  agentNetworkState: AgentNetworkState
  setAgentNetworkState: React.Dispatch<React.SetStateAction<AgentNetworkState>>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddressState] = useState<string | null>(null)
  const [blockchain] = useState<string>("ethereum") // Hardcoded for now

  const [agentNetworkState, setAgentNetworkState] = useState<AgentNetworkState>({
    messages: [
      {
        role: "assistant",
        content: "Hello! I'm fin3Crunch AI, your Web3 analytics assistant. How can I help you today?",
      },
    ],
    marketAnalytics: null,
    marketSummary: null,
    isLoading: true, // Start with loading true for initial fetch
    error: null,
  })

  const setWalletAddress = (address: string | null) => {
    setWalletAddressState(address)
    try {
      if (address) {
        localStorage.setItem("walletAddress", address)
      } else {
        localStorage.removeItem("walletAddress")
      }
    } catch (error) {
      console.error("Could not access localStorage:", error)
    }
  }

  return (
    <AppContext.Provider
      value={{
        walletAddress,
        setWalletAddress,
        blockchain,
        agentNetworkState,
        setAgentNetworkState,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider")
  }
  return context
}