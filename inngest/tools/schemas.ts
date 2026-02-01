import z from "zod";

export const guardRailsSchema = z.object({
    userMessage: z.string(),
})

export const saveFilterResultSchema = z.object({
    isAppropriate: z.boolean(),
})