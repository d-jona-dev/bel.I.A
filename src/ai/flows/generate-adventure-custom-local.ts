
'use server';

import type { GenerateAdventureInput, GenerateAdventureFlowOutput } from '@/types';
import { GenerateAdventureOutputSchema } from '@/types';
import { z } from 'zod';

/**
 * Builds a prompt for custom local LLMs compatible with OpenAI's API.
 * Uses a simplified prompt if compatibilityMode is enabled.
 */
function buildPrompt(input: GenerateAdventureInput): any[] {
    const { aiConfig, currentLanguage, playerPortraitUrl } = input;
    const compatibilityMode = aiConfig?.llm?.customLocal?.compatibilityMode;

    const mainInstruction = `You are an interactive fiction engine. Your task is to generate the story's continuation. The REQUIRED output language is: ${currentLanguage}. You MUST respond EXCLUSIVELY with a valid JSON object. Do NOT provide any text outside the JSON object.`;
    
    // Build the user message content parts
    const userContent: any[] = [];
    
    // Add image if it exists
    if (playerPortraitUrl) {
        userContent.push({
            type: "image_url",
            image_url: {
                url: playerPortraitUrl
            }
        });
    }

    if (compatibilityMode) {
        const simpleSchema = `{ "narrative": "string", "sceneDescriptionForImage": { "action": "string", "cameraAngle": "string" } }`;
        const simplifiedUserPrompt = `Context:\n${input.initialSituation}\n\nPlayer's Action: ${input.userAction}\n\nYour task: Generate the next part of the story (\`narrative\`) and a brief scene description for an image (\`sceneDescriptionForImage\`) in a JSON object. Schema: ${simpleSchema}`;
        userContent.push({ type: "text", text: simplifiedUserPrompt });
        return [{ role: "user", content: userContent }];
    }
    
    // Full prompt logic (original)
    const promptSections: string[] = [];
    promptSections.push(mainInstruction);
    
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
    
    const jsonSchema = `{ "narrative": "string", "sceneDescriptionForImage": { "action": "string", "cameraAngle": "string" }, "affinityUpdates": [], "relationUpdates": [], "newEvent": "string" }`;
    promptSections.push(`The JSON object must conform to the following schema:\n${jsonSchema}\n\nCRITICAL: Start the narration directly from the consequences of the user's action. Do NOT narrate the player's actions.`);

    userContent.push({ type: "text", text: promptSections.join('\n\n') });
    
    return [{ role: "user", content: userContent }];
}


export async function generateAdventureWithCustomLocalLlm(input: GenerateAdventureInput): Promise<GenerateAdventureFlowOutput> {
    const { aiConfig } = input;
    const customConfig = aiConfig?.llm.customLocal;

    if (!customConfig?.apiUrl) {
        return { error: "L'URL de l'API personnalisée est manquante.", narrative: "" };
    }

    try {
        const messages = buildPrompt(input);
        
        let apiUrl = customConfig.apiUrl.trim();
        
        if (!apiUrl.includes('/chat/completions')) {
            apiUrl = apiUrl.replace(/\/+$/, '');
            if (!apiUrl.endsWith('/v1')) {
                apiUrl += '/v1';
            }
            apiUrl += '/chat/completions';
        }

        const requestBody: any = {
            model: customConfig.model || 'default',
            messages: messages,
            temperature: 0.7,
            stream: false,
        };

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                ...(customConfig.apiKey && { "Authorization": `Bearer ${customConfig.apiKey}` })
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            return { error: `Erreur de l'API locale: ${response.status} ${errorBody}`, narrative: "" };
        }

        const rawApiResponse = await response.json();
        let content = rawApiResponse.choices?.[0]?.message?.content;
        
        if (!content) {
            return { error: "La réponse de l'API personnalisée ne contenait pas de contenu valide.", narrative: "" };
        }

        // Clean potential markdown code blocks before parsing
        content = content.replace(/^```json\n?/, '').replace(/```$/, '');

        try {
            const parsedJson = JSON.parse(content);
            const validationResult = GenerateAdventureOutputSchema.safeParse(parsedJson);

            if (!validationResult.success) {
                console.error("Zod validation failed (Custom Local):", validationResult.error.errors);
                return {
                    error: `La réponse de l'IA ne respecte pas le format attendu. Erreurs: ${validationResult.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ')}`,
                    narrative: parsedJson.narrative || ""
                };
            }
                
            return { ...validationResult.data, error: undefined };
        } catch (parseError) {
            console.error("JSON parsing failed, treating as plain text:", parseError);
            return {
                narrative: content,
                error: "L'IA a retourné du texte brut au lieu du JSON attendu."
            };
        }

    } catch (error) {
        console.error("Error calling Custom Local LLM Server:", error);
        return { error: `Erreur de communication avec le serveur LLM personnalisé: ${error instanceof Error ? error.message : String(error)}`, narrative: "" };
    }
}
