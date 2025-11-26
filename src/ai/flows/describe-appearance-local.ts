'use server';
/**
 * @fileOverview Ollama implementation for describing an image.
 */

import { z } from 'zod';
import type { DescribeAppearanceInput, DescribeAppearanceOutput } from './describe-appearance-genkit';

const OLLAMA_API_URL = "http://localhost:11434/api/generate";

function buildPrompt(): string {
    return `You are an expert fashion and character artist. Analyze the provided image and generate a detailed, objective description.
- If the image shows a person, describe their physical traits (face, hair, build) ONLY.
- If the image shows an item of clothing, describe the clothing ONLY.
- DO NOT invent personality or names.
- Respond with a JSON object containing a single key "description". Example: {"description": "A tall man with short black hair..."}.
`;
}

export async function describeAppearanceWithLocalLlm(input: DescribeAppearanceInput): Promise<DescribeAppearanceOutput> {
    const localConfig = input.aiConfig?.llm.local;
    const model = localConfig?.model || "llava:latest"; // Default to a common vision model

    if (!input.portraitUrl.startsWith('data:image')) {
        throw new Error("L'URL de l'image pour Ollama doit être un Data URI.");
    }
    const base64Image = input.portraitUrl.split(',')[1];
    
    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                prompt: buildPrompt(),
                images: [base64Image],
                format: "json",
                stream: false,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erreur du serveur Ollama: ${response.status} ${errorBody}`);
        }
        
        const data = await response.json();
        const content = data.response;
        
        if (!content) {
            throw new Error("Réponse invalide du serveur Ollama.");
        }

        const parsedJson = JSON.parse(content);

        if (!parsedJson.description) {
            throw new Error("La réponse JSON de l'IA locale ne contient pas de champ 'description'.");
        }

        return { description: parsedJson.description };

    } catch (error) {
        console.error("Error in describeAppearanceWithLocalLlm:", error);
        throw new Error(`Erreur lors de la description avec le modèle local: ${error instanceof Error ? error.message : String(error)}`);
    }
}
