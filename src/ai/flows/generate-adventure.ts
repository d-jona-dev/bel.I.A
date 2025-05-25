
'use server';

/**
 * @fileOverview Generates adventure narratives based on world, initial situation, characters, and user actions.
 * Includes optional RPG context handling and provides scene descriptions for image generation.
 * Detects newly introduced characters, logs significant character events/quotes in the specified language,
 * and calculates changes in character affinity towards the player. Includes dynamic character relation updates (player-NPC and NPC-NPC).
 * Handles combat initiation, turn-based combat narration, enemy actions, rewards (EXP, Loot), HP/MP, and status effects.
 *
 * - generateAdventure - A function that generates adventure narratives.
 * - GenerateAdventureInput - The input type for the generateAdventure function.
 * - GenerateAdventureOutput - The return type for the generateAdventure function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { Character } from '@/types'; // Import Character type
import { LootedItemSchema } from '@/types'; // Import LootedItemSchema from types


// Define RPG context schema (optional)
const RpgContextSchema = z.object({
    playerStats: z.object({
        Name: z.string().optional(),
        Class: z.string().optional(),
        Level: z.number().optional(),
        HP: z.string().optional().describe("Player HP, e.g., '15/20'"),
        MP: z.string().optional().describe("Player MP, e.g., '10/10' or 'N/A'"),
        EXP: z.string().optional().describe("Player EXP, e.g., '50/100'"),
    }).optional().describe("Player character's statistics (e.g., HP, MP, STR)."),
    characterDetails: z.array(z.object({
        name: z.string(),
        details: z.string().optional().describe("Brief description of the character for context."),
        stats: z.record(z.union([z.string(), z.number()])).optional().describe("Character's statistics."),
        inventory: z.record(z.string(), z.number()).optional().describe("Character's inventory (item name: quantity)."),
        relations: z.string().optional().describe("Summary of relations towards player and others.")
    })).optional().describe("Details of relevant secondary characters already known."),
    mode: z.enum(["exploration", "dialogue", "combat"]).optional().describe("Current game mode."),
}).optional();

const BaseCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  details: z.string(),
  biographyNotes: z.string().optional().describe("Detailed biography or private notes about the character. Provides deep context for personality and motivations. MUST be in the specified language if provided from user input in that language."),
  affinity: z.number().optional().default(50).describe("Affinity score (0-100) indicating the character's feeling towards the player. 0=Hate, 50=Neutral, 100=Love/Devotion. This score dictates the character's baseline behavior and responses toward the player. Small, gradual changes for typical interactions (+/- 1-2), larger changes (+/- 5+) for major events."),
  relations: z.record(z.string(), z.string()).optional().describe("Relationship status towards other characters/player (key: character ID or 'player', value: status e.g., 'Petite amie', 'Meilleur ami', 'Ennemi juré'). This status describes the fundamental nature of their bond (e.g., family, rival, lover) and influences specific interactions. MUST be in the specified language. If 'Inconnu' or similar, attempt to define it based on new interactions."),
  // RPG Stats for combat
  hitPoints: z.number().optional().describe("Current Hit Points. If undefined in RPG mode, assume a default like 10."),
  maxHitPoints: z.number().optional().describe("Maximum Hit Points. If undefined in RPG mode, assume a default like 10."),
  manaPoints: z.number().optional().describe("Current Mana Points. If undefined in RPG mode for a spellcaster, assume a default like 10 if applicable, or 0."),
  maxManaPoints: z.number().optional().describe("Maximum Mana Points. If undefined in RPG mode for a spellcaster, assume a default like 10 if applicable, or 0."),
  armorClass: z.number().optional().describe("Armor Class. If undefined in RPG mode, assume a default like 10."),
  attackBonus: z.number().optional().describe("Bonus to attack rolls. If undefined, assume 0."),
  damageBonus: z.string().optional().describe("Damage bonus, e.g., '+2' or '1d4'. If undefined, assume basic unarmed damage (e.g., 1d3 or 1)."),
  characterClass: z.string().optional().describe("Character's class, e.g., 'Warrior', 'Mage'."),
  level: z.number().optional().describe("Character's level."),
  isHostile: z.boolean().optional().default(false).describe("Is the character currently hostile to the player?"),
  inventory: z.record(z.string(), z.number()).optional().describe("Character's inventory (item name: quantity)."),
}).passthrough();


const ContextSummarySchema = z.object({
    historySummary: z.string().optional().describe('A brief summary of the last few history entries.'),
    relationsSummary: z.string().optional().describe('A pre-processed summary of the character\'s relationship statuses for prompt context. MUST be in the specified language.'),
});

const CharacterWithContextSummarySchema = z.intersection(
    BaseCharacterSchema,
    ContextSummarySchema
);

type CharacterWithContextSummary = z.infer<typeof CharacterWithContextSummarySchema>;

// Combat Schemas
const StatusEffectSchema = z.object({
  name: z.string().describe("Name of the status effect (e.g., 'Poisoned', 'Stunned')."),
  description: z.string().describe("Brief description of the effect (e.g., 'Takes 1d4 damage per turn', 'Cannot act')."),
  duration: z.number().int().describe("Remaining duration in turns. -1 for permanent or until cured."),
});
export type StatusEffect = z.infer<typeof StatusEffectSchema>;


const CombatantSchema = z.object({
    characterId: z.string().describe("ID of the character or 'player'."),
    name: z.string().describe("Name of the combatant."),
    currentHp: z.number().describe("Current HP of the combatant."),
    maxHp: z.number().describe("Maximum HP of the combatant."),
    currentMp: z.number().optional().describe("Current MP of the combatant if applicable."),
    maxMp: z.number().optional().describe("Maximum MP of the combatant if applicable."),
    team: z.enum(['player', 'enemy', 'neutral']).describe("Team alignment."),
    isDefeated: z.boolean().default(false).describe("Is this combatant defeated?"),
    statusEffects: z.array(StatusEffectSchema).optional().describe("Active status effects on the combatant."),
});

const ActiveCombatSchema = z.object({
    isActive: z.boolean().describe("Is combat currently active?"),
    combatants: z.array(CombatantSchema).describe("List of all characters involved in combat."),
    environmentDescription: z.string().optional().describe("Brief description of the combat environment (e.g., 'a narrow corridor', 'an open field')."),
    turnLog: z.array(z.string()).optional().describe("Summary of major events from previous combat turns."),
    playerAttemptedDeescalation: z.boolean().optional().default(false).describe("Has the player attempted to de-escalate this specific encounter before combat began?"),
});


const GenerateAdventureInputSchema = z.object({
  world: z.string().describe('Detailed description of the game world.'),
  initialSituation: z.string().describe('The current situation or narrative state, including recent events and dialogue. If combat is active, this should describe the last action or current standoff.'),
  characters: z.array(CharacterWithContextSummarySchema).describe('Array of currently known characters with their details, including current affinity, relationship statuses summary, and history summary. Relations and history summaries MUST be in the specified language.'),
  userAction: z.string().describe('The action taken by the user. If in combat, this is their combat action (e.g., "I attack Kentaro with my sword", "I cast Fireball at the Intimidator", "I use a Potion of Healing"). If not in combat, it is a general narrative action.'),
  currentLanguage: z.string().describe('The current language code (e.g., "fr", "en") for generating history entries and new character details.'),
  playerName: z.string().describe('The name of the player character.'),
  relationsModeActive: z.boolean().optional().default(true).describe("Indicates if the relationship and affinity system is active for the current turn. If false, affinity and relations should not be updated or heavily influence behavior."),
  rpgModeActive: z.boolean().optional().default(false).describe("Indicates if RPG systems (combat, stats, EXP, MP) are active. If true, combat rules apply."),
  activeCombat: ActiveCombatSchema.optional().describe("Current state of combat, if any. If undefined or isActive is false, assume no combat is ongoing."),
  currencyName: z.string().optional().describe("The name of the currency used in RPG mode (e.g., 'gold', 'credits'). Defaults appropriately if not provided and RPG mode is active."),
  promptConfig: z.object({
      rpgContext: RpgContextSchema.optional()
  }).optional(),
  // Player specific RPG stats for context
  playerClass: z.string().optional().describe("Player's character class if RPG mode is active."),
  playerLevel: z.number().optional().describe("Player's current level if RPG mode is active."),
  playerCurrentHp: z.number().optional().describe("Player's current HP if RPG mode is active."),
  playerMaxHp: z.number().optional().describe("Player's maximum HP if RPG mode is active."),
  playerCurrentMp: z.number().optional().describe("Player's current MP if RPG mode is active and applicable."),
  playerMaxMp: z.number().optional().describe("Player's maximum MP if RPG mode is active and applicable."),
  playerCurrentExp: z.number().optional().describe("Player's current EXP if RPG mode is active."),
  playerExpToNextLevel: z.number().optional().describe("EXP needed for player's next level if RPG mode is active."),
});

export type GenerateAdventureInput = Omit<z.infer<typeof GenerateAdventureInputSchema>, 'characters' | 'activeCombat'> & {
    characters: Character[];
    activeCombat?: z.infer<typeof ActiveCombatSchema>;
};

const InventoryItemSchema = z.object({
    itemName: z.string().describe("Name of the item."),
    quantity: z.number().int().min(1).describe("Quantity of the item.")
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

const NewCharacterSchema = z.object({
    name: z.string().describe("The name of the newly introduced character."),
    details: z.string().optional().describe("A brief description of the new character derived from the narrative context, including their appearance, perceived role/class (e.g., 'Thug', 'Shopkeeper'), and the location/circumstance of meeting if possible. MUST be in the specified language."),
    biographyNotes: z.string().optional().describe("Initial private notes or observations about the new character if any can be inferred. Keep this brief for new characters. MUST be in the specified language."),
    initialHistoryEntry: z.string().optional().describe("A brief initial history entry (in the specified language) about meeting the character, including location if identifiable (e.g., 'Rencontré {{playerName}} au marché noir de Neo-Kyoto.', 'A interpellé {{playerName}} dans les couloirs de Hight School of Future.'). MUST be in the specified language."),
    initialRelations: z.array(
        z.object({
            targetName: z.string().describe("Name of the known character or the player's name (e.g., 'PLAYER_NAME_EXAMPLE', 'Rina')."),
            description: z.string().describe("String description of the new character's initial relationship *status* towards this target (e.g., 'Curieux', 'Indifférent', 'Ami potentiel', 'Rivale potentielle', 'Client', 'Employé'). MUST be in {{currentLanguage}}. If 'Inconnu' or similar is the only option due to lack of context, use it, but prefer a more descriptive status if possible. ALL relation descriptions MUST be in {{currentLanguage}}."),
        })
    ).optional().describe("An array of objects, where each object defines the new character's initial relationship status towards a known character or the player. Example: '[{\"targetName\": \"PLAYER_NAME_EXAMPLE\", \"description\": \"Curieux\"}, {\"targetName\": \"Rina\", \"description\": \"Indifférent\"}]'. If no specific interaction implies a relation for a target, use a descriptive status like 'Inconnu' (or its {{currentLanguage}} equivalent) ONLY if no other relation can be inferred. ALL relation descriptions MUST be in {{currentLanguage}}."),
    isHostile: z.boolean().optional().default(false).describe("Is this new character initially hostile to the player? Relevant if rpgModeActive is true."),
    hitPoints: z.number().optional().describe("Initial HP for the new character if introduced as a combatant in RPG mode."),
    maxHitPoints: z.number().optional().describe("Max HP, same as initial HP for new characters."),
    manaPoints: z.number().optional().describe("Initial MP for the new character if a spellcaster and introduced in RPG mode."),
    maxManaPoints: z.number().optional().describe("Max MP, same as initial MP for new spellcasters."),
    armorClass: z.number().optional().describe("AC for new combatant."),
    attackBonus: z.number().optional().describe("Attack bonus for new combatant."),
    damageBonus: z.string().optional().describe("Damage bonus (e.g. '+1', '1d6') for new combatant."),
    characterClass: z.string().optional().describe("Class if relevant (e.g. 'Bandit Thug', 'School Bully', 'Sorcerer Apprentice')."),
    level: z.number().optional().describe("Level if relevant."),
    inventory: z.array(InventoryItemSchema).optional().describe("List of items in the new character's inventory, e.g., [{\"itemName\": \"Dague Rouillée\", \"quantity\": 1}]"),
});

const CharacterUpdateSchema = z.object({
    characterName: z.string().describe("The name of the known character involved."),
    historyEntry: z.string().describe("A concise summary (in the specified language) of a significant action or quote by this character in the current narrative segment. MUST be in the specified language. Include location context if relevant and known (e.g. 'Au marché: A proposé une affaire douteuse à {{playerName}}.', 'Dans le couloir: A semblé troublée par la question de {{playerName}}.' )."),
});

const AffinityUpdateSchema = z.object({
    characterName: z.string().describe("The name of the known character whose affinity **towards the player** changed."),
    change: z.number().int().min(-10).max(10).describe("The integer change in affinity towards the player (+/-). Keep changes **very small and gradual** for typical interactions (e.g., +1 for a kind word, -1 or -2 for a minor disagreement/misstep, 0 for neutral). Reserve larger changes (+/- 3 to +/-5) for significant events. Extreme changes (+/- 6 to +/-10) for major betrayals/heroic acts. Affinity is 0 (hate) to 100 (love/devotion), 50 is neutral."),
    reason: z.string().optional().describe("Brief justification for the affinity change based on the interaction.")
});

const RelationUpdateSchema = z.object({
    characterName: z.string().describe("The name of the character whose relation is updated (the source)."),
    targetName: z.string().describe("The name of the target character OR the player's name."),
    newRelation: z.string().describe("The new *status* of the relationship from the source's perspective (e.g., 'Ennemi juré', 'Ami proche', 'Ex-petite amie', 'Rivale', 'Amant secret', 'Confidente', 'Collègue'). Be specific and clear. If an existing relation was 'Inconnu' (or equivalent), provide a more specific relation status if the narrative now allows it. MUST be in the specified language."),
    reason: z.string().optional().describe("Brief justification for the relation change based on the narrative interaction or event.")
});

const CombatOutcomeSchema = z.object({
    combatantId: z.string().describe("ID of the combatant (character.id or 'player')."),
    newHp: z.number().describe("The combatant's HP after this turn's actions."),
    newMp: z.number().optional().describe("The combatant's MP after this turn's actions, if applicable."),
    isDefeated: z.boolean().default(false).describe("True if the combatant was defeated this turn (HP <= 0)."),
    newStatusEffects: z.array(StatusEffectSchema).optional().describe("Updated list of status effects for this combatant."),
});


const CombatUpdatesSchema = z.object({
    updatedCombatants: z.array(CombatOutcomeSchema).describe("HP, MP, status effects, and defeat status updates for all combatants involved in this turn. THIS IS MANDATORY if combat took place."),
    expGained: z.number().optional().describe("Experience points gained by the player if any enemies were defeated. Award based on enemy difficulty/level (e.g., 5-20 for easy, 25-75 for medium, 100+ for hard/bosses)."),
    combatEnded: z.boolean().default(false).describe("True if the combat encounter has concluded (e.g., all enemies defeated/fled, or player defeated/fled)."),
    turnNarration: z.string().describe("A detailed narration of the combat actions and outcomes for this turn. THIS IS MANDATORY if combat took place. This will be part of the main narrative output as well."),
    nextActiveCombatState: ActiveCombatSchema.optional().describe("The state of combat to be used for the *next* turn, if combat is still ongoing. If combatEnded is true, this can be omitted or isActive set to false."),
});


const GenerateAdventureOutputSchema = z.object({
  narrative: z.string().describe('The generated narrative continuation. If in combat, this includes the description of actions and outcomes for the current turn.'),
  sceneDescriptionForImage: z
    .string()
    .optional()
    .describe('A concise visual description of the current scene, suitable for an image generation prompt. Describe characters using their physical appearance, not their names. Include key actions or mood if relevant.'),
  newCharacters: z
    .array(NewCharacterSchema)
    .optional()
    .describe('List of characters newly introduced in this narrative segment. All textual fields (details, history, relations) MUST be in the specified language. If rpgModeActive, include combat stats for new hostiles.'),
  characterUpdates: z
    .array(CharacterUpdateSchema)
    .optional()
    .describe('List of significant events or quotes involving known characters in this narrative segment, for logging in their history. MUST be in the specified language.'),
  affinityUpdates: z
    .array(AffinityUpdateSchema)
    .optional()
    .describe("List of affinity changes for known characters **towards the player** based on the user's action and the resulting narrative. Only if relationsModeActive."),
  relationUpdates: z
    .array(RelationUpdateSchema)
    .optional()
    .describe("List of relationship status changes between characters OR towards the player based on the narrative. Only if relationsModeActive."),
  combatUpdates: CombatUpdatesSchema.optional().describe("Information about the combat turn if RPG mode is active and combat occurred. This should be present if activeCombat.isActive was true in input, or if combat started this turn."),
  itemsObtained: z.array(LootedItemSchema).optional().describe("Items obtained by the player this turn, either from combat loot, finding them, or being given them. Be creative and appropriate for the world setting, and {{currencyName}}. For each item, YOU MUST provide itemName, quantity, and itemType ('consumable', 'weapon', 'armor', 'quest', 'misc'). Optionally, provide itemDescription and itemEffect (all text in {{currentLanguage}})."),
});
export type GenerateAdventureOutput = z.infer<typeof GenerateAdventureOutputSchema>;


export async function generateAdventure(input: GenerateAdventureInput): Promise<GenerateAdventureOutput> {
    const processedCharacters: CharacterWithContextSummary[] = input.characters.map(char => {
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
            // RPG Stats
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
            inventory: input.rpgModeActive ? (char.inventory || {}) : undefined,
        };
    });

    let finalCurrencyName = input.currencyName;
    if (input.rpgModeActive && (finalCurrencyName === undefined || finalCurrencyName === null || finalCurrencyName.trim() === "")) {
        finalCurrencyName = input.currentLanguage === 'fr' ? 'pièces d\'or' : 'gold coins';
    } else if (!input.rpgModeActive) {
        finalCurrencyName = undefined;
    }

    const flowInput: z.infer<typeof GenerateAdventureInputSchema> = {
        ...input,
        characters: processedCharacters,
        rpgModeActive: input.rpgModeActive ?? false,
        relationsModeActive: input.relationsModeActive ?? true,
        activeCombat: input.activeCombat,
        currencyName: finalCurrencyName,
        // Pass player stats explicitly
        playerClass: input.rpgModeActive ? (input.playerClass || "Aventurier") : undefined,
        playerLevel: input.rpgModeActive ? (input.playerLevel || 1) : undefined,
        playerCurrentHp: input.rpgModeActive ? (input.playerCurrentHp ?? input.playerMaxHp ?? 10) : undefined,
        playerMaxHp: input.rpgModeActive ? (input.playerMaxHp || 10) : undefined,
        playerCurrentMp: input.rpgModeActive ? (input.playerCurrentMp ?? input.playerMaxMp ?? 0) : undefined,
        playerMaxMp: input.rpgModeActive ? (input.playerMaxMp || 0) : undefined,
        playerCurrentExp: input.rpgModeActive ? (input.playerCurrentExp || 0) : undefined,
        playerExpToNextLevel: input.rpgModeActive ? (input.playerExpToNextLevel || 100) : undefined,
    };

  return generateAdventureFlow(flowInput);
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

World: {{{world}}}

Current Situation/Recent Narrative:
{{{initialSituation}}}

{{#if rpgModeActive}}
--- Player Stats ({{playerName}}) ---
Class: {{playerClass}} | Level: {{playerLevel}}
HP: {{playerCurrentHp}}/{{playerMaxHp}}
{{#if playerMaxMp}}MP: {{playerCurrentMp}}/{{playerMaxMp}} (MP regenerates by 1 each turn if below max and used){{/if}}
EXP: {{playerCurrentExp}}/{{playerExpToNextLevel}}
---
{{/if}}

{{#if activeCombat.isActive}}
--- COMBAT ACTIVE ---
Environment: {{activeCombat.environmentDescription}}
Combatants:
{{#each activeCombat.combatants}}
- Name: {{this.name}} (Team: {{this.team}}) - HP: {{this.currentHp}}/{{this.maxHp}} {{#if this.maxMp}}- MP: {{this.currentMp}}/{{this.maxMp}}{{/if}} {{#if this.statusEffects}}(Statuts: {{#each this.statusEffects}}{{this.name}} ({{this.duration}}t){{#unless @last}}, {{/unless}}{{/each}}){{/if}} {{#if this.isDefeated}}(DEFEATED){{/if}}
{{/each}}
{{#if activeCombat.turnLog}}
Previous Turn Summary:
{{#each activeCombat.turnLog}}
- {{{this}}}
{{/each}}
{{/if}}
--- END COMBAT INFO ---
{{/if}}

Known Characters (excluding player unless explicitly listed for context):
{{#each characters}}
- Name: {{this.name}}
  Description: {{this.details}}
  {{#if this.biographyNotes}}
  Biographie/Notes (pour contexte interne, ne pas révéler directement): {{{this.biographyNotes}}}
  {{/if}}
  {{#if ../rpgModeActive}}
  Class: {{this.characterClass}} | Level: {{this.level}}
  HP: {{this.hitPoints}}/{{this.maxHitPoints}} {{#if this.maxManaPoints}}| MP: {{this.manaPoints}}/{{this.maxManaPoints}}{{/if}} | AC: {{this.armorClass}} | Attack: {{this.attackBonus}} | Damage: {{this.damageBonus}}
  Hostile: {{#if this.isHostile}}Yes{{else}}No{{/if}}
  Inventory (conceptual): {{#if this.inventory}}{{#each this.inventory}}{{@key}}: {{this}}; {{/each}}{{else}}Vide{{/if}}
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
{{/each}}

User Action (from {{playerName}}): {{{userAction}}}
**Do NOT narrate actions for {{playerName}}. Only narrate the consequences of their action and the reactions of NPCs and the environment.**
**Start the narrative directly from the consequences of the user's action. Do NOT repeat or summarize the user's action.**

**RÈGLE IMPÉRATIVE DE COMBAT:** If rpgModeActive is true AND activeCombat.isActive is true (or if a combat is initiated this turn), you **MUST** impérativement suivre les étapes de combat au tour par tour décrites ci-dessous. Générez les combatUpdates pour chaque combattant. Ne narrez PAS le combat comme une simple histoire ; décrivez les actions, leurs succès ou échecs, les dégâts, les effets de statut, et mettez à jour l'état des combattants via combatUpdates. La narration principale (narrative) doit être le reflet direct et détaillé de combatUpdates.turnNarration.

Tasks:
1.  **Generate the "Narrative Continuation" (in {{currentLanguage}}):** Write the next part of the story.
    *   **If NOT in combat AND rpgModeActive is true:**
        *   Analyze the userAction and initialSituation. Could this lead to combat? (e.g., player attacks, an NPC becomes aggressive).
        *   **De-escalation:** If {{playerName}} is trying to talk their way out of a potentially hostile situation (e.g., with bullies, suspicious guards) BEFORE combat begins, assess this based on their userAction. Narrate the NPC's reaction based on their affinity, relations, and details. They might back down, demand something, or attack anyway, potentially initiating combat.
        *   If combat is initiated THIS turn: Clearly announce it. Identify combatants, their team ('player', 'enemy', 'neutral'), and their initial state (HP, MP if applicable, statusEffects, using their character sheet stats or estimated for new enemies). Describe the environment for activeCombat.environmentDescription. Populate combatUpdates.nextActiveCombatState with isActive: true and the list of combatants.
    *   **If IN COMBAT (activeCombat.isActive is true) AND rpgModeActive is true - FOLLOW THESE STEPS MANDATORILY:**
        *   **Étape 1: Tour du Joueur ({{playerName}}).**
            *   L'action du joueur est: {{{userAction}}}. Cela peut être une attaque, un sort, l'utilisation d'un objet (ex: "J'utilise Potion de Soin Mineure", "Je jette Dague Rouillée"), ou une autre manœuvre.
            *   **Si le joueur utilise ou jette un objet:** Narrez l'action. L'effet de l'objet (ex: restauration de PV pour une potion de soin, dégâts pour une bombe) DOIT être pris en compte dans le calcul des combatUpdates.updatedCombatants pour le joueur ou la cible. Un objet consommé est conceptuellement retiré de son inventaire (la gestion réelle de l'inventaire se fait côté client).
            *   **Narrez l'action du joueur et déterminez son succès/effet.** Basez-vous sur les stats du joueur (fournies dans le contexte) et celles de la cible. Si le joueur lance un sort, notez le coût en PM s'il est implicite ou indiqué.
        *   **Étape 2: Tour des PNJ.** Déterminez les actions pour TOUS les autres PNJ actifs et non vaincus dans activeCombat.combatants (surtout l'équipe 'enemy'). Leurs actions doivent être basées sur leurs détails, characterClass, statut isHostile, PV/PM actuels, statusEffects, affinité envers le joueur/autres combattants, et leur sens tactique. Les lanceurs de sorts doivent utiliser des sorts appropriés à leurs PM et à la situation.
        *   **Étape 3: Gestion des Effets de Statut.** Au début du tour de chaque PNJ (ou à la fin), appliquez les dégâts/effets des statusEffects en cours (ex: 'Empoisonné' inflige des dégâts). Si un PNJ a un statut comme 'Étourdi' ou 'Paralysé', il peut sauter son tour ou agir avec désavantage. Décrémentez la duration des effets temporaires sur les PNJ. Si la duration atteint 0, l'effet disparaît. Narrez ces changements.
        *   **Étape 4: Narration du Tour.** La narration combinée des actions du joueur et des PNJ, ainsi que leurs résultats (succès, échec, dégâts, nouveaux effets de statut appliqués), forme combatUpdates.turnNarration. Cette narration DOIT être la partie principale de la sortie narrative globale.
        *   **Étape 5: Mise à Jour des Combattants.** Calculez les changements de PV et PM pour TOUS les combattants impliqués ce tour. Populez combatUpdates.updatedCombatants avec ces résultats (obligatoirement combatantId, newHp, et optionnellement newMp, isDefeated (si PV <= 0), newStatusEffects).
        *   **Étape 6: Récompenses.** Si un ou plusieurs ennemis sont vaincus, calculez l'EXP gagnée par {{playerName}} (ex: 5-20 pour facile, 25-75 pour moyen, 100+ pour difficile/boss, en tenant compte du niveau du joueur) et mettez-la dans combatUpdates.expGained. Pour le butin, générez des objets appropriés (voir instructions "Item Acquisition" ci-dessous) et listez-les dans le champ itemsObtained (au niveau racine de la sortie).
        *   **Étape 7: Fin du Combat.** Déterminez si le combat est terminé (par exemple, tous les ennemis vaincus/fuis, ou joueur vaincu/fui). Si oui, mettez combatUpdates.combatEnded: true.
        *   **Étape 8: État du Combat Suivant.** Si combatUpdates.combatEnded est false, alors combatUpdates.nextActiveCombatState DOIT être populé avec l'état à jour de tous les combattants (PV, PM, effets de statut) pour le prochain tour. Rappelez-vous de décrémenter aussi la durée des effets de statut du joueur. Si combatUpdates.combatEnded est true, combatUpdates.nextActiveCombatState peut être omis ou avoir isActive: false.
        *   **LA STRUCTURE combatUpdates EST OBLIGATOIRE ET DOIT ÊTRE COMPLÈTE SI LE COMBAT EST ACTIF.**
    *   **Item Acquisition (Exploration/Gift/Combat Loot):** If the player finds items, is given items, or gets them from combat loot, list these in the top-level itemsObtained field.
        *   For each item, YOU MUST provide itemName, quantity, and itemType ('consumable', 'weapon', 'armor', 'quest', 'misc'). This is CRUCIAL.
        *   Optionally, provide itemDescription (in {{currentLanguage}}), itemEffect (in {{currentLanguage}}).
    *   **Regardless of combat, if relationsModeActive is true:**
        Character behavior MUST reflect their 'Current Affinity' towards {{playerName}} and 'Relationship Statuses' as described in the character list and the Behavior Guide. Their dialogue and willingness to cooperate should be strongly influenced by this.

2.  **Identify New Characters (all text in {{currentLanguage}}):** List any newly mentioned characters in newCharacters.
    *   Include 'name', 'details' (with meeting location/circumstance, appearance, perceived role), 'initialHistoryEntry' (e.g. "Rencontré {{../playerName}} à {{location}}.").
    *   Include 'biographyNotes' if any initial private thoughts or observations can be inferred.
    *   {{#if rpgModeActive}}If introduced as hostile or a potential combatant, set isHostile: true/false and provide estimated RPG stats (hitPoints, maxHitPoints, manaPoints, maxManaPoints, armorClass, attackBonus, damageBonus, characterClass, level). Base stats on their description (e.g., "Thug" vs "Dragon", "Apprentice Mage" might have MP). Also, include an optional initial inventory (e.g. [{"itemName": "Dague Rouillée", "quantity": 1}]).{{/if}}
    *   {{#if relationsModeActive}}Provide 'initialRelations' towards player and known NPCs. Infer specific status (e.g., "Client", "Garde", "Passant curieux") if possible, use 'Inconnu' as last resort. **All relation descriptions MUST be in {{currentLanguage}}.** If a relation is "Inconnu", try to define a more specific one based on the context of their introduction.{{/if}}

3.  **Describe Scene for Image (English):** For sceneDescriptionForImage, visually describe setting, mood, characters (by appearance/role, not name).

4.  **Log Character Updates (in {{currentLanguage}}):** For KNOWN characters, log significant actions/quotes in characterUpdates, including location context if known.

{{#if relationsModeActive}}
5.  **Affinity Updates:** Analyze interactions with KNOWN characters. Update affinityUpdates for changes towards {{playerName}}. Small changes (+/- 1-2) usually, larger (+/- 3-5, max +/-10 for extreme events) for major events. Justify with 'reason'.

6.  **Relation Status Updates (in {{currentLanguage}}):**
    *   Analyze the narrative for significant shifts in how characters view each other ({{playerName}} or other NPCs).
    *   **If a character's affinity towards {{playerName}} crosses a major threshold** (e.g., from neutral to friendly, friendly to loyal, neutral to wary, wary to hostile), consider if their relationship *status* towards {{playerName}} should change.
    *   **If a significant narrative event occurs** (e.g., betrayal, deep act of trust, declaration, prolonged conflict, new alliance forming), update the relationship *status* between the involved characters (NPC-{{playerName}} or NPC-NPC).
    *   **Crucially, if an existing relationship status for a character towards any target ({{playerName}} or another NPC) is 'Inconnu' (or its {{currentLanguage}} equivalent), YOU MUST attempt to define a more specific and descriptive relationship status if the current narrative provides sufficient context.** For example, if they just did business, the status could become 'Client' or 'Vendeur'. If they fought side-by-side, 'Allié temporaire' or 'Compagnon d'armes'. If one helped the other, 'Reconnaissant envers' or 'Débiteur de'.
    *   Populate relationUpdates with:
        *   characterName: The name of the character whose perspective of the relationship is changing.
        *   targetName: The name of the other character involved (or 'PLAYER_NAME_EXAMPLE').
        *   newRelation: The NEW, concise relationship status (e.g., 'Ami proche', 'Nouvel Allié', 'Ennemi Déclaré', 'Amant Secret', 'Protecteur', 'Rivale', 'Confident', 'Ex-partenaire', 'Client', 'Employé'). The status MUST be in {{currentLanguage}}. Be creative and contextually appropriate.
        *   reason: A brief justification for the change.
    *   **Example (Player-NPC):** If Rina's affinity for {{../playerName}} drops significantly due to a misunderstanding and she acts cold, relationUpdates might include: '{ "characterName": "Rina", "targetName": "PLAYER_NAME_EXAMPLE", "newRelation": "Relation tendue", "reason": "Suite à la dispute au sujet de Kentaro." }'
    *   **Example (NPC-NPC):** If Kentaro openly declares his rivalry with a new character named "Yuki", relationUpdates might include: '{ "characterName": "Kentaro", "targetName": "Yuki", "newRelation": "Rivaux déclarés", "reason": "Confrontation directe au sujet de leurs objectifs opposés." }'
{{else}}
(Affinity and Relation updates are disabled.)
{{/if}}

Narrative Continuation (in {{currentLanguage}}):
[Generate the story here. If combat, this IS the combat turn narration. Adhere to affinity/relations if active. If combat starts/ends, clearly state it.]
`,
});


const generateAdventureFlow = ai.defineFlow<
  typeof GenerateAdventureInputSchema,
  typeof GenerateAdventureOutputSchema
>(
  {
    name: 'generateAdventureFlow',
    inputSchema: GenerateAdventureInputSchema,
    outputSchema: GenerateAdventureOutputSchema,
  },
  async input => {

    console.log("Generating adventure with input:", JSON.stringify(input, null, 2));

    const {output} = await prompt(input);

    if (!output?.narrative) {
        throw new Error("AI failed to generate a narrative.");
    }
    console.log("AI Output:", JSON.stringify(output, null, 2));
    if (output.combatUpdates) {
        console.log("Combat Updates from AI:", JSON.stringify(output.combatUpdates, null, 2));
    }


    if (output.newCharacters) {
        output.newCharacters.forEach(nc => {
            if (nc.details) console.log(`New char ${nc.name} details language check (should be ${input.currentLanguage}): ${nc.details.substring(0,20)}`);
            if (nc.initialHistoryEntry) console.log(`New char ${nc.name} history language check (should be ${input.currentLanguage}): ${nc.initialHistoryEntry.substring(0,20)}`);
            if (input.relationsModeActive && nc.initialRelations) {
                nc.initialRelations.forEach(rel => {
                     console.log(`New char ${nc.name} relation to ${rel.targetName} language check (should be ${input.currentLanguage}): ${String(rel.description).substring(0,20)}`);
                });
            }
        });
    }
    if (output.characterUpdates) {
        output.characterUpdates.forEach(upd => {
            console.log(`History update for ${upd.characterName} language check (should be ${input.currentLanguage}): ${upd.historyEntry.substring(0,20)}`);
        });
    }
    if (input.relationsModeActive && output.relationUpdates) {
        output.relationUpdates.forEach(upd => {
             console.log(`Relation update for ${upd.characterName} towards ${upd.targetName} language check (should be ${input.currentLanguage}): ${upd.newRelation.substring(0,20)}`);
        });
    }
    if (input.rpgModeActive && output.combatUpdates) {
        console.log("Combat Turn Narration (from output.combatUpdates.turnNarration):", output.combatUpdates.turnNarration.substring(0, 100));
        if(output.combatUpdates.nextActiveCombatState) {
            console.log("Next combat state active:", output.combatUpdates.nextActiveCombatState.isActive);
            output.combatUpdates.nextActiveCombatState.combatants.forEach(c => {
                 console.log(`Combatant ${c.name} - HP: ${c.currentHp}/${c.maxHp}, MP: ${c.currentMp ?? 'N/A'}/${c.maxMp ?? 'N/A'}, Statuses: ${c.statusEffects?.map(s => s.name).join(', ') || 'None'}`);
            });
        }
    }
    if (output.itemsObtained) {
        output.itemsObtained.forEach(item => {
            if (item.description) console.log(`Item ${item.itemName} description language check (should be ${input.currentLanguage}): ${item.description.substring(0,20)}`);
            if (item.effect) console.log(`Item ${item.itemName} effect language check (should be ${input.currentLanguage}): ${item.effect.substring(0,20)}`);
            if (item.itemType) console.log(`Item ${item.itemName} type check: ${item.itemType}`); else console.warn(`Item ${item.itemName} MISSING itemType!`);
        });
    }

    return output;
  }
);


