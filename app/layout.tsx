import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { dancingScript, geistMono, geistSans } from "@/lib/fonts"
import "./globals.css"

export const metadata: Metadata = {
  title: "Minkyu",
  description: "hallooow",
  generator: "Minkyu.me",
  metadataBase: new URL("https://minkyu.me"),
  alternates: {
    canonical: "/",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${dancingScript.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
