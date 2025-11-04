
"use server";
/**
 * @fileOverview Ollama implementation for summarizing a key event.
 */

import { z } from 'zod';
import type { MemorizeEventInput, MemorizeEventOutput } from './summarize-history-schemas';
import { MemorizeEventOutputSchema } from './summarize-history-schemas';

const OLLAMA_API_URL = "http://localhost:11434/api/generate";

function buildOllamaPrompt(input: MemorizeEventInput): string {
    return `You are an archivist for a game. Summarize the most important event from the text below in ONE concise sentence, in the language '${input.currentLanguage}'.
Identify the main characters involved from this list: ${input.involvedCharacters.join(', ')}.
Respond with ONLY a valid JSON object matching this schema: { "memory": "The summary...", "involvedCharacterNames": ["Name1", "Name2"] }.

Context to summarize:
"${input.narrativeContext}"`;
}

export async function memorizeEventWithLocalLlm(input: MemorizeEventInput): Promise<MemorizeEventOutput> {
    if (!input.aiConfig?.llm.local?.model) {
        throw new Error("Nom du modèle Ollama manquant.");
    }
    
    const prompt = buildOllamaPrompt(input);

    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: input.aiConfig.llm.local.model,
                prompt: prompt,
                format: 'json',
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(`Erreur du serveur Ollama: ${response.status} ${await response.text()}`);
        }
        
        const data = await response.json();
        let content = data.response.replace(/^```json\n?/, '').replace(/```$/, '');
        const parsedJson = JSON.parse(content);
        
        const validationResult = MemorizeEventOutputSchema.safeParse(parsedJson);

        if (!validationResult.success) {
            throw new Error(`La réponse d'Ollama ne respecte pas le format attendu: ${validationResult.error.message}`);
        }
        
        return validationResult.data;

    } catch (error) {
        console.error("Error in memorizeEventWithLocalLlm:", error);
        throw new Error(`Erreur lors de la mémorisation avec Ollama: ${error instanceof Error ? error.message : String(error)}`);
    }
}
