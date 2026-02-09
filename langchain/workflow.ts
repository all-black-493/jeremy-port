import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { aiTwinAgent, guardrailsAgent, safetyFailAgent, topic_filter_agent, topic_moderator_agent } from "./agents";
import { RouterState } from "./state-schemas";

async function addUserMessageNode(state: typeof RouterState.State) {
    return {
        // messages: [
        //     ...state.messages,
        //     new HumanMessage({ content: state.query })
        // ],
    };
}


async function topicFilterNode(state: typeof RouterState.State) {
    const result = await topic_filter_agent.invoke({
        messages: state.messages,
    });

    return {
        isRelevant: result.structuredResponse.isRelevant,
    };
}

async function topicModeratorNode(state: typeof RouterState.State) {
    const result = await topic_moderator_agent.invoke({
        messages: state.messages,
    });

    const final = result.messages.at(-1)?.content;

    return {
        messages: result.messages,
        finalAnswer: final,
    };
}


async function guardrailsNode(state: typeof RouterState.State) {
    const result = await guardrailsAgent.invoke({
        messages: state.messages,
    });

    return {
        guardrailsPassed: result.structuredResponse.guardrailsPassed,
    };
}


async function aiTwinNode(state: typeof RouterState.State) {
    const result = await aiTwinAgent.invoke({
        messages: state.messages,
    });

    const finalAIMessage = result.messages.findLast(
        (m) => m.type === "ai"
    );

    // const final = result.messages.at(-1)?.content;

    return {
        messages: [finalAIMessage],
        finalAnswer: finalAIMessage?.content,
    };
}

async function safetyFailNode(state: typeof RouterState.State) {
    const result = await safetyFailAgent.invoke({
        messages: state.messages,
    });

    const final = result.messages.at(-1)?.content;

    return {
        messages: result.messages,
        finalAnswer: final,
    };
}

function routeAfterTopic(state: typeof RouterState.State) {
    return state.isRelevant ? "guardrails" : "topic_moderator";
}

function routeAfterGuardrails(state: typeof RouterState.State) {
    return state.guardrailsPassed ? "ai_twin" : "safety_fail";
}


export const workflow = new StateGraph(RouterState)

    // Nodes
    .addNode("add_user_message", addUserMessageNode)
    .addNode("topic_filter", topicFilterNode)
    .addNode("guardrails", guardrailsNode)
    .addNode("ai_twin", aiTwinNode)
    .addNode("safety_fail", safetyFailNode)
    .addNode("topic_moderator", topicModeratorNode)

    // Flow
    .addEdge(START, "add_user_message")
    .addEdge("add_user_message", "topic_filter")

    .addConditionalEdges("topic_filter", routeAfterTopic, [
        "guardrails",
        "topic_moderator",
    ])

    .addConditionalEdges("guardrails", routeAfterGuardrails, [
        "ai_twin",
        "safety_fail",
    ])

    // End
    .addEdge("ai_twin", END)
    .addEdge("safety_fail", END)
    .addEdge("topic_moderator", END)

    .compile({
        checkpointer: new MemorySaver(),
    });




// const result = await workflow.invoke({
//     query: "How do I authenticate API requests?"
// });

// console.log("Original query:", result.query);
// console.log("\nClassifications:");
// for (const c of result.classifications) {
//     console.log(`  ${c.source}: ${c.query}`);
// }
// console.log("\n" + "=".repeat(60) + "\n");
// console.log("Final Answer:");
// console.log(result.finalAnswer);