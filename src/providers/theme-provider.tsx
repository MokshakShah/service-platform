"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import Head from "next/head"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
