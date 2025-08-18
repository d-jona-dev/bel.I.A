
'use server';

import type { GenerateAdventureInput, GenerateAdventureOutput, GenerateAdventureFlowOutput } from '@/types';
import { GenerateAdventureInputSchema, GenerateAdventureOutputSchema } from '@/types';
import { z } from 'zod';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function buildOpenRouterPrompt(
    input: z.infer<typeof GenerateAdventureInputSchema>,
    combatPromptTemplate?: string
): any[] {
    
    if (combatPromptTemplate && input.activeCombat?.isActive) {
        // If we have a combat prompt template, we use it directly
        // and replace placeholders.
        let populatedPrompt = combatPromptTemplate;
        
        const combatantsText = input.activeCombat.combatants.map(c => 
            `- ${c.name} (Équipe: ${c.isPlayerTeam ? 'Joueur' : 'Ennemi'}, PV: ${c.currentHp}/${c.maxHp})`
        ).join('\n');

        populatedPrompt = populatedPrompt.replace('{{{combatants}}}', combatantsText);
        populatedPrompt = populatedPrompt.replace('{{{environmentDescription}}}', input.activeCombat.environmentDescription || "un champ de bataille non décrit");
        populatedPrompt = populatedPrompt.replace('{{{userAction}}}', input.userAction);
        populatedPrompt = populatedPrompt.replace('{{{currentLanguage}}}', input.currentLanguage);
        
        return [
            { role: "user", content: populatedPrompt }
        ];
    }
    
    // Fallback to original dynamic prompt builder for non-combat situations
    const promptSections: string[] = [];

    const addSection = (title: string, content: string | undefined | null) => {
        if (content) {
            promptSections.push(`## ${title}\n${content}`);
        }
    };
    
    addSection("CONTEXTE GLOBAL (MONDE)", input.world);
    addSection("SITUATION ACTUELLE / ÉVÉNEMENTS RÉCENTS", input.initialSituation);

    if (input.timeManagement?.enabled) {
        promptSections.push(`--- TIME & EVENT CONTEXT ---\n...`); // Simplified for brevity
    }

    if (input.characters.length > 0) {
        const charactersDesc = input.characters.map(char => `Nom: ${char.name}, Description: ${char.details}, Affinité: ${char.affinity}/100`).join('\n');
        addSection(`PERSONNAGES PRÉSENTS`, charactersDesc);
    }

    addSection(`ACTION DU JOUEUR (${input.playerName})`, input.userAction);

    let mainInstruction = `Tu es un moteur de fiction interactive. Ta tâche est de générer la suite de l'histoire en te basant sur le contexte fourni. La langue de sortie OBLIGATOIRE est: ${input.currentLanguage}. Ne narre JAMAIS les actions ou pensées du joueur (nommé "${input.playerName}"). Commence ta narration directement par les conséquences de son action.`;
    
    let systemPromptContent = `Tu es un moteur narratif. À chaque requête, tu dois renvoyer STRICTEMENT un objet JSON avec la structure spécifiée dans le message utilisateur. Ne réponds avec AUCUN texte en dehors de l'objet JSON.`;
    
    mainInstruction += `\nTu DOIS répondre EXCLUSIVEMENT avec un objet JSON valide qui respecte le schéma Zod suivant.`;

    const jsonSchemaExample = `{
        "narrative": "Une description vivante et littéraire des événements.",
        "sceneDescriptionForImage": "Une description purement visuelle de la scène pour une IA génératrice d'images.",
        "newCharacters": [],
        "characterUpdates": [],
        "affinityUpdates": [],
        "relationUpdates": [],
        "combatUpdates": null,
        "itemsObtained": [],
        "currencyGained": 0,
        "poiOwnershipChanges": [],
        "newFamiliars": [],
        "updatedTime": null
    }`;
    promptSections.push(`## SCHÉMA DE SORTIE JSON ATTENDU\n\`\`\`json\n${jsonSchemaExample}\n\`\`\``);
    
    promptSections.unshift(mainInstruction);

    return [
        { role: "system", content: systemPromptContent },
        { role: "user", content: promptSections.join('\n\n') }
    ];
}

async function commonAdventureProcessing(input: GenerateAdventureInput): Promise<z.infer<typeof GenerateAdventureInputSchema>> {
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
                ...(openRouterConfig.enforceStructuredResponse ? { response_format: { type: "json_object" } } : {})
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
            
            // Fix for models returning `null` for optional objects.
            if (parsedJson.combatUpdates === null) delete parsedJson.combatUpdates;
            if (parsedJson.updatedTime === null) delete parsedJson.updatedTime;

            const validationResult = GenerateAdventureOutputSchema.safeParse(parsedJson);

            if (!validationResult.success) {
                console.error("Zod validation failed:", validationResult.error.errors);
                const narrative = typeof parsedJson.narrative === 'string' ? parsedJson.narrative : content;
                return {
                    error: `La réponse de l'IA ne respecte pas le format attendu. Erreurs: ${validationResult.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ')}\nRéponse brute: ${content}`,
                    narrative: narrative
                };
            }
            
            return { ...validationResult.data, error: undefined };

        } catch (e) {
            console.error("JSON parsing error:", e);
             return { 
                narrative: content,
                sceneDescriptionForImage: content.substring(0, 200),
                error: `Erreur lors du parsing de la réponse JSON de l'IA.`,
             };
        }

    } catch (error) {
        console.error("Error calling OpenRouter:", error);
        return { error: `Erreur inattendue lors de l'appel à OpenRouter: ${error instanceof Error ? error.message : String(error)}`, narrative: "" };
    }
}
