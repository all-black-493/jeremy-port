import { SanityLive } from "@/sanity/lib/live";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Providers from "../_providers";
import "../globals.css";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import SidebarToggle from "@/components/sidebar-toggle";
import { FloatingDock } from "@/components/floating-dock";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/DarkModeToggle";
import { draftMode } from "next/headers";
import { DisableDraftMode } from "@/components/DisableDraftMode";
import { VisualEditing } from "next-sanity/visual-editing"
import { GoogleAnalytics } from '@next/third-parties/google'

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit", // optional CSS variable
  display: "swap",          // recommended for performance
});


export const metadata: Metadata = {
  title: "Jeremy Okello",
  description: "Jeremy Okello's Portfolio",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${outfit.className} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SidebarProvider>
              <SidebarInset>
                {children}
              </SidebarInset>
              <AppSidebar side="right" variant="floating" />
              <FloatingDock />
              <SidebarToggle />
              <div className="fixed md:bottom-6 md:right-24 top-4 right-18 md:top-auto md:left-auto z-0">
                <div className="w-10 h-10 md:w-12 md:h-12">
                  <ModeToggle />
                </div>
              </div>
            </SidebarProvider>
            <SanityLive />
            {
              (await draftMode()).isEnabled && (
                <>
                  <VisualEditing />
                  <DisableDraftMode />
                </>
              )
            }
          </ThemeProvider>
        </body>
        <GoogleAnalytics gaId="G-7VZM26LEHH" />
      </html>
    </Providers>
  );
}
