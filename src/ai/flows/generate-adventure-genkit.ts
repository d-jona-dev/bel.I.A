
'use server';

/**
 * @fileOverview Generates adventure narratives based on world, initial situation, characters, and user actions.
 * Includes optional RPG context handling and provides scene descriptions for image generation.
 * Detects newly introduced characters, logs significant character events/quotes in the specified language,
 * and calculates changes in character affinity towards the player. Includes dynamic character relation updates (player-NPC and NPC-NPC).
 * Handles combat initiation, turn-based combat narration, enemy actions, rewards (EXP, Loot), HP/MP, and status effects.
 * NPCs can act as merchants, offering items for sale.
 *
 * - generateAdventureWithGenkit - A function that generates adventure narratives using Genkit/Gemini.
 * - GenerateAdventureInput - The input type for the generateAdventure function.
 * - GenerateAdventureOutput - The return type for the generateAdventure function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { Character, PlayerSkill, MapPointOfInterest, AiConfig, GenerateAdventureInput as GenkitFlowInputType, GenerateAdventureOutput, NewCharacterSchema, CombatUpdatesSchema, AffinityUpdateSchema, RelationUpdateSchema, CharacterUpdateSchema, NewFamiliarSchema, Combatant, StatusEffect } from '@/types';
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
  {{#if this.isPlayerTeam}}
- Name: {{this.name}} (Team: Joueur/Allié) - HP: {{this.currentHp}}/{{this.maxHp}} {{#if this.maxMp}}- MP: {{this.currentMp}}/{{this.maxMp}}{{/if}} {{#if this.statusEffects}}(Statuts: {{#each this.statusEffects}}{{this.name}} ({{this.duration}}t){{#unless @last}}, {{/unless}}{{/each}}){{/if}} {{#if this.isDefeated}}(VAINCU){{/if}}
  {{/if}}
{{/each}}
{{#each activeCombat.combatants}}
  {{#if this.isEnemyTeam}}
- Name: {{this.name}} (Team: Ennemi) - HP: {{this.currentHp}}/{{this.maxHp}} {{#if this.maxMp}}- MP: {{this.currentMp}}/{{this.maxMp}}{{/if}} {{#if this.statusEffects}}(Statuts: {{#each this.statusEffects}}{{this.name}} ({{this.duration}}t){{#unless @last}}, {{/unless}}{{/each}}){{/if}} {{#if this.isDefeated}}(VAINCU){{/if}}
  {{/if}}
{{/each}}
{{#if activeCombat.turnLog}}
Previous Turn Summary:
{{#each activeCombat.turnLog}}
- {{{this}}}
{{/each}}
{{/if}}
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
        *   **Nocturnal Hunt Post (poste-chasse-nocturne):** If the user action is specifically to visit this post, you MUST initiate a combat. Create a unique, rare, and ethereal creature for the player to fight. Examples: 'Loup sombre aux lueurs spectrales', 'Hibou grand duc noir aux yeux étoilés', 'Lapin de la nuit avec une fourrure d'obsidienne'. Describe the creature appearing mysteriously. This initiates combat. You MUST populate 'combatUpdates.nextActiveCombatState'. If the player WINS this specific combat, you MUST generate a new familiar in the 'newFamiliars' field, corresponding to the defeated creature. The rarity MUST be determined by a random roll: common (10% chance), uncommon (15%), rare (20%), epic (25%), legendary (30%).
        *   **Archaeology Team (equipe-archeologues):** If the user action is specifically to visit this team, this action IMPERATIVELY triggers an exploration into a dangerous dungeon and a combat. DO NOT narrate a simple meeting with archaeologists. Instead, you MUST narrate the player entering a dangerous part of the dungeon and awakening a powerful creature. **You MUST randomly choose one of the following creatures to be the boss: 'Spectre des Profondeurs', 'Bête de pierre fossilisée', 'Liche Spectrale'.** This initiates combat. You MUST populate 'combatUpdates.nextActiveCombatState'. If the player WINS this specific combat, **you MUST determine the reward by rolling a d5 (a random number from 1 to 5) and award the corresponding item from the list below**. YOU MUST IGNORE ANY THEMATIC LINK between the creature and the reward; the choice must be purely random and mechanical. YOU MUST IMMEDIATELY place the reward in the appropriate structured output field. Narrate that the player finds and takes this reward. DO NOT make the player take another action to get the reward.
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
    *   **COMBAT INITIATION (Only if not already in combat):**
        *   **Is it a Territory Attack?** (e.g., userAction is "J'attaque le lieu X").
            *   **YES:** Start combat. You MUST populate 'combatUpdates.nextActiveCombatState'. The 'combatants' list inside it MUST include the player, ALL characters from the 'Known Characters' list who have 'isAlly: true' and positive HP, and the location's defenders as enemies. You MUST also set 'contestedPoiId' to the ID of the location being attacked.
        *   **Is it a Travel Action?** (e.g., userAction is "Je voyage vers le lieu X").
            *   **YES:** Determine if a random encounter occurs. The presence of a 'poste-gardes' building at the *destination* POI reduces this chance by 75%. Default chance is 30%. If an encounter occurs, start combat. You MUST populate 'combatUpdates.nextActiveCombatState'. The 'combatants' list inside it MUST include the player, ALL characters from the 'Known Characters' list who have 'isAlly: true' and positive HP, and the new hostile NPCs you create for this random encounter. You MUST NOT set 'contestedPoiId'.
        *   **Is it a Capture attempt?** (e.g., userAction is "Je tente de capturer la créature").
            *   **YES:** If you are NOT in combat and an unowned, non-hostile creature is present, you can attempt to capture it as a familiar. Based on a Charisma check (roll a d20, if result + player's charisma modifier > 15), if successful, populate the 'newFamiliars' field with the details of the newly captured familiar. The rarity should be determined by the context (a simple forest animal would be 'common', a mysterious glowing fox might be 'rare'). Give it a random appropriate passive bonus. If it fails, narrate the creature running away or becoming aggressive.
    *   **Skill Use:** If the userAction indicates the use of a skill (e.g., "J'utilise ma compétence : Coup Puissant"), the narrative should reflect the attempt to use that skill and its outcome. If it's a combat skill used in combat, follow combat rules. If it's a non-combat skill (social, utility), describe the character's attempt and how the world/NPCs react. The specific mechanical effects of skills are mostly narrative for now, but the AI should make the outcome logical based on the skill's name and description.
    *   **If NOT in combat AND rpgModeActive is true:**
        *   **Player Buying Item from Merchant:** If userAction indicates buying an item previously listed by a merchant (e.g., "J'achète la Potion de Soin Mineure"):
            1.  Identify the item and its price FROM THE RECENT DIALOGUE HISTORY (initialSituation).
            2.  Conceptually check if {{playerName}} can afford it (using playerGold context).
            3.  If affordable: Narrate the successful purchase. Set currencyGained to the NEGATIVE price of the item. Add the purchased item to itemsObtained with quantity 1 and its details (itemName, itemType, description, effect, goldValue, statBonuses if applicable).
            4.  If not affordable: Narrate that {{playerName}} cannot afford it. Do NOT set currencyGained or itemsObtained for this failed purchase.
        *   **Player Buying NPC from Slave Market:** If userAction indicates buying an NPC from a list you just provided (e.g., "J'achète Kael le Guerrier"):
            1.  Identify the NPC and their price FROM THE RECENT DIALOGUE HISTORY.
            2.  If {{playerName}} can afford it:
                *   Narrate the transaction.
                *   **CRITICAL:** Create a new character for this NPC in the 'newCharacters' array. Give them a name, description, and class based on your previous narration. **You MUST set 'isAlly' to 'true' for this new character.** Also provide basic RPG stats (level 1, HP, etc.).
                *   Set 'currencyGained' to the NEGATIVE price of the NPC.
                *   **DO NOT** add the NPC to 'itemsObtained'. They are a character, not an item.
            3.  If not affordable: Narrate that the player cannot afford them.
        *   **Player Selling to Merchant/NPC:** If userAction indicates selling an item (e.g., "Je vends ma Dague Rouillée"):
            1.  Identify the item. The game system handles player inventory and gold changes.
            2.  Narrate the transaction. If a merchant is present, they might comment on the item or offer a price (this price is purely narrative, the system handles the actual gold value). If no merchant, the item is simply discarded or sold abstractly.
            3.  Do NOT set currencyGained or itemsObtained. This is managed by the game system prior to this call.
        *   **De-escalation:** If {{playerName}} is trying to talk their way out of a potentially hostile situation (e.g., with bullies, suspicious guards) BEFORE combat begins, assess this based on their userAction. Narrate the NPC's reaction based on their affinity, relations, and details. They might back down, demand something, or attack anyway, potentially initiating combat.
    *   **If IN COMBAT (activeCombat.isActive is true) AND rpgModeActive is true - FOLLOW THESE STEPS MANDATORILY:**
        *   **MANDATORY RULE:** If a combat took place this turn (either starting, continuing, or ending), you **MUST** populate the combatUpdates field in your output. This field is the **ONLY** place for all combat-related information.
        *   **1. Narrate the turn:** In combatUpdates.turnNarration, describe the player's action, then any allies' actions, then all enemies' actions. Detail the outcomes, damage, and effects. This text will also be used as the main narrative output.
        *   **2. Update Combatants:** In combatUpdates.updatedCombatants, provide an entry for **every combatant** involved in the turn, with their newHp, newMp, isDefeated status, and any newStatusEffects.
        *   **3. Handle Combat End:** If the combat is over, set combatUpdates.combatEnded to true.
        *   **4. Provide Rewards (if any):** If the combat ended and enemies were defeated, you **MUST** populate the reward fields **INSIDE combatUpdates**:
            *   expGained: The total EXP gained. If none, provide 0.
            *   itemsObtained: A list of all items looted. If none, provide an empty array [].
            *   currencyGained: The total gold/currency looted. If none, provide 0.
        *   **5. Update Combat State:** If combat is NOT over (combatEnded: false), you **MUST** populate combatUpdates.nextActiveCombatState with the full, updated state of all remaining combatants for the next turn.
    *   **Item Acquisition (NON-COMBAT):** If the player finds or is given items outside of combat, list these in the top-level itemsObtained field.
    *   **Currency Management (NON-COMBAT):**
        *   If the player finds/is given/PAYS Gold Pieces outside combat: set the top-level currencyGained field (positive for gain, negative for loss).
        *   **If no currency change, set currencyGained to 0.**

2.  **Identify New Characters (all text in {{currentLanguage}}):** List any newly mentioned characters in newCharacters.
    *   Include 'name', 'details' (with meeting location/circumstance, appearance, perceived role), 'initialHistoryEntry' (e.g. "Rencontré {{../playerName}} à {{location}}.").
    *   Include 'biographyNotes' if any initial private thoughts or observations can be inferred.
    *   {{#if rpgModeActive}}If introduced as hostile or a potential combatant, set isHostile: true/false and provide estimated RPG stats (hitPoints, maxHitPoints, manaPoints, maxManaPoints, armorClass, attackBonus, damageBonus, characterClass, level). Base stats on their description (e.g., "Thug" vs "Dragon", "Apprentice Mage" might have MP). Set isAlly to false unless explicitly stated otherwise in the introduction context. **If the character was purchased at a slave market, you MUST set isAlly to true.**{{/if}}
    *   {{#if relationsModeActive}}Provide 'initialRelations' towards player and known NPCs. Infer specific status (e.g., "Client", "Garde", "Passant curieux") if possible, use 'Inconnu' as last resort. **All relation descriptions MUST be in {{currentLanguage}}.** If a relation is "Inconnu", try to define a more specific one based on the context of their introduction. Example: '[{"targetName": "PLAYER_NAME_EXAMPLE", "description": "Curieux"}, {"targetName": "Rina", "description": "Indifférent"}]'.{{/if}}

3.  **Describe Scene for Image (English):** For sceneDescriptionForImage, visually describe setting, mood, characters (by appearance/role, not name).

4.  **Log Character Updates (in {{currentLanguage}}):** For KNOWN characters, log significant actions/quotes in characterUpdates, including location context if known.

{{#if relationsModeActive}}
5.  **Affinity Updates:** Analyze interactions with KNOWN characters. Update affinityUpdates for changes towards {{playerName}}. Small changes (+/- 1-2) usually, larger (+/- 3-5, max +/-10 for extreme events) for major events. Justify with 'reason'.

6.  **Relation Status Updates (in {{currentLanguage}}):**
    *   Analyze the narrative for significant shifts in how characters view each other ({{playerName}} or other NPCs).
    *   **If a character's affinity towards {{playerName}} crosses a major threshold** (e.g., from neutral to friendly, friendly to loyal, neutral to wary, wary to hostile), consider if their relationship *status* towards {{playerName}} should change.
    *   **If a significant narrative event occurs** (e.g., betrayal, deep act of trust, declaration, prolonged conflict, new alliance forming), update the relationship *status* between the involved characters (NPC-{{playerName}} or NPC-NPC).
    *   **Crucially, if an existing relationship status for a character towards any target ({{playerName}} or another NPC) is 'Inconnu' (or its {{currentLanguage}} equivalent), YOU MUST attempt to define a more specific and descriptive relationship status if the current narrative provides sufficient context.** For example, if they just did business, the status could become 'Client' ou 'Vendeur'. If they fought side-by-side, 'Allié temporaire' or 'Compagnon d'armes'. If one helped the other, 'Reconnaissant envers' or 'Débiteur de'.
    *   Populate relationUpdates with:
        *   characterName: The name of the character whose perspective of the relationship is changing.
        *   targetName: The name of the other character involved (or PLAYER_NAME_EXAMPLE).
        *   newRelation: The NEW, concise relationship status (e.g., 'Ami proche', 'Nouvel Allié', 'Ennemi Déclaré', 'Amant Secret', 'Protecteur', 'Rivale', 'Confident', 'Ex-partenaire', 'Client', 'Employé'). The status MUST be in {{currentLanguage}}. Be creative and contextually appropriate.
        *   reason: A brief justification for the change.
    *   **Example (Player-NPC):** If Rina's affinity for {{playerName}} drops significantly due to a misunderstanding and she acts cold, relationUpdates might include: '{ "characterName": "Rina", "targetName": "PLAYER_NAME_EXAMPLE", "newRelation": "Relation tendue", "reason": "Suite à la dispute au sujet de Kentaro." }'
    *   **Example (NPC-NPC):** If Kentaro openly declares his rivalry with a new character named "Yuki", relationUpdates might include: '{ "characterName": "Kentaro", "targetName": "Yuki", "newRelation": "Rivaux déclarés", "reason": "Confrontation directe au sujet de leurs objectifs opposés." }'
{{else}}
(Affinity and Relation updates are disabled.)
{{/if}}

7.  **Territory Conquest/Loss (poiOwnershipChanges):**
    *   **Conquest:** If combat has ended, and the player's team is victorious, AND if the 'activeCombat.contestedPoiId' field was set for this combat, you MUST change the ownership of that POI to the player.
    *   **Loss:** Similarly, if the narrative results in the player losing a territory they control (e.g., an enemy army retakes it), you MUST change its ownership to the new NPC owner.
    *   To record these changes, populate the 'poiOwnershipChanges' array with an object like: '{ "poiId": "ID_OF_THE_POI_FROM_LIST", "newOwnerId": "ID_OF_THE_NEW_OWNER" }'. The new owner's ID is 'player' for the player.
    
Narrative Continuation (in {{currentLanguage}}):
[Generate ONLY the narrative text here. If combat occurred this turn, this narrative MUST be the same as the combatUpdates.turnNarration field. Do NOT include any other JSON, code, or non-narrative text. Do NOT describe items or gold from combat loot here; the game client displays loot separately from the combatUpdates data.]
`,
});

const generateAdventureFlow = ai.defineFlow(
  {
    name: 'generateAdventureFlow',
    inputSchema: GenerateAdventureInputSchema,
    outputSchema: GenerateAdventureOutputSchema,
  },
  async (input): Promise<GenerateAdventureFlowOutput> => { // Explicitly type the Promise return
    console.log("[LOG_PAGE_TSX] Generating adventure with input:", JSON.stringify(input, null, 2));

    if (input.activeCombat && input.activeCombat.combatants) {
      const mutableCombatants = input.activeCombat.combatants.map(combatant => {
        const augmentedCombatant = { ...combatant } as any;
        augmentedCombatant.isPlayerTeam = combatant.team === 'player';
        augmentedCombatant.isEnemyTeam = combatant.team === 'enemy';
        return augmentedCombatant;
      });
      input.activeCombat = {
        ...input.activeCombat,
        combatants: mutableCombatants
      };
    }

    let aiModelOutput: GenerateAdventureOutput | null = null;
    try {
        const result = await prompt(input);
        aiModelOutput = result.output;

        if (!aiModelOutput?.narrative) {
            console.warn("[LOG_PAGE_TSX] AI Output was null or lacked narrative for generateAdventureFlow. Full AI response:", JSON.stringify(result, null, 2));
            return getDefaultOutput("L'IA n'a pas réussi à générer une structure de réponse valide.");
        }
    } catch (e: any) {
        console.error("Error during AI prompt call in generateAdventureFlow:", e);
        const errorMessage = e.message || String(e);
        if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
            return getDefaultOutput("Le quota de l'API a été dépassé. Veuillez réessayer plus tard.");
        }
        if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
            return getDefaultOutput("Le modèle d'IA est actuellement surchargé. Veuillez réessayer dans quelques instants.");
        }
        return getDefaultOutput(`Une erreur est survenue lors de la génération de l'aventure par l'IA: ${errorMessage}`);
    }


    console.log("[LOG_PAGE_TSX] AI Output (from model):", JSON.stringify(aiModelOutput, null, 2));
    if (aiModelOutput.combatUpdates) {
        console.log("[LOG_PAGE_TSX] Combat Updates from AI:", JSON.stringify(aiModelOutput.combatUpdates, null, 2));
        if (aiModelOutput.combatUpdates.expGained === undefined && input.rpgModeActive) console.warn("AI_WARNING: combatUpdates.expGained is undefined, should be 0 if none");
    }
     if (aiModelOutput.itemsObtained === undefined) {
        console.warn("AI_WARNING: itemsObtained is undefined, should be at least []");
        aiModelOutput.itemsObtained = [];
     }
     if (aiModelOutput.currencyGained === undefined && input.rpgModeActive) {
        console.warn("AI_WARNING: currencyGained is undefined, should be at least 0");
        aiModelOutput.currencyGained = 0;
     }


    if (aiModelOutput.newCharacters) {
        aiModelOutput.newCharacters.forEach(nc => {
            if (nc.details) console.log(`[LOG_PAGE_TSX] New char ${nc.name} details language check (should be ${input.currentLanguage}): ${nc.details.substring(0,20)}`);
            if (nc.initialHistoryEntry) console.log(`[LOG_PAGE_TSX] New char ${nc.name} history language check (should be ${input.currentLanguage}): ${nc.initialHistoryEntry.substring(0,20)}`);
            if (input.relationsModeActive && nc.initialRelations) {
                nc.initialRelations.forEach(rel => {
                     console.log(`[LOG_PAGE_TSX] New char ${nc.name} relation to ${rel.targetName} language check (should be ${input.currentLanguage}): ${String(rel.description).substring(0,20)}`);
                });
            }
        });
    }
    if (aiModelOutput.characterUpdates) {
        aiModelOutput.characterUpdates.forEach(upd => {
            console.log(`[LOG_PAGE_TSX] History update for ${upd.characterName} language check (should be ${input.currentLanguage}): ${upd.historyEntry.substring(0,20)}`);
        });
    }
    if (input.relationsModeActive && aiModelOutput.relationUpdates) {
        aiModelOutput.relationUpdates.forEach(upd => {
             console.log(`[LOG_PAGE_TSX] Relation update for ${upd.characterName} towards ${upd.targetName} language check (should be ${input.currentLanguage}): ${upd.newRelation.substring(0,20)}`);
        });
    }
    if (input.rpgModeActive && aiModelOutput.combatUpdates) {
        console.log("[LOG_PAGE_TSX] Combat Turn Narration (from output.combatUpdates.turnNarration):", aiModelOutput.combatUpdates.turnNarration.substring(0, 100));
        if(aiModelOutput.combatUpdates.nextActiveCombatState) {
            console.log("[LOG_PAGE_TSX] Next combat state active:", aiModelOutput.combatUpdates.nextActiveCombatState.isActive);
            aiModelOutput.combatUpdates.nextActiveCombatState.combatants.forEach(c => {
                 console.log(`[LOG_PAGE_TSX] Combatant ${c.name} - HP: ${c.currentHp}/${c.maxHp}, MP: ${c.currentMp ?? 'N/A'}/${c.maxMp ?? 'N/A'}, Statuses: ${c.statusEffects?.map(s => s.name).join(', ') || 'None'}`);
            });
        }
    }
    if (aiModelOutput.itemsObtained) {
        aiModelOutput.itemsObtained.forEach(item => {
            if (item.description) console.log(`[LOG_PAGE_TSX] Item ${item.itemName} description language check (should be ${input.currentLanguage}): ${item.description.substring(0,20)}`);
            if (item.effect) console.log(`[LOG_PAGE_TSX] Item ${item.itemName} effect language check (should be ${input.currentLanguage}): ${item.effect.substring(0,20)}`);
            if (item.itemType) console.log(`[LOG_PAGE_TSX] Item ${item.itemName} type check: ${item.itemType}`); else console.warn(`Item ${item.itemName} MISSING itemType!`);
            if (item.goldValue === undefined && item.itemType !== 'quest') console.warn(`Item ${item.itemName} MISSING goldValue!`);
            if (item.statBonuses) console.log(`[LOG_PAGE_TSX] Item ${item.itemName} stat bonuses: ${JSON.stringify(item.statBonuses)}`);
        });
    }

    return {...aiModelOutput, error: undefined }; // Add error: undefined for successful case
  }
);


export async function generateAdventureWithGenkit(input: GenkitFlowInputType): Promise<GenerateAdventureFlowOutput> {
    const processedInput = await commonAdventureProcessing(input);
    return generateAdventureFlow(processedInput);
}
