
'use server';
/**
 * @fileOverview Custom Local API (like LM Studio) implementation for describing an image.
 */

import { z } from 'zod';
import type { DescribeAppearanceInput, DescribeAppearanceOutput } from './describe-appearance-genkit';

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

export async function describeAppearanceWithCustomLocalLlm(input: DescribeAppearanceInput): Promise<DescribeAppearanceOutput> {
    const customConfig = input.aiConfig?.llm.customLocal;

    if (!customConfig?.apiUrl) {
        throw new Error("L'URL de l'API locale personnalisée est manquante.");
    }
    
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
                model: customConfig.model || 'default-vision-model', // The user must configure their server to route this
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: buildPrompt(input.subjectType || 'person') },
                            {
                                type: "image_url",
                                image_url: {
                                    url: input.portraitUrl,
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 300,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erreur de l'API locale personnalisée: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content;
        
        if (!content) {
            throw new Error("Réponse invalide de l'API locale personnalisée.");
        }

        content = content.replace(/^```json\n?/, '').replace(/```$/, '');
        const parsedJson = JSON.parse(content);

        if (!parsedJson.description) {
            throw new Error("La réponse JSON de l'IA locale ne contient pas de champ 'description'.");
        }

        return { description: parsedJson.description };

    } catch (error) {
        console.error("Error in describeAppearanceWithCustomLocalLlm:", error);
        throw new Error(`Erreur lors de la description avec l'API locale: ${error instanceof Error ? error.message : String(error)}`);
    }
}
