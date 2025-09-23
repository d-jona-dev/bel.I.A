
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
    combatPromptTemplate?: string
): any[] {
    
    // --- Combat Prompt ---
    if (combatPromptTemplate && input.activeCombat?.isActive) {
        let populatedPrompt = combatPromptTemplate;
        
        const combatantsText = input.activeCombat.combatants.map(c => 
            `- ${c.name} (${c.team === 'player' ? 'Équipe du Joueur' : 'Ennemi'}, PV: ${c.currentHp}/${c.maxHp})`
        ).join('\n');

        const contestedPoi = input.activeCombat.contestedPoiId 
            ? input.mapPointsOfInterest?.find(p => p.id === input.activeCombat!.contestedPoiId) 
            : null;

        populatedPrompt = populatedPrompt.replace('{{{combatants}}}', combatantsText);
        populatedPrompt = populatedPrompt.replace('{{{environmentDescription}}}', input.activeCombat.environmentDescription || "un lieu non décrit");
        populatedPrompt = populatedPrompt.replace('{{{contestedPoiName}}}', contestedPoi?.name || "Territoire Inconnu");
        // IMPORTANT: The userAction for combat is the turn log.
        populatedPrompt = populatedPrompt.replace('{{{userAction}}}', input.userAction);
        populatedPrompt = populatedPrompt.replace('{{{currentLanguage}}}', input.currentLanguage);
        
        return [
            { role: "user", content: populatedPrompt }
        ];
    }
    
    // --- Narrative (Non-Combat) Prompt ---
    const promptSections: string[] = [];

    const addSection = (title: string, content: string | undefined | null) => {
        if (content) {
            promptSections.push(`## ${title}\n${content}`);
        }
    };
    
    addSection("CONTEXTE DU MONDE", input.world);
    addSection("SITUATION ACTUELLE", input.initialSituation);

    if (input.characters.length > 0) {
        const charactersDesc = input.characters.map(char => 
            `- ${char.name}: ${char.details} (Affinité: ${char.affinity}/100)`
        ).join('\n');
        addSection(`PERSONNAGES PRÉSENTS`, charactersDesc);
    }
    
    if (input.merchantInventory && input.merchantInventory.length > 0) {
        const inventoryText = input.merchantInventory.map(item =>
            `- ${item.name} (Prix: ${item.price} PO)`
        ).join('\n');
        addSection("INVENTAIRE DU MARCHAND (POUR CONTEXTE)", `Le joueur interagit avec un marchand. Voici les objets en vente. **Tu peux y faire référence dans ta narration, mais N'INVENTE PAS de nouveaux objets ou de nouveaux prix.** Le joueur achètera via l'interface.\n${inventoryText}`);
    }


    addSection(`ACTION DU JOUEUR (${input.playerName})`, input.userAction);

    let mainInstruction = `Tu es un maître du jeu pour une fiction interactive. Ta tâche est de faire avancer l'histoire.
    La langue de sortie OBLIGATOIRE est : **${input.currentLanguage}**.
    Ne décris que les conséquences de l'action du joueur et les réactions des PNJ.
    Commence ta narration directement, sans répéter l'action du joueur.`;
    
    const systemPromptContent = `Tu es un assistant IA qui répond TOUJOURS au format JSON. Ne fournis aucun texte en dehors de l'objet JSON.`;
    
    mainInstruction += `\n\nTu DOIS répondre EXCLUSIVEMENT avec un objet JSON valide qui respecte le format suivant. Ne fournis AUCUN texte avant ou après l'objet JSON.

### EXEMPLE DE JSON ATTENDU :
\`\`\`json
{
    "narrative": "Le texte de l'histoire généré ici...",
    "sceneDescriptionForImage": "Description visuelle de la scène pour un générateur d'images...",
    "newCharacters": [
        { "name": "Nouveau PNJ", "details": "Description du PNJ...", "initialHistoryEntry": "Rencontré ici." }
    ],
    "characterUpdates": [
        { "characterName": "Ancien PNJ", "historyEntry": "A réagi comme ça." }
    ],
    "affinityUpdates": [
        { "characterName": "Ancien PNJ", "change": -1, "reason": "Action du joueur." }
    ],
    "relationUpdates": [],
    "itemsObtained": [],
    "currencyGained": 0,
    "lootItemsText": "Épée rouillée, Potion de soin"
}
\`\`\`

**Règles importantes pour le JSON :**
- Remplis chaque champ avec le type de donnée approprié (texte, nombre, tableau d'objets).
- Si un champ n'a pas de contenu pertinent (par exemple, pas de nouveaux personnages), fournis un tableau vide \`[]\` ou une valeur par défaut (0 pour \`currencyGained\`, "" pour les textes). NE PAS utiliser \`null\`.
- Les champs \`narrative\` et \`sceneDescriptionForImage\` doivent toujours contenir du texte.
- Le jeu gère la logique métier (combat, achats, etc.) en interne. Ton rôle est de narrer les événements. Ne tente pas d'initier des combats ou de manipuler l'inventaire directement.`;

    promptSections.unshift(mainInstruction);

    return [
        { role: "system", content: systemPromptContent },
        { role: "user", content: promptSections.join('\n\n') }
    ];
}

