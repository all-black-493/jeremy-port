import { StateSchema, MessagesValue, Annotation, MessagesZodState } from "@langchain/langgraph";
import { z } from "zod/v4"

export const AgentOutput = z.object({
    source: z.string(),
    result: z.string(),
});

export const RouterState = new StateSchema({
    messages: MessagesValue,
    query: z.string(),

    isRelevant: z.boolean(),

    guardrailsPassed: z.boolean(),

    finalAnswer: z.string(),
});

export type AgentInput = {
    query: string
}

export const TopicFilterSchema = z.object({
    isRelevant: z.boolean(),
});

export const GuardrailsSchema = z.object({
    guardrailsPassed: z.boolean(),
});


