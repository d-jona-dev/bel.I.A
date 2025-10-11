
"use server";
/**
 * @fileOverview OpenRouter implementation for materializing a character.
 */

import { z } from 'zod';
import type { MaterializeCharacterInput, MaterializeCharacterOutput } from './materialize-character';
import { NewCharacterSchema } from '@/types';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function buildOpenRouterMessages(input: MaterializeCharacterInput): any[] {
    const systemPrompt = `You are a character creation assistant for a text-based adventure game.
Your task is to identify a NEW character mentioned in the narrative context and create a full character sheet for them in JSON format.

CRITICAL RULES:
- You MUST respond with a valid JSON object. Do not add any text outside the JSON object.
- Do NOT create characters from abstract concepts, inanimate objects, or natural elements (e.g., "the wind", "the sun", "a door", "a table"). Only create living beings who are actual characters.
- Do not create any character from this list of already existing characters: ${input.existingCharacters.join(', ')}.
- If no new, unlisted character is mentioned in the user's context, you MUST return an empty JSON object {}.

The JSON object MUST match this Zod schema shape:
${JSON.stringify(NewCharacterSchema.shape, null, 2)}

Generate the character sheet in the language '${input.currentLanguage}'.`;

    const userPrompt = `Here is the narrative context where a character might be mentioned:\n\n"${input.narrativeContext}"`;
    
    return [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];
}

export async function materializeCharacterWithOpenRouter(input: MaterializeCharacterInput): Promise<MaterializeCharacterOutput> {
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
            const errorBody = await response.text();
            throw new Error(`Erreur de l'API OpenRouter: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content || content.trim() === '{}') {
             throw new Error("L'IA n'a identifié aucun nouveau personnage à créer.");
        }
        
        const parsedJson = JSON.parse(content);
        
        if (!parsedJson.name) {
             throw new Error("L'IA n'a pas réussi à identifier de nouveau personnage valide.");
        }

        const validationResult = NewCharacterSchema.safeParse(parsedJson);

        if (!validationResult.success) {
            console.error("Zod validation failed (OpenRouter):", validationResult.error.errors);
            throw new Error(`La réponse d'OpenRouter ne respecte pas le format attendu: ${validationResult.error.message}`);
        }
        
        const isExisting = input.existingCharacters.some(
            (name) => name.toLowerCase() === validationResult.data.name.toLowerCase()
        );
        if (isExisting) {
            throw new Error(`Le personnage "${validationResult.data.name}" existe déjà.`);
        }

        return validationResult.data;

    } catch (error) {
        console.error("Error in materializeCharacterWithOpenRouter:", error);
        throw new Error(`Erreur lors de la création du personnage avec OpenRouter: ${error instanceof Error ? error.message : String(error)}`);
    }
}
