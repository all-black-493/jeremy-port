// functions.ts
import { inngest } from "./client";
import { agentNetwork } from "./network";

export const aiTwin = inngest.createFunction(
    { id: "AI-Twin" },
    { event: "chat/message.input" },
    async ({ event, step }) => {

        if (!agentNetwork || typeof agentNetwork.run !== 'function') {
            console.error("agentNetwork is not properly initialized:", agentNetwork);
            throw new Error("Agent network not available");
        }

        const input = event.data.input
        console.log("[INPUT ]:", input)

        let result

        try {
            result = await agentNetwork.run(input)
        } catch (error) {
            console.log("[ERROR: ]", error)
        }

        return {
            success: true,
            output: result
        }
    }
)