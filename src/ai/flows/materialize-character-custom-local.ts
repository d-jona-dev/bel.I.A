
"use server";
/**
 * @fileOverview Custom local LLM implementation for materializing a character.
 */

import { z } from 'zod';
import type { MaterializeCharacterInput, MaterializeCharacterOutput } from './materialize-character';
import { NewCharacterSchema } from '@/types';

function buildPrompt(input: MaterializeCharacterInput): any[] {
    const systemPrompt = `You are a character creation assistant for a text-based adventure game.
Your task is to identify a NEW character mentioned in the narrative context and create a full character sheet for them in JSON format.

CRITICAL RULES:
- You MUST respond with a valid JSON object. Do not add any text outside the JSON object.
- Do NOT create characters from abstract concepts or inanimate objects. Only create living beings.
- Do not create any character from this list of already existing characters: ${input.existingCharacters.join(', ')}.
- If no new, unlisted character is mentioned, you MUST return an empty JSON object {}.

The JSON schema you must adhere to is:
${JSON.stringify(NewCharacterSchema.shape, null, 2)}

VERY IMPORTANT: The 'details' and 'biographyNotes' fields MUST be simple strings, NOT JSON objects. For example: "details": "A grumpy old man".

Generate the character sheet in the language '${input.currentLanguage}'.`;

    const userPrompt = `Here is the narrative context where a character might be mentioned:\n\n"${input.narrativeContext}"`;
    
    return [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];
}

export async function materializeCharacterWithCustomLocalLlm(input: MaterializeCharacterInput): Promise<MaterializeCharacterOutput> {
    const customConfig = input.aiConfig?.llm.customLocal;

    if (!customConfig?.apiUrl) {
        throw new Error("L'URL de l'API locale personnalisée est manquante.");
    }
    
    const messages = buildPrompt(input);

    try {
        let apiUrl = customConfig.apiUrl.trim();
        if (!apiUrl.includes('/chat/completions')) {
             apiUrl = apiUrl.replace(/\/+$/, '');
            if (!apiUrl.endsWith('/v1')) {
                apiUrl += '/v1';
            }
            apiUrl += '/chat/completions';
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
                temperature: 0.5,
            }),
        });

        if (!response.ok) {
            throw new Error(`Erreur de l'API locale: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content;

        if (!content || content.trim() === '{}') {
             throw new Error("L'IA n'a identifié aucun nouveau personnage à créer.");
        }
        
        // Clean potential markdown code blocks
        content = content.replace(/^```json\n?/, '').replace(/```$/, '');
        const parsedJson = JSON.parse(content);
        
        if (!parsedJson.name) {
             throw new Error("L'IA n'a pas réussi à identifier de nouveau personnage valide.");
        }

        const validationResult = NewCharacterSchema.safeParse(parsedJson);

        if (!validationResult.success) {
            throw new Error(`La réponse de l'IA locale ne respecte pas le format attendu: ${validationResult.error.message}`);
        }
        
        const isExisting = input.existingCharacters.some(
            (name) => name.toLowerCase() === validationResult.data.name.toLowerCase()
        );
        if (isExisting) {
            throw new Error(`Le personnage "${validationResult.data.name}" existe déjà.`);
        }

        return validationResult.data;

    } catch (error) {
        console.error("Error in materializeCharacterWithCustomLocalLlm:", error);
        throw new Error(`Erreur lors de la création du personnage avec l'API locale: ${error instanceof Error ? error.message : String(error)}`);
    }
}
