import React from "react"
import type { Metadata } from 'next'
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PageViewTracker } from '@/components/analytics/pageview-tracker'
import './globals.css'

const instrumentSans = Instrument_Sans({ 
  subsets: ["latin"],
  variable: '--font-instrument'
});

const instrumentSerif = Instrument_Serif({ 
  subsets: ["latin"],
  weight: "400",
  variable: '--font-instrument-serif'
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains'
});

export const metadata: Metadata = { title: 'AERION- Unlimited Cloud Storage by Zerogravity', description: 'Store everything with unlimited cloud storage. Your files, photos, and data safe and accessible anywhere with Zerogravity by AirSPACEx.', generator: 'v0.app', icons: { icon: '/favicon.svg' }, verification: { google: 'J8960fDnP-h-XgGtCRdpq3ZPJ_0uHVEPSHt5QWs5zTk' } }
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <Analytics />
        <PageViewTracker />
      </body>
    </html>
  )
}
