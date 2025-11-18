
"use server";
/**
 * @fileOverview Custom local LLM implementation for the creative assistant AI flow.
 */

import { z } from 'zod';
import { 
    CreativeAssistantInputSchema, 
    CreativeAssistantOutputSchema, 
    type CreativeAssistantInput, 
    type CreativeAssistantOutput 
} from './creative-assistant-schemas';

function buildPrompt(input: CreativeAssistantInput): any[] {
    const systemPrompt = `You are a creative assistant for a text-based adventure game creator. The game focuses ONLY on relationship mode. Do not suggest RPG or strategy elements. Your goal is to help the user brainstorm ideas for their world, story, and characters.
- You MUST respond with a valid JSON object. Do not add any text outside the JSON object.
- Respond in the same language as the user's request.

The JSON object MUST match this schema:
{
    "response": "string (your conversational response)",
    "suggestions": [ 
        { 
          "field": "world" | "initialSituation" | "characterName" | "characterDetails" | "characterPlaceholder" | "comicModeActive" | "timeManagement.enabled", 
          "value": "string" | "boolean" | "object" 
        } 
    ]
}

CRITICAL RULES FOR THE 'value' in suggestions:
- For "world" and "initialSituation", the value MUST be a JSON object with language codes as keys. Example: { "fr": "Un monde de...", "en": "A world of..." }.
- For "characterName", "characterDetails", and "characterPlaceholder", the value MUST be a string.
- For "comicModeActive" and "timeManagement.enabled", the value MUST be a boolean (true or false).`;
    
    const history = (input.history || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));

    return [
        { role: "system", content: systemPrompt },
        ...history,
        { role: 'user', content: input.userRequest }
    ];
}

export async function creativeAssistantWithCustomLocalLlm(input: CreativeAssistantInput): Promise<CreativeAssistantOutput> {
    const customConfig = input.aiConfig?.llm.customLocal;

    if (!customConfig?.apiUrl) {
        return { error: "L'URL de l'API locale personnalisée est manquante.", response: "" };
    }

    const messages = buildPrompt(input);

    try {
        let apiUrl = customConfig.apiUrl.trim();
        if (!apiUrl.includes('/chat/completions')) {
            apiUrl = apiUrl.replace(/\/+$/, '') + '/v1/chat/completions';
        }

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(customConfig.apiKey && { "Authorization": `Bearer ${customConfig.apiKey}` })
            },
            body: JSON.stringify({
                model: customConfig.model || 'default',
                messages: messages,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erreur de l'API locale: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("La réponse de l'API locale ne contenait pas de contenu valide.");
        }
        
        content = content.replace(/^```json\n?/, '').replace(/```$/, '');
        const parsedJson = JSON.parse(content);

        const validationResult = CreativeAssistantOutputSchema.safeParse(parsedJson);

        if (!validationResult.success) {
            console.error("Zod validation failed (Custom Local):", validationResult.error.errors);
            return {
                response: parsedJson.response || "L'IA locale a retourné une réponse malformée.",
                suggestions: parsedJson.suggestions || [],
                error: `Zod validation failed: ${validationResult.error.message}`
            };
        }

        return { ...validationResult.data, error: undefined };

    } catch (e: any) {
        console.error("Error in creativeAssistantWithCustomLocalLlm flow:", e);
        return { error: `An unexpected error occurred with the custom local model: ${e.message}`, response: "" };
    }
}
