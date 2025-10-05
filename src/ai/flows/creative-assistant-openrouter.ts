
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
- You MUST respond with a valid JSON object. Do not add any text outside the JSON object.
- Respond in the same language as the user's request.

The JSON object MUST match this schema:
{
    "response": "string (your conversational response)",
    "suggestions": [ 
        { 
          "field": "world" | "initialSituation" | "characterName" | "characterDetails" | "rpgMode" | "relationsMode" | "strategyMode" | "comicModeActive", 
          "value": "string" | "boolean" | "object" 
        } 
    ]
}

CRITICAL RULES FOR THE 'value' in suggestions:
- For "world" and "initialSituation", the value MUST be a JSON object with language codes as keys. Example: { "fr": "Un monde de...", "en": "A world of..." }.
- For "characterName" and "characterDetails", the value MUST be a string.
- For "rpgMode", "relationsMode", etc., the value MUST be a boolean (true or false).`;
    
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
        
        if (Array.isArray(parsedJson)) {
            parsedJson = {
                response: "Voici quelques suggestions :",
                suggestions: parsedJson,
            };
        }

        if (!parsedJson.response && parsedJson.suggestions && parsedJson.suggestions.length > 0) {
            parsedJson.response = "Voici quelques suggestions basées sur votre demande :";
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
