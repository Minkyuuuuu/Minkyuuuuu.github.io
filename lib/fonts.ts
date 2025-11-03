import { Geist, Geist_Mono } from "next/font/google"
import { Dancing_Script } from "next/font/google"

export const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
})

export const dancingScript = Dancing_Script({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dancing",
})
