
"use server";
/**
 * @fileOverview Ollama-specific implementation for the creative assistant AI flow.
 */

import { z } from 'zod';
import { 
    CreativeAssistantInputSchema, 
    CreativeAssistantOutputSchema, 
    type CreativeAssistantInput, 
    type CreativeAssistantOutput 
} from './creative-assistant-schemas';

const OLLAMA_API_URL = "http://localhost:11434/api/generate";

function buildOllamaMessages(input: CreativeAssistantInput): any[] {
     const systemPrompt = `You are a creative assistant for a text-based adventure game creator. The game focuses ONLY on relationship mode. Do not suggest RPG or strategy elements. Your goal is to help the user brainstorm ideas for their world, story, and characters.
    - Be concise, creative, and inspiring.
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
        role: msg.role,
        content: msg.content
    }));

    return [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: input.userRequest }
    ];
}

export async function creativeAssistantWithLocalLlm(input: CreativeAssistantInput): Promise<CreativeAssistantOutput> {
    const localConfig = input.aiConfig?.llm.local;

    if (!localConfig?.model) {
        return { error: "Ollama model name is missing.", response: "" };
    }
    
    const messages = buildOllamaMessages(input);
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: localConfig.model,
                prompt: prompt,
                format: "json",
                stream: false,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Ollama API Error: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        let content = data.response;

        if (!content) {
            throw new Error("Invalid response format from Ollama server.");
        }
        
        content = content.replace(/^```json\n?/, '').replace(/```$/, '');

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
            console.error("Zod validation failed (Ollama):", validationResult.error.errors);
            return {
                response: parsedJson.response || "L'IA locale a retourné une réponse malformée.",
                suggestions: parsedJson.suggestions || [],
                error: `Zod validation failed: ${validationResult.error.message}`
            };
        }

        return { ...validationResult.data, error: undefined };

    } catch (e: any) {
        console.error("Error in creativeAssistantWithLocalLlm (Ollama) flow:", e);
        return { error: `An unexpected error occurred with Ollama: ${e.message}`, response: "" };
    }
}
