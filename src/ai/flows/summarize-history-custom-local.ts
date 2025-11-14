"use server";
/**
 * @fileOverview Custom local LLM implementation for summarizing a key event.
 */

import { z } from 'zod';
import type { MemorizeEventInput, MemorizeEventOutput } from './summarize-history-schemas';
import { MemorizeEventOutputSchema } from './summarize-history-schemas';

const buildPrompt = (input: MemorizeEventInput): any[] => {
    const systemPrompt = `You are an archivist for a game. Summarize the most important event from the text below in ONE concise sentence, in the language '${input.currentLanguage}'.
Identify the main characters involved from this list: ${input.involvedCharacters.join(', ')}.
You MUST respond with ONLY a valid JSON object matching this schema: { "memory": "The summary...", "involvedCharacterNames": ["Name1", "Name2"] }.`;

    const userPrompt = `Context to summarize:\n"${input.narrativeContext}"`;
    
    return [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];
}

export async function memorizeEventWithCustomLocalLlm(input: MemorizeEventInput): Promise<MemorizeEventOutput> {
    const customConfig = input.aiConfig?.llm.customLocal;

    if (!customConfig?.apiUrl) {
        throw new Error("L'URL de l'API locale personnalisée est manquante.");
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
            }),
        });

        if (!response.ok) {
            throw new Error(`Erreur de l'API locale: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("La réponse de l'API locale ne contenait pas de contenu valide.");
        }
        
        content = content.replace(/^```json\n?/, '').replace(/```$/, '');
        const parsedJson = JSON.parse(content);
        
        const validationResult = MemorizeEventOutputSchema.safeParse(parsedJson);

        if (!validationResult.success) {
            throw new Error(`La réponse de l'API locale ne respecte pas le format attendu: ${validationResult.error.message}`);
        }
        
        return validationResult.data;

    } catch (error) {
        console.error("Error in memorizeEventWithCustomLocalLlm:", error);
        throw new Error(`Erreur lors de la mémorisation avec l'API locale: ${error instanceof Error ? error.message : String(error)}`);
    }
}
