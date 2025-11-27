
'use server';
/**
 * @fileOverview OpenRouter implementation for describing an image.
 */

import { z } from 'zod';
import type { DescribeAppearanceInput, DescribeAppearanceOutput } from './describe-appearance-genkit';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function buildPrompt(subjectType: 'person' | 'clothing'): string {
    if (subjectType === 'clothing') {
        return `You are an expert fashion artist. Analyze the provided image and generate a detailed, objective description of the clothing ONLY.
- Describe the clothing exclusively: its type (e.g., 'tunic', 'dress', 'armor'), cut, color, material, and any patterns.
- DO NOT describe the person wearing it, the background, or any accessories.
- Your response MUST be a JSON object with a single key "description". Example: {"description": "A long-sleeved blue tunic made of rough linen."}.
`;
    }
    // Default to 'person'
    return `You are an expert character artist. Analyze the provided image and generate a detailed, objective description of the person's physical traits ONLY.
- Describe their face, hair, and build.
- DO NOT describe clothing, accessories, background, or lighting.
- Your response MUST be a JSON object with a single key "description". Example: {"description": "A tall man with short black hair..."}.
`;
}

export async function describeAppearanceWithOpenRouter(input: DescribeAppearanceInput): Promise<DescribeAppearanceOutput> {
    const openRouterConfig = input.aiConfig?.llm.openRouter;

    if (!openRouterConfig?.apiKey) {
        throw new Error("Clé API OpenRouter manquante.");
    }
    
    const visionModel = openRouterConfig.model; 

    const systemPrompt = buildPrompt(input.subjectType || 'person');

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
