
'use server';

/**
 * @fileOverview Generates adventure narratives based on world, initial situation, characters, and user actions.
 * Includes optional RPG context handling and provides scene descriptions for image generation.
 * Detects newly introduced characters, logs significant character events/quotes in the specified language,
 * and calculates changes in character affinity towards the player. Includes dynamic character relation updates (player-NPC and NPC-NPC).
 * Handles combat initiation, turn-based combat narration, enemy actions, rewards (EXP, Loot), HP/MP, and status effects.
 * NPCs can act as merchants, offering items for sale.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { Character, PlayerSkill, MapPointOfInterest, AiConfig, GenerateAdventureInput as GenkitFlowInputType, GenerateAdventureOutput, NewCharacterSchema as FlowNewCharacterSchema, CombatUpdatesSchema, AffinityUpdateSchema, RelationUpdateSchema, CharacterUpdateSchema, NewFamiliarSchema, Combatant, StatusEffect } from '@/types';
import { GenerateAdventureInputSchema, GenerateAdventureOutputSchema, RpgContextSchema, CharacterWithContextSummarySchema, ActiveCombatSchema } from '@/types';


// Modified return type for the flow and its wrapper
export type GenerateAdventureFlowOutput = GenerateAdventureOutput & { error?: string };

const getDefaultOutput = (errorMsg?: string): GenerateAdventureFlowOutput => ({
    narrative: errorMsg ? "" : "An error occurred, narrative could not be generated.",
    sceneDescriptionForImage: undefined,
    newCharacters: [],
    characterUpdates: [],
    affinityUpdates: [],
    relationUpdates: [],
    combatUpdates: undefined,
    itemsObtained: [],
    currencyGained: 0,
    poiOwnershipChanges: [],
    newFamiliars: [],
    error: errorMsg,
});


async function commonAdventureProcessing(input: GenkitFlowInputType): Promise<z.infer<typeof GenerateAdventureInputSchema>> {
    const processedCharacters: z.infer<typeof CharacterWithContextSummarySchema>[] = input.characters.map(char => {
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
            isAlly: input.rpgModeActive ? (char.isAlly ?? false) : false, // Pass isAlly
            spells: char.spells, // Pass spells,
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

const prompt = ai.definePrompt({
  name: 'generateAdventurePrompt',
  input: {
    schema: GenerateAdventureInputSchema,
  },
  output: {
    schema: GenerateAdventureOutputSchema,
  },
  prompt: `You are an interactive fiction engine. Weave a cohesive and engaging story based on the context provided. The player character's name is **{{playerName}}**. The target language for ALL textual outputs (narrative, character details, history entries, relation descriptions, item details) is **{{currentLanguage}}**.

**Overall Goal: Maintain strict character consistency. Characters' dialogues, actions, and reactions MUST reflect their established personality, history, affinity, and relationships as detailed below. Ensure narrative continuity from the 'Current Situation/Recent Narrative'. Their style of speech (vocabulary, tone, formality) MUST also be consistent with their persona.**
**The player ({{playerName}}) makes ALL decisions for their character. DO NOT narrate actions or thoughts for {{playerName}} that they haven't explicitly stated in 'User Action'. Only narrate the consequences of their action and the reactions of NPCs and the environment.**
**Start the narrative directly from the consequences of the user's action. DO NOT repeat or summarize the user's action.**

World: {{{world}}}

Current Situation/Recent Narrative:
{{{initialSituation}}}

{{#if timeManagement.enabled}}
--- TIME & EVENT CONTEXT ---
Current Day: **Jour {{timeManagement.day}} ({{timeManagement.dayName}})**
Current Time: **{{timeManagement.currentTime}}**
Current Event: **{{timeManagement.currentEvent}}**
Time to Elapse This Turn: **{{timeManagement.timeElapsedPerTurn}}**. 
**CRITICAL RULE: Your narrative MUST strictly cover the duration specified in 'Time to Elapse This Turn'. DO NOT skip large amounts of time. DO NOT write "several hours pass" or "the meeting ends". The narrative must advance by exactly the specified duration (e.g., if duration is '00:15', narrate the next 15 minutes). The application will handle the calculation of the new time; you can suggest a new event description in 'updatedTime.newEvent' if the context changes (e.g. from "Début de la patrouille" to "Milieu de la patrouille").**
---
{{/if}}

{{#if playerFaceSwapEnabled}}
--- FACESWAP CONTEXT ---
**IMPORTANT RULE FOR FACESWAP: The player's face is provided as a reference. You MUST use this face for the player character, {{playerName}}, in the generated scene. Faithfully reproduce the face shape, hair color, hair style, and eye color from the reference image, but seamlessly adapt it to the scene's artistic style, lighting, and character pose.**
Player Face Reference: {{media url=playerPortraitUrl}}
---
{{/if}}

{{#each characters}}
{{#if this.faceSwapEnabled}}
--- FACESWAP CONTEXT for {{this.name}} ---
**IMPORTANT RULE FOR FACESWAP: The face for {{this.name}} is provided as a reference. You MUST use this face for this character in the generated scene. Faithfully reproduce the face shape, hair color, hair style, and eye color from the reference image, but seamlessly adapt it to the scene's artistic style, lighting, and character pose.**
{{this.name}}'s Face Reference: {{media url=this.portraitUrl}}
---
{{/if}}
{{/each}}


{{#if rpgModeActive}}
--- Player Stats ({{playerName}}) ---
Class: {{playerClass}} | Level: {{playerLevel}}
HP: {{playerCurrentHp}}/{{playerMaxHp}}
{{#if playerMaxMp}}MP: {{playerCurrentMp}}/{{playerMaxMp}} (MP regenerates by 1 each turn if below max and used){{/if}}
EXP: {{playerCurrentExp}}/{{playerExpToNextLevel}}
Gold Pieces: {{playerGold}}
Attributes: FOR:{{playerStrength}}, DEX:{{playerDexterity}}, CON:{{playerConstitution}}, INT:{{playerIntelligence}}, SAG:{{playerWisdom}}, CHA:{{playerCharisma}}
Combat Stats: AC:{{playerArmorClass}}, Attaque: +{{playerAttackBonus}}, Dégâts: {{playerDamageBonus}}
Équipement: {{#if equippedWeaponName}}Arme: {{equippedWeaponName}}{{else}}Arme: Mains nues{{/if}}{{#if equippedArmorName}}, Armure: {{equippedArmorName}}{{/if}}{{#if equippedJewelryName}}, Bijou: {{equippedJewelryName}}{{/if}}
{{#if playerSkills.length}}
Compétences:
{{#each playerSkills}}
- {{this.name}}: {{this.description}} ({{this.category}})
{{/each}}
{{/if}}
---
{{/if}}

{{#if activeCombat.isActive}}
--- COMBAT ACTIVE ---
{{#if activeCombat.contestedPoiId}}
**Territory Under Attack:** {{activeCombat.contestedPoiId}}
{{/if}}
Environment: {{activeCombat.environmentDescription}}
Combatants (Player team listed first, then Enemies):
{{#each activeCombat.combatants}}
- Name: {{this.name}} (Team: {{this.team}}) - HP: {{this.currentHp}}/{{this.maxHp}} {{#if this.maxMp}}- MP: {{this.currentMp}}/{{this.maxMp}}{{/if}} {{#if this.statusEffects}}(Statuts: {{#each this.statusEffects}}{{this.name}} ({{this.duration}}t){{#unless @last}}, {{/unless}}{{/each}}){{/if}} {{#if this.isDefeated}}(VAINCU){{/if}}
{{/each}}
**Combat Rules: An external system handles all dice rolls, hits, misses, and damage calculations. Your role is purely NARRATIVE.**
**Your Task:** Narrate the scene based on the 'User Action'. The user action will be a summary of the turn's events (e.g., "Héros touche Gobelin et inflige 5 points de dégâts. Gobelin attaque Héros et rate.").
**DO NOT invent or describe outcomes. The user action is the source of truth. Just make it sound good. DO NOT mention hit/miss, damage numbers, or any mechanical results. The user action already contains the summary.**
--- END COMBAT INFO ---
{{/if}}

**Characters Present at Current Location ({{playerLocation.name}}):**
{{#each characters}}
- Name: {{this.name}}
  Description: {{this.details}}
  {{#if this.biographyNotes}}
  Biographie/Notes (pour contexte interne, ne pas révéler directement): {{{this.biographyNotes}}}
  {{/if}}
  {{#if ../rpgModeActive}}
  Class: {{this.characterClass}} | Level: {{this.level}}
  HP: {{this.hitPoints}}/{{this.maxHitPoints}} {{#if this.maxManaPoints}}| MP: {{this.manaPoints}}/{{this.maxManaPoints}}{{/if}} | AC: {{this.armorClass}} | Attack: {{this.attackBonus}} | Damage: {{this.damageBonus}}
  Hostile: {{#if this.isHostile}}Yes{{else}}No{{/if}} | Ally: {{#if this.isAlly}}Yes{{else}}No{{/if}}
  {{#if this.spells}}Spells: {{#each this.spells}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{/if}}
  {{#if ../relationsModeActive}}
  Current Affinity towards {{../playerName}}: **{{this.affinity}}/100**. Behavior Guide:
    0-10 (Deep Hate/Dégout Total): Actively hostile, seeks harm, betrayal, openly insulting or threatening. Will refuse any cooperation. May attack without direct provocation if opportunity arises. Their dialogue is filled with venom and contempt.
    11-30 (Hostile/Conflit Ouvert): Disdainful, obstructive, may attack if provoked or if it aligns with their goals. Argumentative, sarcastic, unhelpful. Will likely try to undermine {{../playerName}}. Dialogue is aggressive and dismissive.
    31-45 (Wary/Dislike/Méfiance Forte): Suspicious, uncooperative, negative remarks, avoids interaction if possible. Reluctantly complies if forced or heavily incentivized. Dialogue is curt, untrusting, and may contain veiled threats or warnings.
    46-55 (Neutral/Indifférent): Indifferent, formal, or business-like. Interaction is purely transactional or based on necessity. No personal investment. Dialogue is matter-of-fact and lacks warmth.
    56-70 (Friendly/Amical): Helpful, agreeable, positive remarks, willing to share some information or small aid. Generally pleasant and open to {{../playerName}}. Dialogue is warm and cooperative.
    71-90 (Loyal/Like/Forte Appréciation): Trusting, supportive, seeks player's company, protective, offers significant help or advice. Shares personal thoughts or concerns. Dialogue is genuinely caring and enthusiastic. May defend {{../playerName}}.
    91-100 (Devoted/Love/Dévotion Absolue): Deep affection, self-sacrificing, strong emotional connection. May confess feelings (if appropriate to character/story) or make grand gestures. Prioritizes player's well-being above all. Dialogue is deeply personal, loving, and extremely supportive.
  Relationship Statuses: {{{this.relationsSummary}}}. These define the *nature* of the bond (e.g., {{../playerName}}: Petite amie; Kentaro: Ami proche). If a relation is "Inconnu", try to define it based on current interactions.
  {{else}}
  (Relations and affinity mode is disabled. Character behavior based on description and narrative context only.)
  {{/if}}
  History (summary): {{{this.historySummary}}}
  **IMPORTANT: When this character speaks or acts, their words, tone, and decisions MUST be consistent with their Description, Biographie/Notes, Affinity towards {{../playerName}}, their Relationship Statuses with others, and their recent History. Their style of speech (vocabulary, tone, formality) must also align. They should react logically to the User Action and the Current Situation.**
{{else}}
**No other characters are currently present.**
{{/each}}

{{#if playerLocation}}
--- CURRENT LOCATION CONTEXT ---
Location Name: **{{playerLocation.name}}** (ID: {{playerLocation.id}})
Current Owner: **{{playerLocation.ownerName}}**
Location Level: {{playerLocation.level}}
Description: {{playerLocation.description}}
{{#if playerLocation.buildings.length}}
Available Services: {{#each playerLocation.buildings}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.
{{else}}
There are no special buildings or services in this location.
{{/if}}
**Your narrative, including NPC dialogue, MUST reflect the status and ownership of this location. For example, if the location level is high (e.g., 6, a 'Métropole'), NPCs MUST NOT refer to it as a 'petit patelin' (small village). For example, a blacksmith in "Bourgenval" (a Level 6 metropolis owned by {{../playerName}}) might say, 'Bienvenue dans ma forge, puissant(e) {{../playerName}} ! En tant que dirigeant(e) de cette grande métropole de Bourgenval, vous ne trouverez que les meilleures lames ici !' instead of 'Bourgenval n'est qu'un village, pas une capitale regorgeant de trésors oubliés'. They must acknowledge the owner.**
---
{{else}}
--- CURRENT LOCATION CONTEXT ---
Player is currently travelling or in an unspecified location.
---
{{/if}}

User Action (from {{playerName}}): {{{userAction}}}

**CRITICAL RULE: BUILDING AND SERVICE AVAILABILITY CHECK:**
If the 'User Action' implies interaction with a specific service or building type (e.g., 'Je vais chez le forgeron', 'Je cherche une auberge pour la nuit', 'Je visite le bijoutier', 'Je vais au marché aux esclaves', 'Je visite la ménagerie', 'Je visite le poste de chasse nocturne', 'Je visite l'équipe d'archéologues'):
*   **STEP 1: Identify Required Building.** Determine the required building ID (e.g., 'forgeron', 'auberge', 'quartier-esclaves', 'menagerie', 'poste-chasse-nocturne', 'equipe-archeologues').
*   **STEP 2: Check for Building.** **You MUST strictly refer to the 'CURRENT LOCATION CONTEXT' section above.** Check if the required building ID is listed under 'Available Services'.
*   **STEP 3: Respond.**
    *   **If the required building ID IS NOT found:** You MUST state that the service is unavailable and why. For example: 'Il n'y a pas de forgeron ici à Bourgenval.', 'Vous ne trouvez aucune auberge dans ce village.' Then, stop. Do not proceed to narrate the interaction.
    *   **If the required building ID IS found:** Proceed with the interaction.
        *   **Nocturnal Hunt Post (poste-chasse-nocturne):** If the user action is specifically to visit this post, you MUST initiate a combat. Create a unique, rare, and ethereal creature for the player to fight. Examples: 'Loup sombre aux lueurs spectrales', 'Hibou grand duc noir aux yeux étoilés', 'Lapin de la nuit avec une fourrure d'obsidienne'. Describe the creature appearing mysteriously. This initiates combat. **This is a special rule. The game engine handles combat, but you MUST populate 'combatUpdates' in the JSON output to tell the engine to start combat.** If the player WINS this specific combat, you MUST generate a new familiar in the 'newFamiliars' field, corresponding to the defeated creature. The rarity MUST be determined by a random roll: common (10% chance), uncommon (15%), rare (20%), epic (25%), legendary (30%).
        *   **Archaeology Team (equipe-archeologues):** If the user action is specifically to visit this team, this action IMPERATIVELY triggers an exploration into a dangerous dungeon and a combat. DO NOT narrate a simple meeting with archaeologists. Instead, you MUST narrate the player entering a dangerous part of the dungeon and awakening a powerful creature. **You MUST randomly choose one of the following creatures to be the boss: 'Spectre des Profondeurs', 'Bête de pierre fossilisée', 'Liche Spectrale'.** This initiates combat. **This is a special rule. The game engine handles combat, but you MUST populate 'combatUpdates' in the JSON output to tell the engine to start combat.** If the player WINS this specific combat, **you MUST determine the reward by rolling a d5 (a random number from 1 to 5) and award the corresponding item from the list below**. YOU MUST IGNORE ANY THEMATIC LINK between the creature and the reward; the choice must be purely random and mechanical. YOU MUST IMMEDIATELY place the reward in the appropriate structured output field. Narrate that the player finds and takes this reward. DO NOT make the player take another action to get the reward.
            *   **1 (Legendary Equipment):** Generate ONE legendary item (weapon or armor). Example: 'Lame des Abysses', 'Armure des Titans'. Populate 'itemsObtained'.
            *   **2 (Epic Equipment):** Generate ONE epic item. Example: 'Hache runique', 'Plastron en ébonite'. Populate 'itemsObtained'.
            *   **3 (Gold):** Grant a large sum of gold between 1000 and 5000. Populate 'currencyGained'.
            *   **4 (Ancient Scroll):** Grant a single-use quest item named 'Parchemin Ancien'. Its description should be a powerful, unique spell (e.g., 'Invocation de Golem de Pierre', 'Pluie de Météores'). Populate 'itemsObtained'.
            *   **5 (Lost Familiar):** Generate a new familiar from the depths (e.g., 'Chauve-souris des Cavernes', 'Araignée de Cristal Géante'). Populate 'newFamiliars'.
        *   **Merchant Interaction (forgeron, bijoutier, magicien):** If the user is visiting a merchant, you MUST create a unique NPC merchant for this interaction if one is not already present. Narrate the encounter with this merchant. Then, **you MUST generate a list of 3-5 thematically appropriate items for sale**. The quality and price of these items MUST depend on the **'Location Level' provided in the 'CURRENT LOCATION CONTEXT'**.
            *   **MANDATORY ITEM QUALITY TIERS (BY LOCATION LEVEL):**
            *   **Level 1-2:** 'Basique', 'Commun'. Simple, slightly worn, or basic materials (e.g., 'Dague Rouillée', 'Tunique en cuir simple', 'Potion de soin mineure').
            *   **Level 3-4:** 'Bonne qualité', 'Solide', 'Efficace'. Well-made, standard materials (e.g., 'Épée en fer', 'Armure de mailles', 'Amulette de vitalité (+5 PV)').
            *   **Level 5-6:** 'Chef-d'œuvre', 'Magique', 'Rare', 'Épique', 'Légendaire'. Exceptional craftsmanship, enchanted, rare materials (e.g., 'Lame runique de givre', 'Armure en plaques de mithril', 'Anneau de régénération').
            *   You MUST follow these quality tiers. A level 6 metropolis **CANNOT** sell rusty daggers. A level 1 village **CANNOT** sell legendary items.
            *   The items MUST be presented in the format: 'NOM_ARTICLE (EFFET) : PRIX Pièces d'Or'. Finally, include the line: 'N'achetez qu'un objet à la fois, Aventurier.'
        *   **Resting (auberge):** If the user rests, narrate it. Set 'currencyGained' to -10 (the cost of the room). This should fully restore HP and MP.
        *   **Healing (poste-guerisseur):** Narrate the healing. This is for narrative flavor, the mechanical healing from using items is handled elsewhere.
        *   **Slave Market (quartier-esclaves):** If the user is visiting the slave market, **you MUST create 1 to 3 unique NPCs for sale**. Each NPC MUST have a name, a brief description (e.g., 'Guerrier vétéran', 'Mage agile'), a character class, and a price in Gold Pieces. Present them in the format: 'NOM (CLASSE - DESCRIPTION) : PRIX Pièces d'Or'.
        *   **Ménagerie (menagerie):** If the user is visiting a menagerie, you MUST create a unique NPC handler/owner. Narrate the encounter. Then, you MUST generate a list of 1-3 unique **familiars for sale**. The rarity of the familiar (common, uncommon, rare, epic, legendary) and its associated bonus MUST depend on the **'Location Level'**.
            *   **MANDATORY FAMILIAR RARITY/QUALITY TIERS (BY LOCATION LEVEL):**
            *   **Level 1-2:** 'Common'. Basic creatures (e.g., Chat de ferme, Chien loyal). Bonus is simple (e.g., +1 à une stat).
            *   **Level 3-4:** 'Uncommon' or 'Rare'. More capable creatures (e.g., Loup des neiges, Faucon dressé, Familier élémentaire mineur). Bonus is more significant (e.g., +3 à une stat, +5% d'or trouvé).
            *   **Level 5-6:** 'Epic' or 'Legendary'. Powerful, mythical creatures (e.g., Bébé dragon, Golem runique, Phénix naissant). Bonus is strong and unique (e.g., +5 à toutes les stats, régénération de PM).
            *   **CRITICAL:** The item for sale MUST be the familiar itself, NOT a container. The item name should be the familiar's name (e.g., 'Bébé Griffon'). The item's description and effect MUST detail the familiar's rarity and passive bonus. For example, for a 'Chat de Ferme' item, its description could be 'Un familier de type Chat de ferme. Rareté: common.' and its effect could be 'Bonus passif : +1 en Dextérité.'. The item's type must be 'misc'.
            *   The items MUST be presented in the format: 'NOM_ARTICLE : PRIX Pièces d'Or'. The price MUST reflect the rarity.


Tasks:
1.  **Generate the "Narrative Continuation" (in {{currentLanguage}}):** Write the next part of the story. 
    *   **If 'activeCombat.isActive' is true:** Narrate the turn based on the \`userAction\` which is a turn log.
    *   **If NOT in combat AND rpgModeActive is true:**
        *   **Player Buying Item from Merchant:** If userAction indicates buying an item (e.g., "J'achète la Potion"): Identify the item and price from recent dialogue history. If affordable, narrate success, set \`currencyGained\` to the NEGATIVE price, and add item to \`itemsObtained\`. If not affordable, narrate failure.
        *   **Player Buying NPC from Slave Market:** If userAction indicates buying an NPC, check affordability. If yes, narrate, create the NPC in \`newCharacters\` with \`isAlly: true\`, and set \`currencyGained\` to the NEGATIVE price.
        *   **Player Selling to Merchant/NPC:** Narrate the transaction. The game system handles inventory/gold changes. Do NOT set \`currencyGained\` or \`itemsObtained\`.

2.  **Identify New Characters (all text in {{currentLanguage}}):** List any newly mentioned characters in \`newCharacters\`. Include name, details, portraitUrl, biographyNotes, and \`initialHistoryEntry\`. If RPG mode, set \`isHostile\` and base stats. If bought, set \`isAlly: true\`. If relations mode, set \`initialRelations\`.

3.  **Describe Scene for Image (English):** For \`sceneDescriptionForImage\`, visually describe setting, mood, and characters by appearance, not name.

4.  **Log Character Updates (in {{currentLanguage}}):** For KNOWN characters, log significant actions/quotes in \`characterUpdates\`. Format MUST be \`[{"characterName": "Rina", "historyEntry": "A semblé troublée..."}]\`.

{{#if relationsModeActive}}
5.  **Affinity Updates:** Analyze interactions with KNOWN characters. Update \`affinityUpdates\` for changes towards {{playerName}}. Small changes (+/- 1-2) usually, larger (+/- 3-5, max +/-10 for extreme events). Justify with 'reason'.

6.  **Relation Status Updates (in {{currentLanguage}}):** Analyze the narrative for significant shifts in how characters view each other. If affinity crosses a major threshold or a significant event occurs, update \`relationUpdates\` with \`characterName\`, \`targetName\`, \`newRelation\`, and \`reason\`. If an existing relation is 'Inconnu', define it if possible.
{{/if}}

7.  **Territory Conquest/Loss (poiOwnershipChanges):** If you narrate a successful conquest, record it in \`poiOwnershipChanges\` with \`{ "poiId": "ID_OF_THE_POI", "newOwnerId": "player" }\`.

{{#if timeManagement.enabled}}
8.  **Time Update:** Suggest a new event description in 'updatedTime.newEvent' if the context has changed significantly.
{{/if}}

**VERY IMPORTANT: You are no longer responsible for calculating combat outcomes. The game engine does that. Your ONLY job in combat is to narrate the provided turn log. DO NOT populate \`combatUpdates\` in your JSON response.**

Narrative Continuation (in {{currentLanguage}}):
[Generate ONLY the narrative text here. Do NOT include any JSON, code, or non-narrative text. Do NOT describe items or gold from combat loot here; a game client displays loot separately from the structured data.]
`,
});

export async function generateAdventureWithGenkit(input: GenkitFlowInputType): Promise<GenerateAdventureFlowOutput> {
    try {
        const processedInput = await commonAdventureProcessing(input);
        const { output } = await prompt(processedInput);
        
        if (!output) {
            return getDefaultOutput("AI response was empty.");
        }
        
        return { ...output, error: undefined };

    } catch (e: any) {
        console.error("Error in generateAdventureWithGenkit flow:", e);
        const errorMessage = e.message || String(e);

        if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
            return getDefaultOutput("Le quota de l'API a été dépassé. Veuillez réessayer plus tard.");
        }
        if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
            return getDefaultOutput("Le modèle d'IA est actuellement surchargé. Veuillez réessayer.");
        }
        if (e.cause && typeof e.cause === 'string' && e.cause.includes('INVALID_ARGUMENT')) {
            return getDefaultOutput(`Erreur de prompt : un des champs contient des données invalides pour l'IA. Détails: ${e.message}`);
        }
        
        return getDefaultOutput(`Une erreur inattendue est survenue: ${errorMessage}`);
    }
}

    