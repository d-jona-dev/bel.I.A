
'use server';

import type { GenerateAdventureInput, GenerateAdventureOutput, GenerateAdventureFlowOutput } from './generate-adventure-genkit';
import { GenerateAdventureInputSchema, GenerateAdventureOutputSchema } from './generate-adventure-genkit';
import { z } from 'zod';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function buildOpenRouterPrompt(input: z.infer<typeof GenerateAdventureInputSchema>): string {
    const promptSections: string[] = [];

    // Helper to add sections only if data exists
    const addSection = (title: string, content: string | undefined | null) => {
        if (content) {
            promptSections.push(`## ${title}\n${content}`);
        }
    };
    
    const addConditionalSection = (condition: boolean, title: string, content: string) => {
        if (condition) {
            promptSections.push(`## ${title}\n${content}`);
        }
    };

    addSection("CONTEXTE GLOBAL (MONDE)", input.world);
    addSection("SITUATION ACTUELLE / ÉVÉNEMENTS RÉCENTS", input.initialSituation);
    
    if (input.rpgModeActive) {
        let playerStats = `Classe: ${input.playerClass || 'N/A'} | Niveau: ${input.playerLevel || 1}\n`;
        playerStats += `HP: ${input.playerCurrentHp}/${input.playerMaxHp}\n`;
        if (input.playerMaxMp) playerStats += `MP: ${input.playerCurrentMp}/${input.playerMaxMp}\n`;
        playerStats += `EXP: ${input.playerCurrentExp}/${input.playerExpToNextLevel}\n`;
        playerStats += `Or: ${input.playerGold}\n`;
        playerStats += `Attributs: FOR:${input.playerStrength}, DEX:${input.playerDexterity}, CON:${input.playerConstitution}, INT:${input.playerIntelligence}, SAG:${input.playerWisdom}, CHA:${input.playerCharisma}\n`;
        playerStats += `Combat: AC:${input.playerArmorClass}, Attaque:+${input.playerAttackBonus}, Dégâts:${input.playerDamageBonus}\n`;
        let equipement = `Équipement: ${input.equippedWeaponName ? `Arme: ${input.equippedWeaponName}`: 'Mains nues'}`;
        if(input.equippedArmorName) equipement += `, Armure: ${input.equippedArmorName}`;
        if(input.equippedJewelryName) equipement += `, Bijou: ${input.equippedJewelryName}`;
        playerStats += equipement;
        addSection(`STATISTIQUES DU JOUEUR (${input.playerName})`, playerStats);
    }
    
    if (input.activeCombat?.isActive) {
        let combatInfo = `Environnement: ${input.activeCombat.environmentDescription}\n`;
        combatInfo += "Combattants:\n";
        input.activeCombat.combatants.forEach(c => {
            combatInfo += `- ${c.name} (Équipe: ${c.team}, HP: ${c.currentHp}/${c.maxHp}${c.currentMp ? `, MP: ${c.currentMp}/${c.maxMp}` : ''}) ${c.isDefeated ? '(VAINCU)' : ''}\n`;
        });
        addSection("COMBAT ACTIF", combatInfo);
    }

    if (input.characters.length > 0) {
        const charactersDesc = input.characters.map(char => {
            let desc = `Nom: ${char.name}\nDescription: ${char.details}\n`;
            if (input.rpgModeActive) {
                 desc += `Classe: ${char.characterClass}, Nv: ${char.level}, HP: ${char.hitPoints}/${char.maxHitPoints}\n`;
            }
            if (input.relationsModeActive) {
                desc += `Affinité (envers ${input.playerName}): ${char.affinity}/100\nRelations: ${char.relationsSummary}\n`;
            }
            desc += `Historique récent: ${char.historySummary}\n`;
            return desc;
        }).join('\n---\n');
        addSection(`PERSONNAGES PRÉSENTS`, charactersDesc);
    } else {
        addSection("PERSONNAGES PRÉSENTS", "Aucun autre personnage n'est présent.");
    }

    addSection(`ACTION DU JOUEUR (${input.playerName})`, input.userAction);

    const mainInstruction = `Tu es un moteur de fiction interactive. Ta tâche est de générer la suite de l'histoire en te basant sur le contexte fourni.
- **Langue de sortie OBLIGATOIRE**: ${input.currentLanguage}.
- **CRITIQUE**: Tu DOIS répondre EXCLUSIVEMENT avec un objet JSON valide qui respecte le schéma Zod suivant. N'ajoute AUCUN texte, explication, ou formatage (comme \`\`\`json) en dehors de l'objet JSON lui-même.
- **IMPORTANT**: Ne narre JAMAIS les actions ou pensées du joueur (nommé "${input.playerName}"). Commence ta narration directement par les conséquences de son action.
- **COHÉRENCE**: Assure une stricte cohérence des personnages (personnalité, affinité, relations, historique).
- **CONQUÊTE**: Si un combat pour un territoire est remporté ('activeCombat.contestedPoiId' était présent), le champ 'poiOwnershipChanges' DOIT être rempli pour transférer la propriété au joueur.`;
    
    promptSections.unshift(mainInstruction);

    // Add JSON schema if structured response is enforced
    if (input.aiConfig?.openRouter?.enforceStructuredResponse) {
        const zodSchemaString = JSON.stringify(GenerateAdventureOutputSchema.shape, null, 2);
        promptSections.push(`## SCHÉMA DE SORTIE JSON ATTENDU\n\`\`\`json\n${zodSchemaString}\n\`\`\``);
    }

    return promptSections.join('\n\n');
}

