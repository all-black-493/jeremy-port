"use server"

import { auth } from "@clerk/nextjs/server"

export async function createSession() {
    const { userId, isAuthenticated } = await auth()

    if (!isAuthenticated || !userId) {
        throw new Error("You must be signed in to chat with my AI Twin.");
    }

    return { userId, isAuthenticated };
}