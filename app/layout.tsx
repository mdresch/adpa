import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import { Inter, Roboto } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { RouteProgress } from "@/components/route-progress"
import { MobileWarning } from "@/components/MobileWarning"
import { AuthProvider } from "@/contexts/AuthContext"
import { WebSocketProvider } from "@/contexts/WebSocketContext"
import RoomStatusList from "@/components/room-status-list"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ClarityProvider } from "@/components/analytics/ClarityProvider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
})

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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${roboto.variable}`}>
      <body className="font-sans antialiased">
        <ClarityProvider projectId="uhyjwbsgsg">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AuthProvider>
              <WebSocketProvider>
                <Suspense fallback={null}>
                  <RouteProgress />
                </Suspense>
                {/* Mobile/Phone Warning (tablets OK!) */}
                <MobileWarning mode="warning" />
                {children}
                {/* Floating realtime rooms panel */}
                <div className="fixed bottom-6 right-6 z-50 w-80">
                  <RoomStatusList />
                </div>
                <Toaster />
              </WebSocketProvider>
            </AuthProvider>
          </ThemeProvider>
        </ClarityProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
