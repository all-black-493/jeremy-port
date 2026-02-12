import { ChatGoogleGenerativeAIEx } from '@h1deya/langchain-google-genai-ex';
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

export const llm_instance = new ChatGoogleGenerativeAIEx({
    model: "gemini-2.5-pro",
    temperature: 0,
    maxRetries: 2,
    apiKey: process.env.GOOGLE_API_KEY!,
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
    ],
    streaming: true
})

