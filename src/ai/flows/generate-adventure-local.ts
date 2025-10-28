

'use server';

import type { GenerateAdventureInput, GenerateAdventureFlowOutput } from '@/types';
import { GenerateAdventureOutputSchema } from '@/types';

const LOCAL_LLM_API_URL = "http://localhost:9000/api/local-llm/generate";

function buildLocalLLMPrompt(input: GenerateAdventureInput): string {
    const promptSections: string[] = [];

    const addSection = (title: string, content: string | undefined | null | string[]) => {
        if (content && (typeof content !== 'string' || content.trim() !== '') && (!Array.isArray(content) || content.length > 0)) {
            const contentString = Array.isArray(content) ? content.join('\n- ') : content;
            promptSections.push(`## ${title}\n- ${contentString}`);
        }
    };
    
    // Add player info
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

    let mainInstruction = `You are an interactive fiction engine for a relationship-focused game. Your task is to generate the continuation of the story. The REQUIRED output language is: ${input.currentLanguage}. NEVER narrate the player's actions or thoughts (named "${input.playerName}"). Start your narration directly with the consequences of their action. You MUST respond EXCLUSIVELY with a valid JSON object. Do NOT provide any text outside the JSON object. CRITICAL RULE: You are NO LONGER responsible for detecting new characters.`;
    
    mainInstruction += `\n**NEW RULE: To avoid ambiguity, when an NPC performs an action, start the sentence with their name (e.g., "L'espionne prend une profonde inspiration...").**`;
    mainInstruction += `\n**COMIC MODE ACTIVE:** Your narrative MUST be structured. Use double quotes ("...") for all character speech. Use asterisks (*...*) for all character thoughts. Unadorned text is for pure narration.`;
    
    mainInstruction += "\nFor `sceneDescriptionForImage`, provide a MINIMAL description in ENGLISH focusing on 'who is doing what, where'. Also suggest a `cameraAngle` (e.g., 'dynamic low-angle shot'). DO NOT describe character appearances.";
    
    mainInstruction += `\nFor \`newEvent\` : If the narrative implies a change of event (e.g., class ends), describe it briefly. Otherwise, leave this field empty.`;

    mainInstruction += "\nFocus on narrative and character consistency. The game system handles all other logic internally. Your role is PURELY narrative.";

    const zodSchemaString = `{
    "narrative": "Le vent glacial balayait les couloirs. L'espionne se frotta les bras. *Il est en retard...* pensa-t-elle, avant de voir le guerrier s'approcher. \\"Tu as l'air soucieuse. Tout va bien ?\\"",
    "sceneDescriptionForImage": { "action": "A spy and a warrior are talking in a modern university hallway.", "cameraAngle": "dramatic close-up" },
    "affinityUpdates": [
        { "characterName": "L'espionne", "change": -1, "reason": "Inquiétude due au retard du joueur." }
    ],
    "relationUpdates": [],
    "newEvent": "Fin du cours"
}`;

    promptSections.unshift(mainInstruction);
    promptSections.push(`## EXPECTED JSON OUTPUT EXAMPLE\n\`\`\`json\n${zodSchemaString}\n\`\`\``);

    // This format is a common starting point for instruction-tuned models.
    return `USER: ${promptSections.join('\n\n')}\nASSISTANT:`;
}


export async function generateAdventureWithLocalLlm(input: GenerateAdventureInput): Promise<GenerateAdventureFlowOutput> {
    const { aiConfig } = input;

    if (!aiConfig?.llm.local?.model) {
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
                model: aiConfig.llm.local.model,
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