export async function generateAdventureWithOpenRouter(input: GenerateAdventureInput): Promise<GenerateAdventureFlowOutput> {
    const { aiConfig } = input;

    if (!aiConfig?.openRouter?.apiKey || !aiConfig.openRouter.model) {
        return { error: "Clé API OpenRouter ou nom du modèle manquant.", narrative: "" };
    }

    try {
        const processedInput = await (global as any).commonAdventureProcessing(input);
        const prompt = buildOpenRouterPrompt(processedInput);
        
        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${aiConfig.openRouter.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000", // Example referrer
                "X-Title": "Aventurier Textuel", // Example title
            },
            body: JSON.stringify({
                model: aiConfig.openRouter.model,
                messages: [{ role: "user", content: prompt }],
                ...(aiConfig.openRouter.enforceStructuredResponse ? { response_format: { type: "json_object" } } : {})
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("OpenRouter API Error:", response.status, errorBody);
            return { error: `Erreur de l'API OpenRouter: ${response.status} ${errorBody}`, narrative: "" };
        }

        const jsonResponse = await response.json();
        const content = jsonResponse.choices[0]?.message?.content;

        if (!content) {
            return { error: "La réponse de l'API OpenRouter est vide.", narrative: "" };
        }

        try {
            const parsedJson = JSON.parse(content);
            const validationResult = GenerateAdventureOutputSchema.safeParse(parsedJson);

            if (!validationResult.success) {
                console.error("Zod validation failed:", validationResult.error.errors);
                return {
                    error: `La réponse de l'IA ne respecte pas le format attendu. Erreurs: ${validationResult.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ')}\nRéponse brute: ${content}`,
                    narrative: ""
                };
            }
            
            return { ...validationResult.data, error: undefined };

        } catch (e) {
            console.error("JSON parsing error:", e);
            return { error: `Erreur lors du parsing de la réponse JSON de l'IA. Réponse brute: ${content}`, narrative: "" };
        }

    } catch (error) {
        console.error("Error calling OpenRouter:", error);
        return { error: `Erreur inattendue lors de l'appel à OpenRouter: ${error instanceof Error ? error.message : String(error)}`, narrative: "" };
    }
}
