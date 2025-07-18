"use client"

import { useState } from "react"
import { ChevronRight, Monitor, Settings, Shield, Target, Users, Bell, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import AgentNetworkPage from "./agent-network/page"
import IntelligencePage from "./intelligence/page"
import SystemsPage from "./systems/page"
import DashboardPage from "./dashboard/page"
import DetailedReportsPage from "./detailed-reports/page"

export default function TacticalDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard") // Default to dashboard
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const pageTitles: { [key: string]: string } = {
    dashboard: "DASHBOARD",
    agents: "fin3Crunch AI",
    reports: "DETAILED REPORTS",
    intelligence: "INTELLIGENCE",
    systems: "SYSTEMS",
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`bg-card border-r border-border transition-all duration-300 fixed md:relative z-50 md:z-auto h-full md:h-auto ${
          sidebarCollapsed ? "w-16" : "w-70"
        } ${!sidebarCollapsed ? "md:block" : ""}`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            <div className={`${sidebarCollapsed ? "hidden" : "block"}`}>
              <h1 className="font-bold tracking-wider text-primary text-2xl">fin3Crunch</h1>
              <p className="text-muted-foreground text-xs">complete web3 metrics</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronRight
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${sidebarCollapsed ? "" : "rotate-180"}`}
              />
            </Button>
          </div>

          <nav className="space-y-2">
            {[
              { id: "dashboard", icon: Monitor, label: "DASHBOARD" },
              { id: "agents", icon: Users, label: "fin3Crunch AI" },
              { id: "reports", icon: Target, label: "DETAILED REPORTS" },
              { id: "intelligence", icon: Shield, label: "INTELLIGENCE" },
              { id: "systems", icon: Settings, label: "SYSTEMS" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors ${
                  activeSection === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="w-5 h-5 md:w-5 md:h-5 sm:w-6 sm:h-6" />
                {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <div className="mt-8 p-4 bg-secondary border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-foreground">SYSTEM ONLINE</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>UPTIME: 72:14:33</div>
                <div>AGENTS: 847 ACTIVE</div>
                <div>MISSIONS: 23 ONGOING</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {!sidebarCollapsed && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarCollapsed(true)} />
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${!sidebarCollapsed ? "md:ml-0" : ""}`}>
        {/* Top Toolbar */}
        <div className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              fin3Crunch / <span className="text-foreground font-medium">{pageTitles[activeSection]}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-muted-foreground">LAST UPDATE: 05/06/2025 20:00 UTC</div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto">
          {activeSection === "dashboard" && <DashboardPage />}
          {activeSection === "agents" && <AgentNetworkPage />}
          {activeSection === "reports" && <DetailedReportsPage />}
          {activeSection === "intelligence" && <IntelligencePage />}
          {activeSection === "systems" && <SystemsPage />}
        </div>
      </div>
    </div>
  )
}