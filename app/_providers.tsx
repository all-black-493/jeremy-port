import { ClerkProvider } from "@clerk/nextjs"
import React from 'react'

type Props = {
    children: React.ReactNode
}

function Providers(
    { children }: Props
) {
    return (
        <ClerkProvider>
            {children}
        </ClerkProvider>
    )
}

export default Providers
