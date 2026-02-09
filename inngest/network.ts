import { createNetwork } from "@inngest/agent-kit";
import { gemini } from "@inngest/agent-kit";
import {
    topic_filter_agent,
    topic_moderator_agent,
    guardrails_agent,
    sanity_mcp_agent,
    safety_fail_agent
} from "./agents";

export const agentNetwork = createNetwork({
    name: "ai-twin-team",
    agents: [
        topic_filter_agent,
        topic_moderator_agent,
        guardrails_agent,
        sanity_mcp_agent,
        safety_fail_agent
    ],
    defaultModel: gemini({ model: "gemini-2.5-flash" }),
    maxIter: 10,

    router: ({ network, callCount, lastResult }) => {
        const isAppropriate = network.state.kv.get("isAppropriate");
        const guardResult = network.state.kv.get("guardrailsResult");

        if (callCount === 0 || isAppropriate === undefined) {
            return topic_filter_agent;
        }

        if (isAppropriate === undefined) {
            return topic_filter_agent;
        }

        if (isAppropriate === false) {
            return topic_moderator_agent;
        }

        if (guardResult === undefined) {
            return guardrails_agent;
        }

        if (guardResult === "pass") {
            return sanity_mcp_agent;
        }

        if (guardResult === "fail") {
            return safety_fail_agent;
        }

        // Only now is it safe to stop
        return undefined;
    }

})