async function commonAdventureProcessing(input: GenerateAdventureInput): Promise<z.infer<typeof GenerateAdventureInputSchema>> {
    // This function remains the same as it correctly processes the input for the prompt.
    const processedCharacters: z.infer<typeof GenerateAdventureInputSchema>['characters'] = input.characters.map(char => {
        const history = char.history || [];
        const lastThreeEntries = history.slice(-3);
        const historySummary = lastThreeEntries.length > 0 ? lastThreeEntries.join(' | ') : (input.currentLanguage === 'fr' ? 'Aucun historique notable.' : 'No notable history.');

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
            historySummary: historySummary,
            relationsSummary: relationsSummaryText,
            hitPoints: input.rpgModeActive ? (char.hitPoints ?? char.maxHitPoints ?? 10) : undefined,
            maxHitPoints: input.rpgModeActive ? (char.maxHitPoints ?? 10) : undefined,
            manaPoints: input.rpgModeActive ? (char.manaPoints ?? char.maxManaPoints ?? (char.characterClass?.toLowerCase().includes('mage') || char.characterClass?.toLowerCase().includes('sorcerer') ? 10 : 0)) : undefined,
            maxManaPoints: input.rpgModeActive ? (char.maxManaPoints ?? (char.characterClass?.toLowerCase().includes('mage') || char.characterClass?.toLowerCase().includes('sorcerer') ? 10 : 0)) : undefined,
            armorClass: input.rpgModeActive ? (char.armorClass ?? 10) : undefined,
            attackBonus: input.rpgModeActive ? (char.attackBonus ?? 0) : undefined,
            damageBonus: input.rpgModeActive ? (char.damageBonus ?? "1") : undefined,
            characterClass: input.rpgModeActive ? (char.characterClass || "N/A") : undefined,
            level: input.rpgModeActive ? (char.level ?? 1) : undefined,
            isHostile: input.rpgModeActive ? (char.isHostile ?? false) : false,
            isAlly: input.rpgModeActive ? (char.isAlly ?? false) : false,
            spells: char.spells,
            locationId: char.locationId,
            faceSwapEnabled: char.faceSwapEnabled,
            portraitUrl: char.portraitUrl,
        };
    });

    const processedPlayerSkills = input.playerSkills?.map(skill => ({
        name: skill.name,
        description: skill.description,
        category: skill.category,
    }));
    
    const currentPlayerLocation = input.playerLocationId
        ? input.mapPointsOfInterest?.find(poi => poi.id === input.playerLocationId)
        : undefined;

    let ownerNameForPrompt = "Inconnu";
    if (currentPlayerLocation?.ownerId) {
        if (currentPlayerLocation.ownerId === 'player') {
            ownerNameForPrompt = input.playerName;
        } else {
            const ownerChar = input.characters.find(c => c.id === currentPlayerLocation.ownerId);
            if (ownerChar) {
                ownerNameForPrompt = ownerChar.name;
            }
        }
    }
    
    const flowInput: z.infer<typeof GenerateAdventureInputSchema> = {
        ...input,
        characters: processedCharacters,
        rpgModeActive: input.rpgModeActive ?? false,
        relationsModeActive: input.relationsModeActive ?? true,
        activeCombat: input.activeCombat,
        playerSkills: processedPlayerSkills,
        playerClass: input.rpgModeActive ? (input.playerClass || "Aventurier") : undefined,
        playerLevel: input.rpgModeActive ? (input.playerLevel || 1) : undefined,
        playerCurrentHp: input.rpgModeActive ? (input.playerCurrentHp) : undefined,
        playerMaxHp: input.rpgModeActive ? (input.playerMaxHp) : undefined,
        playerCurrentMp: input.rpgModeActive ? (input.playerCurrentMp) : undefined,
        playerMaxMp: input.rpgModeActive ? (input.playerMaxMp) : undefined,
        playerCurrentExp: input.rpgModeActive ? (input.playerCurrentExp || 0) : undefined,
        playerExpToNextLevel: input.rpgModeActive ? (input.playerExpToNextLevel || 100) : undefined,
        playerGold: input.rpgModeActive ? (input.playerGold || 0) : undefined,
        playerStrength: input.rpgModeActive ? input.playerStrength : undefined,
        playerDexterity: input.rpgModeActive ? input.playerDexterity : undefined,
        playerConstitution: input.rpgModeActive ? input.playerConstitution : undefined,
        playerIntelligence: input.rpgModeActive ? input.playerIntelligence : undefined,
        playerWisdom: input.rpgModeActive ? input.playerWisdom : undefined,
        playerCharisma: input.rpgModeActive ? input.playerCharisma : undefined,
        playerArmorClass: input.rpgModeActive ? input.playerArmorClass : undefined,
        playerAttackBonus: input.rpgModeActive ? input.playerAttackBonus : undefined,
        playerDamageBonus: input.rpgModeActive ? input.playerDamageBonus : undefined,
        equippedWeaponName: input.equippedWeaponName,
        equippedArmorName: input.equippedArmorName,
        equippedJewelryName: input.equippedJewelryName,
        playerLocationId: input.playerLocationId,
        mapPointsOfInterest: input.mapPointsOfInterest?.map(poi => ({
            id: poi.id,
            name: poi.name,
            description: poi.description,
            level: poi.level,
            ownerId: poi.ownerId,
            ownerName: poi.ownerId === 'player' ? input.playerName : input.characters.find(c => c.id === poi.ownerId)?.name,
            buildings: poi.buildings,
        })),
        playerLocation: currentPlayerLocation ? { ...currentPlayerLocation, ownerName: ownerNameForPrompt } : undefined,
        aiConfig: input.aiConfig,
        timeManagement: input.timeManagement?.enabled ? {
            ...input.timeManagement,
            day: input.timeManagement.day ?? 1,
            dayName: input.timeManagement.dayName ?? "Lundi",
        } : undefined,
        playerPortraitUrl: input.playerPortraitUrl,
        playerFaceSwapEnabled: input.playerFaceSwapEnabled,
        merchantInventory: (input.merchantInventory as any[])?.map(item => ({
            name: item.name,
            description: item.description,
            rarity: item.rarity,
            price: item.finalGoldValue,
            damage: item.damage,
        })),
    };
    return flowInput;
}


