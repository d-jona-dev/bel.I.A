"use server";
/**
 * @fileOverview Local LLM-specific implementation for the creative assistant AI flow.
 * This file formats the prompt as a single text string for a local llama.cpp server.
 */

import { z } from 'zod';
import { 
    CreativeAssistantInputSchema, 
    CreativeAssistantOutputSchema, 
    type CreativeAssistantInput, 
    type CreativeAssistantOutput 
} from './creative-assistant-schemas';

const LOCAL_LLM_API_URL = "http://localhost:9000/api/local-llm/generate";

function buildLocalLLMPrompt(input: CreativeAssistantInput): string {
     const systemPrompt = `You are a creative assistant for a text-based adventure game creator. Your goal is to help the user brainstorm ideas for their world, story, and characters.
    - Be concise, creative, and inspiring.
    - When you provide a concrete idea for the world, initial situation, or a character, formalize it as a 'suggestion' in the output JSON.
    - You can provide multiple suggestions in one response.
    - For character suggestions, provide one for 'characterName' and another for 'characterDetails'.
    - You MUST respond with a valid JSON object matching this schema:
    {
        "response": "string (your conversational response)",
        "suggestions": [ { "field": "world" | "initialSituation" | "characterName" | "characterDetails", "value": "string" } ]
    }
    - Do not add any text outside the JSON object.
    - Respond in the same language as the user's request.`;

    const history = (input.history || []).map(msg => `${msg.role === 'user' ? 'USER' : 'ASSISTANT'}: ${msg.content}`).join('\n\n');

    return `USER: ${systemPrompt}\n\n${history}\n\n${input.userRequest}\nASSISTANT:`;
}


export async function creativeAssistantWithLocalLlm(input: CreativeAssistantInput): Promise<CreativeAssistantOutput> {
    const localConfig = input.aiConfig?.llm.local;

    if (!localConfig?.model) {
        return { error: "Local LLM model name is missing.", response: "" };
    }

    const prompt = buildLocalLLMPrompt(input);

    try {
        const response = await fetch(LOCAL_LLM_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: localConfig.model,
                prompt: prompt,
                // The local server doesn't support json_schema in the same way, but we can try passing it.
                // The main prompt injection is more reliable for local models.
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Local LLM Server Error: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        let content = data.content;

        if (!content) {
            throw new Error("Invalid response format from Local LLM server.");
        }
        
        // Clean up potential markdown blocks if the model adds them
        content = content.replace(/^```json\n?/, '').replace(/```$/, '');

        const parsedJson = JSON.parse(content);
        const validationResult = CreativeAssistantOutputSchema.safeParse(parsedJson);

        if (!validationResult.success) {
            console.error("Zod validation failed (Local LLM):", validationResult.error.errors);
            return {
                response: parsedJson.response || "L'IA locale a retourné une réponse malformée.",
                suggestions: [],
                error: `Zod validation failed: ${validationResult.error.message}`
            };
        }

        return { ...validationResult.data, error: undefined };

    } catch (e: any) {
        console.error("Error in creativeAssistantWithLocalLlm flow:", e);
        return { error: `An unexpected error occurred with the Local LLM: ${e.message}`, response: "" };
    }
}
