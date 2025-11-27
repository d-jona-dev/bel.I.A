
'use server';
/**
 * @fileOverview OpenRouter implementation for describing an image.
 */

import { z } from 'zod';
import type { DescribeAppearanceInput, DescribeAppearanceOutput } from './describe-appearance-genkit';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function buildPrompt(): string {
    return `You are an expert fashion and character artist, specializing in creating vivid descriptions for game development.
Your task is to analyze the provided image and generate a detailed, objective description focusing *only* on what is visible.

**CRITICAL RULES:**
1.  **Analyze the image content:** Determine if the primary subject is a PERSON or an ITEM OF CLOUGHING.
2.  **If it's a person:** Describe their permanent physical traits (face, hair, build). DO NOT describe clothing, accessories, armor, background, or lighting.
3.  **If it's an item of clothing:** Describe the clothing exclusively. Detail its type (e.g., 'tunic', 'dress', 'armor'), cut, color, material, and any patterns or notable details. DO NOT describe the person wearing it (if any) or the background.
4.  **DO NOT** invent personality, backstory, or names. Stick strictly to what is visually present.
5.  Your response MUST be a JSON object with a single key "description", containing the descriptive text. Example: {"description": "A tall man with short black hair..."}.
`;
}

export async function describeAppearanceWithOpenRouter(input: DescribeAppearanceInput): Promise<DescribeAppearanceOutput> {
    const openRouterConfig = input.aiConfig?.llm.openRouter;

    if (!openRouterConfig?.apiKey || !openRouterConfig.model) {
        throw new Error("Clé API OpenRouter ou nom du modèle manquant.");
    }
    
    // Use the model selected by the user in the LLM config.
    const visionModel = openRouterConfig.model; 

    const systemPrompt = buildPrompt();

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterConfig.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: visionModel,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "image_url",
                                image_url: {
                                    url: input.portraitUrl,
                                },
                            },
                        ],
                    },
                ],
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erreur de l'API OpenRouter: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("Réponse invalide de l'API OpenRouter.");
        }

        const parsedJson = JSON.parse(content);
        
        if (!parsedJson.description) {
            throw new Error("La réponse JSON de l'IA ne contient pas de champ 'description'.");
        }
        
        return { description: parsedJson.description };

    } catch (error) {
        console.error("Error in describeAppearanceWithOpenRouter:", error);
        throw new Error(`Erreur lors de la description avec OpenRouter: ${error instanceof Error ? error.message : String(error)}`);
    }
}
