import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { RouteProgress } from "@/components/route-progress"
import { AuthProvider } from "@/contexts/AuthContext"
import { WebSocketProvider } from "@/contexts/WebSocketContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ADPA Admin Portal",
  description: "Advanced Document Processing & Automation Framework - Administration Portal",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <WebSocketProvider>
              <RouteProgress />
              {children}
              <Toaster />
              <SonnerToaster />
            </WebSocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
