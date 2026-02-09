import { llm_instance } from "@/langchain-client";
import { guardrail_agent_prompt } from "@/prompts/guard_rail_agent";
import { safety_fail_agent_prompt } from "@/prompts/safety_fail_agent";
import { sanity_mcp_prompt } from "@/prompts/sanity-mcp-prompt";
import { topic_filter_prompt } from "@/prompts/topic-filter-prompt";
import { topic_moderator_prompt } from "@/prompts/topic-moderator-prompt";
import { MemorySaver } from "@langchain/langgraph";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent, } from "langchain";
import { GuardrailsSchema, TopicFilterSchema } from "./state-schemas";
// import { searchKnowledgeBase } from "./tools";

const client = new MultiServerMCPClient({
    sanity: {
        transport: "http",
        url: "https://mcp.sanity.io",
        headers: {
            Authorization: `Bearer ${process.env.SANITY_MCP_AUTH_TOKEN}`
        },
    }
})

const sanity_tools = await client.getTools()

export const topic_filter_agent = createAgent({
    model: llm_instance,
    systemPrompt: topic_filter_prompt.trim(),
    responseFormat: TopicFilterSchema
})

export const topic_moderator_agent = createAgent({
    model: llm_instance,
    systemPrompt: topic_moderator_prompt,
})

export const guardrailsAgent = createAgent({
    model: llm_instance,
    systemPrompt: guardrail_agent_prompt.trim(),
    responseFormat: GuardrailsSchema,

});

export const aiTwinAgent = createAgent({
    model: llm_instance,
    systemPrompt: sanity_mcp_prompt.trim(),
    tools: sanity_tools
});

export const safetyFailAgent = createAgent({
    model: llm_instance,
    systemPrompt: safety_fail_agent_prompt.trim(),
});



// export const conversationalAgent = createAgent({
//     model: llm_instance,
//     tools: [searchKnowledgeBase],
//     systemPrompt: `
//         You are a conversational orchestrator for a multi-agent AI system.

//         CRITICAL RULES:
//         - You MUST ALWAYS use the "search_knowledge_base" tool.
//         - NEVER answer using your own knowledge.
//         - NEVER skip the tool call.
//         - NEVER produce a final answer without calling the tool.
//         - The tool performs reasoning, guardrails, safety, and response generation.

//         Behavior:
//         1. For EVERY user message, call "search_knowledge_base".
//         2. Pass the FULL user query unchanged.
//         3. Wait for the tool result.
//         4. Return the tool result as the final response.  `
//         .trim(),
//     checkpointer: new MemorySaver(),
    
// });