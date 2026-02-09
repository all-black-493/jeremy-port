import { NextResponse } from "next/server";
import { workflow } from "@/langchain/workflow";
import { HumanMessage } from "@langchain/core/messages";

export async function POST(request: Request) {
    const { text, threadId } = await request.json();

    try {
        const stream = await workflow.stream(
            {
                query: text,
                messages: [new HumanMessage(text)],
            },
            {
                configurable: {
                    thread_id: threadId,
                },
                streamMode: "messages",
            }
        );

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
            },
        });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message });
    }
}