export async function generateAdventureWithOpenRouter(
    input: GenerateAdventureInput,
    combatPrompt?: string
): Promise<GenerateAdventureFlowOutput> {
    const { aiConfig } = input;
    const openRouterConfig = aiConfig?.llm.openRouter;

    if (!openRouterConfig?.apiKey || !openRouterConfig.model) {
        return { error: "Clé API OpenRouter ou nom du modèle manquant.", narrative: "" };
    }

    try {
        const processedInput = await commonAdventureProcessing(input);
        const messages = buildOpenRouterPrompt(processedInput, combatPrompt);
        
        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterConfig.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Aventurier Textuel",
            },
            body: JSON.stringify({
                model: openRouterConfig.model,
                messages: messages,
                // Request JSON object for models that support it
                response_format: { type: "json_object" }
            }),
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
            const narrative = parsedJson.narrative || parsedJson.story || parsedJson.histoire || parsedJson.text || parsedJson.content || parsedJson.argument || "";

            if (!narrative && !input.activeCombat) {
                 return { 
                    narrative: input.userAction, // Fallback to user action
                    error: `La réponse JSON de l'IA ne contient pas de champ narratif valide. Réponse brute: ${content}`,
                 };
            }
            
            // Fix for models returning `null` or incorrect types for optional arrays/objects.
            const cleanedJson = {
                ...parsedJson,
                narrative: narrative,
                newCharacters: Array.isArray(parsedJson.newCharacters) ? parsedJson.newCharacters : [],
                characterUpdates: Array.isArray(parsedJson.characterUpdates) ? parsedJson.characterUpdates : [],
                affinityUpdates: (Array.isArray(parsedJson.affinityUpdates) ? parsedJson.affinityUpdates : []).map((u: any) => ({
                    ...u,
                    change: Math.max(-10, Math.min(10, u.change || 0)), // Clamp affinity change
                })),
                relationUpdates: Array.isArray(parsedJson.relationUpdates) ? parsedJson.relationUpdates : [],
                itemsObtained: Array.isArray(parsedJson.itemsObtained) ? parsedJson.itemsObtained : [], 
                currencyGained: typeof parsedJson.currencyGained === 'number' ? parsedJson.currencyGained : 0,
                poiOwnershipChanges: [], 
                combatUpdates: undefined,
                updatedTime: undefined,
                lootItemsText: parsedJson.lootItemsText || (Array.isArray(parsedJson.itemsObtained) ? parsedJson.itemsObtained.join(', ') : ""),
            };

            const validationResult = GenerateAdventureOutputSchema.safeParse(cleanedJson);

            if (!validationResult.success) {
                console.error("Zod validation failed after cleaning:", validationResult.error.errors);
                // Return the narrative if available, even if other parts fail validation
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

    