import { SanityLive } from "@/sanity/lib/live";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Providers from "../_providers";
import "../globals.css";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import SidebarToggle from "@/components/sidebar-toggle";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit", // optional CSS variable
  display: "swap",          // recommended for performance
});


export const metadata: Metadata = {
  title: "Jeremy Okello",
  description: "Jeremy Okello's Portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <html lang="en">
        <body
          className={`${outfit.className} antialiased`}
        >
          <SidebarProvider>
            <SidebarInset>
              {children}
            </SidebarInset>
            <AppSidebar side="right" variant="floating" />
            <SidebarToggle />
          </SidebarProvider>
          <SanityLive />
        </body>
      </html>
    </Providers>
  );
}
