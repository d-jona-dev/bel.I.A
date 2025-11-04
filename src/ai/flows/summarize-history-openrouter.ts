
"use server";
/**
 * @fileOverview OpenRouter implementation for summarizing a key event.
 */

import { z } from 'zod';
import type { MemorizeEventInput, MemorizeEventOutput } from './summarize-history';
import { MemorizeEventOutputSchema } from './summarize-history';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function buildOpenRouterMessages(input: MemorizeEventInput): any[] {
    const systemPrompt = `You are an archivist for a game. Summarize the most important event from the text below in ONE concise sentence, in the language '${input.currentLanguage}'.
Identify the main characters involved from this list: ${input.involvedCharacters.join(', ')}.
You MUST respond with a valid JSON object matching this schema: { "memory": "The summary...", "involvedCharacterNames": ["Name1", "Name2"] }.
Do not add any text outside the JSON object.`;

    const userPrompt = `Context to summarize:\n"${input.narrativeContext}"`;
    
    return [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];
}

export async function memorizeEventWithOpenRouter(input: MemorizeEventInput): Promise<MemorizeEventOutput> {
    const openRouterConfig = input.aiConfig?.llm.openRouter;

    if (!openRouterConfig?.apiKey || !openRouterConfig.model) {
        throw new Error("Clé API OpenRouter ou nom du modèle manquant.");
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
            throw new Error(`Erreur de l'API OpenRouter: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const parsedJson = JSON.parse(content);
        
        const validationResult = MemorizeEventOutputSchema.safeParse(parsedJson);

        if (!validationResult.success) {
            throw new Error(`La réponse d'OpenRouter ne respecte pas le format attendu: ${validationResult.error.message}`);
        }

        return validationResult.data;

    } catch (error) {
        console.error("Error in memorizeEventWithOpenRouter:", error);
        throw new Error(`Erreur lors de la mémorisation avec OpenRouter: ${error instanceof Error ? error.message : String(error)}`);
    }
}
