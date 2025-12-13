

'use server';

import type { GenerateAdventureInput, GenerateAdventureFlowOutput } from '@/types';
import { GenerateAdventureInputSchema, GenerateAdventureOutputSchema } from '@/types';
import { z } from 'zod';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Builds a simplified and robust prompt specifically for OpenRouter models.
 * It provides a clear context and a simple JSON structure example to guide the AI.
 */
function buildOpenRouterPrompt(
    input: z.infer<typeof GenerateAdventureInputSchema>,
): any[] {

    // --- Narrative (Non-Combat) Prompt ---
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
    
    addSection("CONTEXTE DU MONDE", input.world);
    addSection("SITUATION ACTUELLE", input.initialSituation);
    addSection("CONDITIONS ACTIVES", input.activeConditions);

    if (input.characters.length > 0) {
        const charactersDesc = input.characters.map(char => 
            `- ${char.name}: ${char.details} (Affinité: ${char.affinity}/100)`
        ).join('\n');
        addSection(`PERSONNAGES PRÉSENTS`, charactersDesc);
    }
    
    addSection(`ACTION DU JOUEUR (${input.playerName})`, input.userAction);

    let mainInstruction = `Tu es un maître du jeu pour une fiction interactive centrée sur les relations. Ta tâche est de faire avancer l'histoire.
    La langue de sortie OBLIGATOIRE est : **${input.currentLanguage}**.
    Ne décris que les conséquences de l'action du joueur et les réactions des PNJ.
    Commence ta narration directement, sans répéter l'action du joueur.
    RÈGLE CRITIQUE : Tu n'es PLUS responsable de la détection de nouveaux personnages.`;
    
    mainInstruction += `\n**NOUVELLE RÈGLE : Pour éviter toute ambiguïté, lorsqu'un PNJ effectue une action, commence la phrase par son nom (par exemple, "L'espionne prend une profonde inspiration...").**`;
    mainInstruction += `\n**MODE BD ACTIF :** Ta narration DOIT être structurée. Utilise des "..." pour les paroles, et des *...* pour les pensées. Le reste est de la narration pure.`;
    
    mainInstruction += `\n**Pour \`sceneDescriptionForImage\` :**
- \`action\`: Fournis une description MINIMALE en ANGLAIS. Concentre-toi sur "qui fait quoi, où". N'inclus PAS la description physique des personnages.
- \`cameraAngle\`: Suggère un angle de caméra créatif et dynamique en ANGLAIS (ex: "dynamic low-angle shot", "aerial view").`;
    
    mainInstruction += `\n**Pour \`newEvent\` :** Si la narration implique un changement d'événement (ex: la classe se termine), décris-le brièvement. Sinon, laisse ce champ vide.`;

    const systemPromptContent = `Tu es un assistant IA qui répond TOUJOURS au format JSON. Ne fournis aucun texte en dehors de l'objet JSON.`;
    
    mainInstruction += `\n\nTu DOIS répondre EXCLUSIVEMENT avec un objet JSON valide qui respecte le format suivant. Ne fournis AUCUN texte avant ou après l'objet JSON.

### EXEMPLE DE JSON ATTENDU :
\`\`\`json
{
    "narrative": "Le vent glacial balayait les couloirs. L'espionne se frotta les bras. *Il est en retard...* pensa-t-elle, avant de voir le guerrier s'approcher. \\"Tu as l'air soucieuse. Tout va bien ?\\"",
    "sceneDescriptionForImage": { "action": "A spy and a warrior are arguing in a tavern.", "cameraAngle": "dramatic close-up on the spy's face" },
    "affinityUpdates": [ { "characterName": "L'espionne", "change": -1, "reason": "Inquiétude due au retard du joueur." } ],
    "relationUpdates": [],
    "newEvent": "Fin du cours"
}
\`\`\`

**Règles importantes pour le JSON :**
- Remplis chaque champ avec le type de donnée approprié.
- Si un champ n'a pas de contenu pertinent (ex: affinityUpdates), fournis un tableau vide \`[]\` ou une chaîne vide \`""\`. NE PAS utiliser \`null\`.
- Le jeu gère la logique métier en interne. Ton rôle est de narrer les événements. N'invente pas de récompenses ou de changements de statistiques.`;

    promptSections.unshift(mainInstruction);

    return [
        { role: "system", content: systemPromptContent },
        { role: "user", content: promptSections.join('\n\n') }
    ];
}

