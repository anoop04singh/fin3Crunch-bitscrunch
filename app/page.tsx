"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ChevronRight,
  Monitor,
  Target,
  Users,
  ShieldOff,
  Menu,
  Wallet,
  LogOut,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import AgentNetworkPage from "./agent-network/page"
import IntelligencePage from "./intelligence/page"
import SystemsPage from "./systems/page"
import DashboardPage from "./dashboard/page"
import DetailedReportsPage from "./detailed-reports/page"
import WallOfShamePage from "./wall-of-shame/page"
import { cn } from "@/lib/utils"
import { useAppContext } from "./context/AppContext"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

export default function TacticalDashboard() {
  const [activeSection, setActiveSection] = useState("agents")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const { walletAddress, setWalletAddress } = useAppContext()

  const pageTitles: { [key: string]: string } = {
    dashboard: "WALLET METRICS",
    agents: "fin3Crunch AI",
    reports: "DETAILED REPORTS",
    shame: "WALL OF SHAME",
    intelligence: "INTELLIGENCE",
    systems: "SYSTEMS",
  }

  const navItems = [
    { id: "agents", icon: Users, label: "fin3Crunch AI" },
    { id: "dashboard", icon: Monitor, label: "WALLET METRICS" },
    { id: "reports", icon: Target, label: "DETAILED REPORTS" },
    { id: "shame", icon: ShieldOff, label: "WALL OF SHAME" },
  ]

  const handleNavClick = (sectionId: string) => {
    setActiveSection(sectionId)
    setMobileSidebarOpen(false)
  }

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        setIsConnecting(true)
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
          toast.success("Wallet Connected", {
            description: `${accounts[0].substring(0, 6)}...${accounts[0].substring(accounts[0].length - 4)}`,
          })
        } else {
          toast.error("No accounts found", {
            description: "Please ensure MetaMask has accounts.",
          })
        }
      } catch (err: any) {
        toast.error("Connection Failed", {
          description: err.message || "An unknown error occurred.",
        })
      } finally {
        setIsConnecting(false)
      }
    } else {
      toast.error("MetaMask Not Found", {
        description: "Please install the MetaMask extension to connect your wallet.",
      })
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
    toast.info("Wallet Disconnected")
  }

  const SidebarContent = ({ isMobile }: { isMobile: boolean }) => (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-8 h-[40px]">
        {(!sidebarCollapsed || isMobile) && (
          <div className="w-full">
            <Image src="/fin3crunchLogoBG.png" alt="fin3crunch Logo" width={160} height={40} priority />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (isMobile ? setMobileSidebarOpen(false) : setSidebarCollapsed(!sidebarCollapsed))}
          className="text-neutral-400 hover:text-teal-100"
        >
          <ChevronRight
            className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-transform", sidebarCollapsed && !isMobile ? "" : "rotate-180")}
          />
        </Button>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded transition-colors",
              activeSection === item.id
                ? "bg-teal-100 text-zinc-900"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800",
              sidebarCollapsed && !isMobile && "justify-center",
            )}
          >
            <item.icon className="w-5 h-5 md:w-5 md:h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            {(!sidebarCollapsed || isMobile) && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {(!sidebarCollapsed || isMobile) && (
        <div className="mt-auto text-center text-xs text-neutral-500 space-y-2 py-4">
          <p>
            Made with love by{" "}
            <a
              href="https://github.com/anoop04singh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-teal-300 underline"
            >
              Anoop Singh
            </a>{" "}
            ❤️
          </p>
          <p>Built using Gemini and BitsCrunch</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-screen">
      <div
        className={cn(
          "hidden md:flex flex-col bg-black/30 backdrop-blur-lg border-r border-neutral-800 transition-all duration-300 h-full",
          sidebarCollapsed ? "w-16" : "w-72",
        )}
      >
        <SidebarContent isMobile={false} />
      </div>

      <div
        className={cn(
          "fixed md:hidden top-0 left-0 h-full w-72 bg-black/30 backdrop-blur-lg border-r border-neutral-800 transition-transform duration-300 z-50",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent isMobile={true} />
      </div>
      {mobileSidebarOpen && (
        <div className="fixed md:hidden inset-0 bg-black/50 z-40" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-black/30 backdrop-blur-lg border-b border-neutral-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-neutral-400 hover:text-white -ml-4"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="text-sm text-neutral-400">
              fin3Crunch / <span className="text-teal-100">{pageTitles[activeSection]}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AnimatePresence>
              {walletAddress && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-xs text-neutral-400 font-mono bg-neutral-800/50 px-3 py-1.5 rounded-md border border-neutral-700 hidden sm:block"
                >
                  {`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}
                </motion.div>
              )}
            </AnimatePresence>
            {walletAddress ? (
              <Button
                onClick={disconnectWallet}
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Disconnect</span>
              </Button>
            ) : (
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                size="sm"
                className="bg-teal-500 hover:bg-teal-600 text-white"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className={activeSection === "dashboard" ? "block h-full" : "hidden"}>
            <DashboardPage />
          </div>
          <div className={activeSection === "agents" ? "block h-full" : "hidden"}>
            <AgentNetworkPage />
          </div>
          <div className={activeSection === "reports" ? "block h-full" : "hidden"}>
            <DetailedReportsPage />
          </div>
          <div className={activeSection === "shame" ? "block h-full" : "hidden"}>
            <WallOfShamePage />
          </div>
          <div className={activeSection === "intelligence" ? "block h-full" : "hidden"}>
            <IntelligencePage />
          </div>
          <div className={activeSection === "systems" ? "block h-full" : "hidden"}>
            <SystemsPage />
          </div>
        </div>
      </div>
    </div>
  )
}