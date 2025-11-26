'use server';
/**
 * @fileOverview Custom Local API (like LM Studio) implementation for describing an image.
 */

import { z } from 'zod';
import type { DescribeAppearanceInput, DescribeAppearanceOutput } from './describe-appearance-genkit';

function buildPrompt(): string {
    return `You are an expert fashion and character artist. Analyze the provided image and generate a detailed, objective description.
- If the image shows a person, describe their permanent physical traits (face, hair, build) ONLY.
- If the image shows an item of clothing, describe the clothing ONLY.
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
                            { type: "text", text: buildPrompt() },
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