async function commonAdventureProcessing(input: GenerateAdventureInput): Promise<z.infer<typeof GenerateAdventureInputSchema>> {
    // This function remains the same as it correctly processes the input for the prompt.
    const processedCharacters: z.infer<typeof GenerateAdventureInputSchema>['characters'] = input.characters.map(char => {
        let relationsSummaryText = input.currentLanguage === 'fr' ? "Mode relations désactivé." : "Relations mode disabled.";
        if (input.relationsModeActive && char.relations) {
             relationsSummaryText = Object.entries(char.relations)
                      .map(([targetId, description]) => {
                          const targetName = targetId === 'player'
                              ? input.playerName
                              : input.characters.find(c => c.id === targetId)?.name || targetId;
                          return `${targetName}: ${description}`;
                      })
                      .join('; ') || (input.currentLanguage === 'fr' ? 'Aucune relation définie.' : 'No relations defined.');
        }

        return {
            id: char.id,
            name: char.name,
            details: char.details || (input.currentLanguage === 'fr' ? "Aucun détail fourni." : "No details provided."),
            biographyNotes: char.biographyNotes || (input.currentLanguage === 'fr' ? 'Aucune note biographique.' : 'No biographical notes.'),
            affinity: input.relationsModeActive ? (char.affinity ?? 50) : 50,
            relations: input.relationsModeActive ? (char.relations || { ['player']: (input.currentLanguage === 'fr' ? "Inconnu" : "Unknown") }) : {},
            relationsSummary: relationsSummaryText,
            portraitUrl: char.portraitUrl,
            appearanceDescription: char.appearanceDescription,
        };
    });
    
    const flowInput: z.infer<typeof GenerateAdventureInputSchema> = {
        ...input,
        characters: processedCharacters,
        relationsModeActive: true,
        comicModeActive: true,
        aiConfig: input.aiConfig,
        playerPortraitUrl: input.playerPortraitUrl,
    };
    return flowInput;
}


export async function generateAdventureWithOpenRouter(
    input: GenerateAdventureInput
): Promise<GenerateAdventureFlowOutput> {
    const { aiConfig } = input;
    const openRouterConfig = aiConfig?.llm.openRouter;

    if (!openRouterConfig?.apiKey || !openRouterConfig.model) {
        return { error: "Clé API OpenRouter ou nom du modèle manquant.", narrative: "" };
    }

    try {
        const processedInput = await commonAdventureProcessing(input);
        const messages = buildOpenRouterPrompt(processedInput);
        
        const requestBody: any = {
            model: openRouterConfig.model,
            messages: messages,
            // Request JSON object for models that support it
            response_format: { type: "json_object" }
        };

        if (openRouterConfig.maxTokens) {
            requestBody.max_tokens = openRouterConfig.maxTokens;
        }

        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterConfig.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Bel.I.A.",
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("OpenRouter API Error:", response.status, errorBody);
            return { error: `Erreur de l'API OpenRouter: ${response.status} ${errorBody}`, narrative: "" };
        }

        const rawApiResponse = await response.json();
        
        let content = rawApiResponse.choices?.[0]?.message?.content;
        
        if (!content) {
            return { error: "La réponse de l'API ne contenait pas de contenu valide.", narrative: "" };
        }
        
        // Clean potential markdown code blocks
        content = content.replace(/^```json\n?/, '').replace(/```$/, '');

        try {
            const parsedJson = JSON.parse(content);
            const narrative = parsedJson.narrative || "";

            if (!narrative) {
                 return { 
                    narrative: input.userAction, // Fallback to user action
                    error: `La réponse JSON de l'IA ne contient pas de champ narratif valide. Réponse brute: ${content}`,
                 };
            }
            
            const cleanedJson = {
                ...parsedJson,
                narrative: narrative,
                affinityUpdates: (Array.isArray(parsedJson.affinityUpdates) ? parsedJson.affinityUpdates : []).map((u: any) => ({
                    ...u,
                    change: Math.max(-10, Math.min(10, u.change || 0)), // Clamp affinity change
                })),
                relationUpdates: Array.isArray(parsedJson.relationUpdates) ? parsedJson.relationUpdates : [],
                newEvent: parsedJson.newEvent || "",
            };

            const validationResult = GenerateAdventureOutputSchema.safeParse(cleanedJson);

            if (!validationResult.success) {
                console.error("Zod validation failed after cleaning:", validationResult.error.errors);
                return {
                    error: `La réponse de l'IA ne respecte pas le format attendu. Erreurs: ${validationResult.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ')}\nRéponse brute: ${content}`,
                    narrative: narrative,
                };
            }
            
            return { ...validationResult.data, error: undefined };

        } catch (e) {
            console.error("JSON parsing error:", e);
             return { 
                narrative: "L'IA a renvoyé une réponse inattendue qui n'est pas un JSON valide.",
                error: `Erreur lors du parsing de la réponse JSON de l'IA. Contenu: ${content}`,
             };
        }

    } catch (error) {
        console.error("Error calling OpenRouter:", error);
        return { error: `Erreur de communication avec OpenRouter: ${error instanceof Error ? error.message : String(error)}`, narrative: "" };
    }
}
