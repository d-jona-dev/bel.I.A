

'use server';

import type { GenerateAdventureInput, GenerateAdventureFlowOutput } from '@/types';
import { GenerateAdventureOutputSchema } from '@/types';

const OLLAMA_API_URL = "http://localhost:11434/api/generate";

function buildOllamaPrompt(input: GenerateAdventureInput): { prompt: string, images?: string[] } {
    const { aiConfig, currentLanguage, playerPortraitUrl } = input;
    const compatibilityMode = aiConfig?.llm.local?.compatibilityMode;
    
    const mainInstruction = `You are an interactive fiction engine. Your task is to generate the story's continuation. The REQUIRED output language is: ${currentLanguage}. You MUST respond EXCLUSIVELY with a valid JSON object. Do NOT provide any text outside the JSON object.
Use "..." for all character speech.
Use *...* for all character thoughts.`;
    
    let textPrompt: string;
    
    if (compatibilityMode) {
        const simpleSchema = `{ "narrative": "string", "sceneDescriptionForImage": { "action": "string", "cameraAngle": "string" } }`;
        textPrompt = `${mainInstruction}\n\nContext:\n${input.initialSituation}\n\nPlayer's Action: ${input.userAction}\n\nYour task: Generate the next part of the story (\`narrative\`) and a brief scene description for an image (\`sceneDescriptionForImage\`) in a JSON object. Your response MUST follow this schema: ${simpleSchema}`;
    } else {
        // Full prompt logic (original)
        const promptSections: string[] = [];
        const addSection = (title: string, content: string | undefined | null | string[]) => {
            if (content && (typeof content !== 'string' || content.trim() !== '') && (!Array.isArray(content) || content.length > 0)) {
                const contentString = Array.isArray(content) ? content.join('\n- ') : content;
                promptSections.push(`## ${title}\n- ${contentString}`);
            }
        };
        
        let playerInfo = `- Name: ${input.playerName}`;
        if (input.playerDetails) playerInfo += `\n- Physical Description: ${input.playerDetails}`;
        if (input.playerDescription) playerInfo += `\n- Background/Personality: ${input.playerDescription}`;
        if (input.playerOrientation) playerInfo += `\n- Romantic Orientation: ${input.playerOrientation}`;
        promptSections.push(`## PLAYER CHARACTER\n${playerInfo}`);

        addSection("WORLD CONTEXT", input.world);
        addSection("CURRENT SITUATION / RECENT EVENTS", input.initialSituation);
        addSection("ACTIVE CONDITIONS TO CONSIDER", input.activeConditions);

        if (input.characters.length > 0) {
            const charactersDesc = input.characters.map(char => `Name: ${char.name}, Description: ${char.details}, Affinity: ${char.affinity}/100`).join('\n');
            addSection(`CHARACTERS PRESENT`, charactersDesc);
        }
        
        addSection(`PLAYER ACTION (${input.playerName})`, input.userAction);
        
        if (playerPortraitUrl) {
            promptSections.push('An image was attached to the player action. Take it into consideration when generating the narrative.');
        }

        const fullInstruction = `${mainInstruction}\nNEVER narrate the player's actions or thoughts (named "${input.playerName}"). Start your narration directly with the consequences of their action. CRITICAL RULE: You are NO LONGER responsible for detecting new characters.`;
        
        promptSections.unshift(fullInstruction);

        const zodSchemaString = `{ "narrative": "string", "sceneDescriptionForImage": { "action": "string", "cameraAngle": "string" }, "affinityUpdates": [], "relationUpdates": [], "newEvent": "string" }`;
        promptSections.push(`## EXPECTED JSON OUTPUT SCHEMA\n\`\`\`json\n${zodSchemaString}\n\`\`\``);

        textPrompt = promptSections.join('\n\n');
    }

    const result: { prompt: string, images?: string[] } = { prompt: textPrompt };
    if (playerPortraitUrl && playerPortraitUrl.startsWith('data:image')) {
        result.images = [playerPortraitUrl.split(',')[1]];
    }

    return result;
}


export async function generateAdventureWithLocalLlm(input: GenerateAdventureInput): Promise<GenerateAdventureFlowOutput> {
    const { aiConfig } = input;

    if (!aiConfig?.llm.local?.model) {
        return { error: "Nom du modèle Ollama manquant.", narrative: "" };
    }

    try {
        const { prompt, images } = buildOllamaPrompt(input);
        
        const response = await fetch(OLLAMA_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: aiConfig.llm.local.model,
                prompt: prompt,
                images: images,
                format: "json",
                stream: false,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Ollama API Error:", response.status, errorBody);
            return { error: `Erreur du serveur Ollama: ${response.status} ${errorBody}`, narrative: "" };
        }

        const rawApiResponse = await response.json();
        
        let content = rawApiResponse.response;
        
        if (!content) {
            return { error: "La réponse d'Ollama ne contenait pas de contenu valide.", narrative: "" };
        }

        content = content.replace(/^```json\n?/, '').replace(/```$/, '');

        try {
            const parsedJson = JSON.parse(content);
            const validationResult = GenerateAdventureOutputSchema.safeParse(parsedJson);

            if (!validationResult.success) {
                console.error("Zod validation failed:", validationResult.error.errors);
                return {
                    error: `La réponse d'Ollama ne respecte pas le format attendu. Erreurs: ${validationResult.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ')}\nRéponse brute: ${content}`,
                    narrative: ""
                };
            }
            
            return { ...validationResult.data, error: undefined };

        } catch (e) {
            console.error("JSON parsing error:", e);
            return { error: `Erreur lors du parsing de la réponse JSON d'Ollama. Réponse brute: ${content}`, narrative: "" };
        }

    } catch (error) {
        console.error("Error calling Ollama Server:", error);
        return { error: `Erreur inattendue lors de l'appel au serveur Ollama: ${error instanceof Error ? error.message : String(error)}`, narrative: "" };
    }
}
