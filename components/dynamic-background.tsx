"use client"

import { useEffect } from "react"

export default function DynamicBackground({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.classList.add("mouse-active")
      document.documentElement.style.setProperty("--x", `${e.clientX}px`)
      document.documentElement.style.setProperty("--y", `${e.clientY}px`)
    }

    // Also activate on the first mouse enter
    const handleMouseEnter = () => {
      document.documentElement.classList.add("mouse-active")
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseenter", handleMouseEnter)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseenter", handleMouseEnter)
      // Clean up the class on component unmount
      document.documentElement.classList.remove("mouse-active")
    }
  }, [])

  return <>{children}</>
}