
"use server";
/**
 * @fileOverview Ollama implementation for materializing a character.
 */

import { z } from 'zod';
import type { MaterializeCharacterInput, MaterializeCharacterOutput } from './materialize-character';
import { NewCharacterSchema } from '@/types';

const OLLAMA_API_URL = "http://localhost:11434/api/generate";

function buildOllamaPrompt(input: MaterializeCharacterInput): string {
    const systemPrompt = `You are a character creation assistant for a text-based adventure game.
Your task is to identify a NEW character mentioned in the narrative context and create a full character sheet for them in JSON format.

CRITICAL RULES:
- You MUST respond with a valid JSON object that matches the provided schema. Do not add any text outside the JSON object.
- Do NOT create characters from abstract concepts, inanimate objects, or natural elements (e.g., "the wind", "the sun", "a door", "a table"). Only create living beings who are actual characters.
- Do not create any character from this list of already existing characters: ${input.existingCharacters.join(', ')}.
- If no new, unlisted character is mentioned in the user's context, you MUST return an empty JSON object {}.

Here is the narrative context where a character might be mentioned:
"${input.narrativeContext}"

Generate the character sheet in the language '${input.currentLanguage}'.
The JSON schema you must adhere to is:
${JSON.stringify(NewCharacterSchema.shape, null, 2)}
`;

    return systemPrompt;
}

export async function materializeCharacterWithLocalLlm(input: MaterializeCharacterInput): Promise<MaterializeCharacterOutput> {
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
            const errorBody = await response.text();
            throw new Error(`Erreur du serveur Ollama: ${response.status} ${errorBody}`);
        }
        
        const data = await response.json();
        let content = data.response;
        
        if (!content || content.trim() === '{}') {
             throw new Error("L'IA n'a identifié aucun nouveau personnage à créer.");
        }

        content = content.replace(/^```json\n?/, '').replace(/```$/, '');
        const parsedJson = JSON.parse(content);
        
        if (!parsedJson.name) {
             throw new Error("L'IA n'a pas réussi à identifier de nouveau personnage valide.");
        }

        const validationResult = NewCharacterSchema.safeParse(parsedJson);

        if (!validationResult.success) {
            console.error("Zod validation failed (Ollama):", validationResult.error.errors);
            throw new Error(`La réponse d'Ollama ne respecte pas le format attendu: ${validationResult.error.message}`);
        }
        
        const isExisting = input.existingCharacters.some(
            (name) => name.toLowerCase() === validationResult.data.name.toLowerCase()
        );
        if (isExisting) {
            throw new Error(`Le personnage "${validationResult.data.name}" existe déjà.`);
        }

        return validationResult.data;

    } catch (error) {
        console.error("Error in materializeCharacterWithLocalLlm:", error);
        throw new Error(`Erreur lors de la création du personnage avec Ollama: ${error instanceof Error ? error.message : String(error)}`);
    }
}
