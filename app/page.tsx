"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronRight, Monitor, Settings, Shield, Target, Users, Bell, RefreshCw, ShieldOff, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import AgentNetworkPage from "./agent-network/page"
import IntelligencePage from "./intelligence/page"
import SystemsPage from "./systems/page"
import DashboardPage from "./dashboard/page"
import DetailedReportsPage from "./detailed-reports/page"
import WallOfShamePage from "./wall-of-shame/page"
import { cn } from "@/lib/utils"

export default function TacticalDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // For desktop
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false) // For mobile

  const pageTitles: { [key: string]: string } = {
    dashboard: "DASHBOARD",
    agents: "fin3Crunch AI",
    reports: "DETAILED REPORTS",
    shame: "WALL OF SHAME",
    intelligence: "INTELLIGENCE",
    systems: "SYSTEMS",
  }

  const navItems = [
    { id: "dashboard", icon: Monitor, label: "DASHBOARD" },
    { id: "agents", icon: Users, label: "fin3Crunch AI" },
    { id: "reports", icon: Target, label: "DETAILED REPORTS" },
    { id: "shame", icon: ShieldOff, label: "WALL OF SHAME" },
    // { id: "intelligence", icon: Shield, label: "INTELLIGENCE" },
    // { id: "systems", icon: Settings, label: "SYSTEMS" },
  ]

  const handleNavClick = (sectionId: string) => {
    setActiveSection(sectionId)
    setMobileSidebarOpen(false) // Close mobile sidebar on navigation
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
            className={cn(
              "w-4 h-4 sm:w-5 sm:h-5 transition-transform",
              sidebarCollapsed && !isMobile ? "" : "rotate-180"
            )}
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
              sidebarCollapsed && !isMobile && "justify-center"
            )}
          >
            <item.icon className="w-5 h-5 md:w-5 md:h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            {(!sidebarCollapsed || isMobile) && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>
    </div>
  )

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:flex flex-col bg-black/30 backdrop-blur-lg border-r border-neutral-800 transition-all duration-300 h-full",
          sidebarCollapsed ? "w-16" : "w-72"
        )}
      >
        <SidebarContent isMobile={false} />
      </div>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed md:hidden top-0 left-0 h-full w-72 bg-black/30 backdrop-blur-lg border-r border-neutral-800 transition-transform duration-300 z-50",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent isMobile={true} />
      </div>
      {mobileSidebarOpen && (
        <div className="fixed md:hidden inset-0 bg-black/50 z-40" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
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
        </div>

        {/* Dashboard Content */}
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