
'use server';

import type { GenerateAdventureInput, GenerateAdventureFlowOutput } from '@/types';
import { GenerateAdventureOutputSchema } from '@/types';

const LOCAL_LLM_API_URL = "http://localhost:9000/api/local-llm/generate";

function buildLocalLLMPrompt(input: GenerateAdventureInput): string {
    const promptSections: string[] = [];

    const addSection = (title: string, content: string | undefined | null) => {
        if (content) {
            promptSections.push(`## ${title}\n${content}`);
        }
    };
    
    addSection("WORLD CONTEXT", input.world);
    addSection("CURRENT SITUATION / RECENT EVENTS", input.initialSituation);

    if (input.characters.length > 0) {
        const charactersDesc = input.characters.map(char => `Name: ${char.name}, Description: ${char.details}, Affinity: ${char.affinity}/100`).join('\n');
        addSection(`CHARACTERS PRESENT`, charactersDesc);
    }

    addSection(`PLAYER ACTION (${input.playerName})`, input.userAction);

    let mainInstruction = `You are an interactive fiction engine. Your task is to generate the continuation of the story based on the provided context. The REQUIRED output language is: ${input.currentLanguage}. NEVER narrate the player's actions or thoughts (named "${input.playerName}"). Start your narration directly with the consequences of their action. You MUST respond EXCLUSIVELY with a valid JSON object that adheres to the following Zod schema. Do NOT provide any text outside the JSON object. Do not wrap the JSON in quotes or markdown backticks.`;
    
    // We are now removing the detailed rules from the prompt as they are handled by the main app logic
    mainInstruction += "\nFocus on narrative and character consistency.";

    const zodSchemaString = JSON.stringify(GenerateAdventureOutputSchema.shape, null, 2);

    promptSections.unshift(mainInstruction);
    promptSections.push(`## EXPECTED JSON OUTPUT SCHEMA\n\`\`\`json\n${zodSchemaString}\n\`\`\``);

    // This format is a common starting point for instruction-tuned models.
    return `USER: ${promptSections.join('\n\n')}\nASSISTANT:`;
}


export async function generateAdventureWithLocalLlm(input: GenerateAdventureInput): Promise<GenerateAdventureFlowOutput> {
    const { aiConfig } = input;

    if (!aiConfig?.local?.model) {
        return { error: "Nom du modèle local manquant.", narrative: "" };
    }

    try {
        const prompt = buildLocalLLMPrompt(input);
        
        const response = await fetch(LOCAL_LLM_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: aiConfig.local.model,
                prompt: prompt,
                json_schema: GenerateAdventureOutputSchema.shape, // Pass the schema shape
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Local LLM API Error:", response.status, errorBody);
            return { error: `Erreur du serveur LLM Local: ${response.status} ${errorBody}`, narrative: "" };
        }

        const rawApiResponse = await response.json();
        
        let content = rawApiResponse.content;
        
        if (!content) {
            return { error: "La réponse du LLM local ne contenait pas de contenu valide.", narrative: "" };
        }

        // Clean potential markdown code blocks
        content = content.replace(/^```json\n?/, '').replace(/```$/, '');

        try {
            const parsedJson = JSON.parse(content);
            const validationResult = GenerateAdventureOutputSchema.safeParse(parsedJson);

            if (!validationResult.success) {
                console.error("Zod validation failed:", validationResult.error.errors);
                return {
                    error: `La réponse du LLM local ne respecte pas le format attendu. Erreurs: ${validationResult.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ')}\nRéponse brute: ${content}`,
                    narrative: ""
                };
            }
            
            return { ...validationResult.data, error: undefined };

        } catch (e) {
            console.error("JSON parsing error:", e);
            return { error: `Erreur lors du parsing de la réponse JSON du LLM local. Réponse brute: ${content}`, narrative: "" };
        }

    } catch (error) {
        console.error("Error calling Local LLM Server:", error);
        return { error: `Erreur inattendue lors de l'appel au serveur local: ${error instanceof Error ? error.message : String(error)}`, narrative: "" };
    }
}

    