import { createTool } from "@inngest/agent-kit";
import z from "zod";
import { guardRailsSchema, saveFilterResultSchema } from "./schemas";

export const saveFilterResult = createTool({
    name: "save_filter_result",
    description: "Store the topic filter output in the network state",
    parameters: saveFilterResultSchema,
    handler: async ({ isAppropriate }, { network }) => {
        network.state.kv.set("isAppropriate", isAppropriate);
        return { data: "saved" }
    }
})

export const guardrailsCheck = createTool({
    name: "guardrails_check",
    description:
        "Evaluates input for PII (excluding name/phone/email), jailbreak, safety issues, prompt injection, and hallucination risk.",
    parameters: guardRailsSchema,

    handler: async ({ userMessage }, { network }) => {
        // Basic heuristics or model logic could be implemented here.
        // If using an LLM, the guardrails agent can emit pass/fail via a tool call.

        // Placeholder rule (you can replace with a real model or structured checks)
        const lower = userMessage.toLowerCase();
        const failTokens = ["kill", "die", "self-harm", "violence", "hate", "bomb"];

        const hasFail = failTokens.some((token) => lower.includes(token));

        // Example: if we detect unsafe content → fail
        const result = hasFail ? "fail" : "pass";
        network.state.kv.set("guardrailsResult", result);

        return { data: "saved" };
    },
})