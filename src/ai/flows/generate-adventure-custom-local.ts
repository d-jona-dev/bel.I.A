
'use server';

import type { GenerateAdventureInput, GenerateAdventureFlowOutput } from '@/types';
import { GenerateAdventureOutputSchema } from '@/types';
import { z } from 'zod';

/**
 * Builds a simplified prompt for custom local LLMs compatible with OpenAI's API.
 */
function buildPrompt(input: GenerateAdventureInput): any[] {
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

    let mainInstruction = `You are an interactive fiction engine. Your task is to generate the story's continuation. The REQUIRED output language is: ${input.currentLanguage}.
    You MUST respond EXCLUSIVELY with a valid JSON object. Do NOT provide any text outside the JSON object.
    
    The JSON object must conform to the following schema:
    {
        "narrative": "The next part of the story. Use double quotes for speech and asterisks for thoughts.",
        "sceneDescriptionForImage": { "action": "Minimalist description in ENGLISH of 'who does what, where'", "cameraAngle": "Creative camera angle in ENGLISH" },
        "affinityUpdates": [ { "characterName": "string", "change": number, "reason": "string" } ],
        "relationUpdates": [ { "characterName": "string", "targetName": "string", "newRelation": "string", "reason": "string" } ],
        "newEvent": "A brief string describing a new event, or empty string."
    }
    
    CRITICAL: Start the narration directly from the consequences of the user's action. Do NOT narrate the player's actions.`;
    
    promptSections.unshift(mainInstruction);
    return [{ role: "user", content: promptSections.join('\n\n') }];
}


export async function generateAdventureWithCustomLocalLlm(input: GenerateAdventureInput): Promise<GenerateAdventureFlowOutput> {
    const { aiConfig } = input;
    const customConfig = aiConfig?.llm.customLocal;

    if (!customConfig?.apiUrl) {
        return { error: "L'URL de l'API locale personnalisée est manquante.", narrative: "" };
    }

    try {
        const messages = buildPrompt(input);
        
        // Construction d'URL simplifiée
        let apiUrl = customConfig.apiUrl.trim();
        
        if (!apiUrl.includes('/chat/completions')) {
            apiUrl = apiUrl.replace(/\/+$/, '');
            
            if (!apiUrl.endsWith('/v1')) {
                apiUrl += '/v1';
            }
            apiUrl += '/chat/completions';
        }

        // CORRECTION : Supprime response_format ou utilise "text"
        const requestBody: any = {
            model: customConfig.model || 'default',
            messages: messages,
            temperature: 0.7,
            stream: false,
        };

        // Option 2 : Utilise "text" au lieu de "json_object"
        requestBody.response_format = { type: "text" };

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
        const content = rawApiResponse.choices?.[0]?.message?.content;
        
        if (!content) {
            return { error: "La réponse de l'API locale ne contenait pas de contenu valide.", narrative: "" };
        }

        // Essaye de parser le JSON même si c'est du "text"
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
            // Si le parsing échoue, traite le contenu comme du texte brut
            console.error("JSON parsing failed, treating as plain text:", parseError);
            return {
                narrative: content,
                error: "L'IA a retourné du texte brut au lieu du JSON attendu."
            };
        }

    } catch (error) {
        console.error("Error calling Custom Local LLM Server:", error);
        return { error: `Erreur de communication avec le serveur LLM local: ${error instanceof Error ? error.message : String(error)}`, narrative: "" };
    }
}
