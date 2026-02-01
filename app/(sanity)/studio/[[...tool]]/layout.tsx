import { ReactNode } from 'react'
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Jeremy's Portfolio Studio",
    description: "Jeremy's Portfolio Studio",
}

function Layout({ children }: { children: ReactNode }) {
    return (
        <html>
            <body>
                {children}
            </body>
        </html>
    )
}

export default Layout
