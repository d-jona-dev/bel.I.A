
"use server";
/**
 * @fileOverview OpenRouter-specific implementation for the creative assistant AI flow.
 * This file formats the prompt as a single text string suitable for many OpenRouter models.
 */

import { z } from 'zod';
import { 
    CreativeAssistantInputSchema, 
    CreativeAssistantOutputSchema, 
    type CreativeAssistantInput, 
    type CreativeAssistantOutput 
} from './creative-assistant-schemas';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function buildOpenRouterMessages(input: CreativeAssistantInput): Array<{role: 'system' | 'user' | 'assistant', content: string}> {
    const systemPrompt = `You are a creative assistant for a text-based adventure game creator. Your goal is to help the user brainstorm ideas for their world, story, and characters.
    - Be concise, creative, and inspiring.
    - When you provide a concrete idea for the world, initial situation, or a character, formalize it as a 'suggestion' in the output JSON.
    - You can also suggest toggling game modes (rpgMode, relationsMode, strategyMode, comicModeActive) by setting their boolean value in a suggestion if it makes sense for the user's request.
    - You can provide multiple suggestions in one response.
    - For character suggestions, provide one for 'characterName' and another for 'characterDetails'.
    - You MUST respond with a valid JSON object matching this schema:
    {
        "response": "string (your conversational response)",
        "suggestions": [ { "field": "world" | "initialSituation" | "characterName" | "characterDetails" | "rpgMode" | "relationsMode" | "strategyMode" | "comicModeActive", "value": "string" | boolean } ]
    }
    - Respond in the same language as the user's request.`;
    
    const history = (input.history || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));

    const allMessages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: 'user', content: input.userRequest }
    ];

    // Filter out any potential empty messages, just in case
    return allMessages.filter(msg => msg.content);
}

export async function creativeAssistantWithOpenRouter(input: CreativeAssistantInput): Promise<CreativeAssistantOutput> {
    const openRouterConfig = input.aiConfig?.llm.openRouter;

    if (!openRouterConfig?.apiKey || !openRouterConfig.model) {
        return { error: "OpenRouter API key or model name is missing.", response: "" };
    }

    const messages = buildOpenRouterMessages(input);

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterConfig.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: openRouterConfig.model,
                messages: messages,
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`OpenRouter API Error: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
            throw new Error("Invalid response format from OpenRouter.");
        }

        let parsedJson = JSON.parse(content);
        
        // FIX: Handle cases where the model returns an array of suggestions directly
        if (Array.isArray(parsedJson)) {
            parsedJson = {
                response: "Voici quelques suggestions :",
                suggestions: parsedJson,
            };
        }


        const validationResult = CreativeAssistantOutputSchema.safeParse(parsedJson);

        if (!validationResult.success) {
            console.error("Zod validation failed (OpenRouter):", validationResult.error.errors);
            // Attempt to return at least the response text if parsing fails
            return {
                response: parsedJson.response || "L'IA a retourné une réponse malformée.",
                suggestions: parsedJson.suggestions || [],
                error: `Zod validation failed: ${validationResult.error.message}`
            };
        }

        return { ...validationResult.data, error: undefined };

    } catch (e: any) {
        console.error("Error in creativeAssistantWithOpenRouter flow:", e);
        return { error: `An unexpected error occurred with OpenRouter: ${e.message}`, response: "" };
    }
}
