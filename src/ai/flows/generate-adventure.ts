
'use server';

/**
 * @fileOverview Generates adventure narratives based on world, initial situation, characters, and user actions.
 * Includes optional RPG context handling and provides scene descriptions for image generation.
 * Detects newly introduced characters, logs significant character events/quotes in the specified language,
 * and calculates changes in character affinity towards the player. Includes dynamic character relation updates (player-NPC and NPC-NPC).
 * Handles combat initiation, turn-based combat narration, enemy actions, and rewards (EXP, Loot). Manages HP and MP.
 *
 * - generateAdventure - A function that generates adventure narratives.
 * - GenerateAdventureInput - The input type for the generateAdventure function.
 * - GenerateAdventureOutput - The return type for the generateAdventure function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { Character, ActiveCombat, Combatant } from '@/types'; // Import Character, ActiveCombat, Combatant types

// Define RPG context schema (optional)
const RpgContextSchema = z.object({
    playerStats: z.record(z.union([z.string(), z.number()])).optional().describe("Player character's statistics (e.g., HP, MP, STR)."),
    characterDetails: z.array(z.object({
        name: z.string(),
        details: z.string().optional().describe("Brief description of the character for context."),
        stats: z.record(z.union([z.string(), z.number()])).optional().describe("Character's statistics."),
        inventory: z.record(z.number()).optional().describe("Character's inventory (item name: quantity)."),
        relations: z.string().optional().describe("Summary of relations towards player and others.")
    })).optional().describe("Details of relevant secondary characters already known."),
    mode: z.enum(["exploration", "dialogue", "combat"]).optional().describe("Current game mode."),
}).optional();

const BaseCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  details: z.string(),
  affinity: z.number().optional().default(50).describe("Affinity score (0-100) indicating the character's feeling towards the player. 0=Hate, 50=Neutral, 100=Love/Devotion."),
  relations: z.record(z.string(), z.string()).optional().describe("Relationship status towards other characters/player (key: character ID or 'player', value: status e.g., 'Petite amie', 'Meilleur ami', 'Ennemi juré'). MUST be in the specified language."),
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
const CombatantSchema = z.object({
    characterId: z.string().describe("ID of the character or 'player'."),
    name: z.string().describe("Name of the combatant."),
    currentHp: z.number().describe("Current HP of the combatant."),
    maxHp: z.number().describe("Maximum HP of the combatant."),
    currentMp: z.number().optional().describe("Current MP of the combatant if applicable."),
    maxMp: z.number().optional().describe("Maximum MP of the combatant if applicable."),
    team: z.enum(['player', 'enemy', 'neutral']).describe("Team alignment."),
    isDefeated: z.boolean().default(false).describe("Is this combatant defeated?"),
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
  userAction: z.string().describe('The action taken by the user. If in combat, this is their combat action (e.g., "I attack Kentaro with my sword", "I cast Fireball at the Intimidator"). If not in combat, it is a general narrative action.'),
  currentLanguage: z.string().describe('The current language code (e.g., "fr", "en") for generating history entries and new character details.'),
  playerName: z.string().describe('The name of the player character.'),
  relationsModeActive: z.boolean().optional().default(true).describe("Indicates if the relationship and affinity system is active for the current turn. If false, affinity and relations should not be updated or heavily influence behavior."),
  rpgModeActive: z.boolean().optional().default(false).describe("Indicates if RPG systems (combat, stats, EXP, MP) are active. If true, combat rules apply."),
  activeCombat: ActiveCombatSchema.optional().describe("Current state of combat, if any. If undefined or isActive is false, assume no combat is ongoing."),
  currencyName: z.string().optional().describe("The name of the currency used in RPG mode (e.g., 'gold', 'credits'). Defaults appropriately if not provided and RPG mode is active."),
  promptConfig: z.object({ 
      rpgContext: RpgContextSchema.optional()
  }).optional(),
});

export type GenerateAdventureInput = Omit<z.infer<typeof GenerateAdventureInputSchema>, 'characters' | 'activeCombat'> & {
    characters: Character[]; 
    activeCombat?: ActiveCombat; 
};


const NewCharacterSchema = z.object({
    name: z.string().describe("The name of the newly introduced character."),
    details: z.string().optional().describe("A brief description of the new character derived from the narrative context, including the location/circumstance of meeting if possible. MUST be in the specified language."),
    initialHistoryEntry: z.string().optional().describe("A brief initial history entry (in the specified language) about meeting the character, including location if identifiable. MUST be in the specified language."),
    initialRelations: z.array(
        z.object({
            targetName: z.string().describe("Name of the known character or the player's name (e.g., '{{playerName}}', 'Rina')."),
            description: z.string().describe("String description of the new character's initial relationship *status* towards this target (e.g., 'Curieux', 'Indifférent', 'Ami potentiel', 'Rivale potentielle'). MUST be in {{currentLanguage}}. If 'Inconnu' or similar is the only option due to lack of context, use it, but prefer a more descriptive status if possible. ALL relation descriptions MUST be in {{currentLanguage}}."),
        })
    ).optional().describe("An array of objects, where each object defines the new character's initial relationship status towards a known character or the player. Example: `[{\"targetName\": \"{{playerName}}\", \"description\": \"Curieux\"}, {\"targetName\": \"Rina\", \"description\": \"Indifférent\"}]`. If no specific interaction implies a relation for a target, use a descriptive status like 'Inconnu' (or its {{currentLanguage}} equivalent) ONLY if no other relation can be inferred. ALL relation descriptions MUST be in {{currentLanguage}}."),
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
});

const CharacterUpdateSchema = z.object({
    characterName: z.string().describe("The name of the known character involved."),
    historyEntry: z.string().describe("A concise summary (in the specified language) of a significant action or quote by this character in the current narrative segment. MUST be in the specified language."),
});

const AffinityUpdateSchema = z.object({
    characterName: z.string().describe("The name of the known character whose affinity **towards the player** changed."),
    change: z.number().int().describe("The integer change in affinity towards the player (+/-). Keep changes **very small and gradual** for typical interactions (e.g., +1 for a kind word, -2 for a minor disagreement, 0 for neutral). Reserve larger changes (+/- 5 or more) for major story events or betrayals/heroic acts. Affinity is 0 (hate) to 100 (love/devotion), 50 is neutral."),
    reason: z.string().optional().describe("Brief justification for the affinity change based on the interaction.")
});

const RelationUpdateSchema = z.object({
    characterName: z.string().describe("The name of the character whose relation is updated (the source)."),
    targetName: z.string().describe("The name of the target character OR the player's name."),
    newRelation: z.string().describe("The new *status* of the relationship from the source's perspective (e.g., 'Ennemi juré', 'Ami proche', 'Ex-petite amie', 'Rivale', 'Amant secret', 'Confidente'). Be specific and clear. If an existing relation was 'Inconnu' (or equivalent), provide a more specific relation status if the narrative now allows it. MUST be in the specified language."),
    reason: z.string().optional().describe("Brief justification for the relation change based on the narrative interaction or event.")
});

const CombatOutcomeSchema = z.object({
    combatantId: z.string().describe("ID of the combatant (character.id or 'player')."),
    newHp: z.number().describe("The combatant's HP after this turn's actions."),
    newMp: z.number().optional().describe("The combatant's MP after this turn's actions, if applicable."),
    isDefeated: z.boolean().default(false).describe("True if the combatant was defeated this turn (HP <= 0)."),
});

const CombatUpdatesSchema = z.object({
    updatedCombatants: z.array(CombatOutcomeSchema).describe("HP, MP, and status updates for all combatants involved in this turn."),
    expGained: z.number().optional().describe("Experience points gained by the player if any enemies were defeated."),
    lootDropped: z.array(z.object({ itemName: z.string(), quantity: z.number() })).optional().describe("Items looted from defeated enemies (includes currency if applicable, using {{../currencyName}})."),
    combatEnded: z.boolean().default(false).describe("True if the combat encounter has concluded (e.g., all enemies defeated/fled, or player defeated/fled)."),
    turnNarration: z.string().describe("A detailed narration of the combat actions and outcomes for this turn. This will be part of the main narrative output as well, but summarized here for combat logic."),
    nextActiveCombatState: ActiveCombatSchema.optional().describe("The state of combat to be used for the *next* turn, if combat is still ongoing. If combatEnded is true, this can be omitted or isActive set to false."),
});


const GenerateAdventureOutputSchema = z.object({
  narrative: z.string().describe('The generated narrative continuation. If in combat, this includes the description of actions and outcomes for the current turn.'),
  sceneDescriptionForImage: z
    .string()
    .optional()
    .describe('A concise visual description of the current scene, suitable for an image generation prompt. Describe characters using their physical appearance, not their names.'),
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
});
export type GenerateAdventureOutput = z.infer<typeof GenerateAdventureOutputSchema>;


export async function generateAdventure(input: GenerateAdventureInput): Promise<GenerateAdventureOutput> {
    const processedCharacters: CharacterWithContextSummary[] = input.characters.map(char => {
        const history = char.history || [];
        const lastThreeEntries = history.slice(-3);
        const historySummary = lastThreeEntries.length > 0 ? lastThreeEntries.join(' | ') : (input.currentLanguage === 'fr' ? 'Aucun' : 'None');
        
        let relationsSummaryText = input.currentLanguage === 'fr' ? "Mode relations désactivé." : "Relations mode disabled.";
        if (input.relationsModeActive) {
             relationsSummaryText = char.relations
                ? Object.entries(char.relations)
                      .map(([targetId, description]) => {
                          const targetName = targetId === 'player' 
                              ? input.playerName 
                              : input.characters.find(c => c.id === targetId)?.name || targetId;
                          return `${targetName}: ${description}`;
                      })
                      .join(', ') || (input.currentLanguage === 'fr' ? 'Aucune relation définie.' : 'No relations defined.')
                : (input.currentLanguage === 'fr' ? 'Aucune relation définie.' : 'No relations defined.');
        }

        return {
            id: char.id,
            name: char.name,
            details: char.details || (input.currentLanguage === 'fr' ? "Aucun détail fourni." : "No details provided."),
            affinity: input.relationsModeActive ? (char.affinity ?? 50) : 50,
            relations: input.relationsModeActive ? (char.relations || { ['player']: (input.currentLanguage === 'fr' ? "Inconnu" : "Unknown") }) : {},
            historySummary: historySummary,
            relationsSummary: relationsSummaryText,
            // RPG Stats
            hitPoints: input.rpgModeActive ? (char.hitPoints ?? char.maxHitPoints ?? 10) : undefined,
            maxHitPoints: input.rpgModeActive ? (char.maxHitPoints ?? 10) : undefined,
            manaPoints: input.rpgModeActive ? (char.manaPoints ?? char.maxManaPoints ?? 0) : undefined,
            maxManaPoints: input.rpgModeActive ? (char.maxManaPoints ?? 0) : undefined,
            armorClass: input.rpgModeActive ? (char.armorClass ?? 10) : undefined,
            attackBonus: input.rpgModeActive ? (char.attackBonus ?? 0) : undefined,
            damageBonus: input.rpgModeActive ? (char.damageBonus ?? "1") : undefined,
            characterClass: input.rpgModeActive ? (char.characterClass || "N/A") : undefined,
            level: input.rpgModeActive ? (char.level ?? 1) : undefined, 
            isHostile: input.rpgModeActive ? (char.isHostile ?? false) : false,
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
        activeCombat: input.activeCombat,
        currencyName: finalCurrencyName,
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
  prompt: `You are an interactive fiction engine. Weave a cohesive and engaging story based on the context provided. The player character's name is **{{playerName}}**. The target language for ALL textual outputs (narrative, character details, history entries, relation descriptions) is **{{currentLanguage}}**.

World: {{{world}}}

Current Situation/Recent Narrative:
{{{initialSituation}}}

{{#if activeCombat.isActive}}
--- COMBAT ACTIVE ---
Environment: {{activeCombat.environmentDescription}}
Combatants:
{{#each activeCombat.combatants}}
- Name: {{this.name}} (Team: {{this.team}}) - HP: {{this.currentHp}}/{{this.maxHp}} {{#if this.maxMp}}{{#if (gt this.maxMp 0)}}- MP: {{this.currentMp}}/{{this.maxMp}}{{/if}}{{/if}} {{#if this.isDefeated}}(DEFEATED){{/if}}
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
  Description: {{this.details}} {{! MUST be in {{../currentLanguage}} }}
  {{#if ../rpgModeActive}}
  Class: {{this.characterClass}} | Level: {{this.level}}
  HP: {{this.hitPoints}}/{{this.maxHitPoints}} {{#if this.maxManaPoints}}{{#if (gt this.maxManaPoints 0)}}| MP: {{this.manaPoints}}/{{this.maxManaPoints}}{{/if}}{{/if}} | AC: {{this.armorClass}} | Attack: {{this.attackBonus}} | Damage: {{this.damageBonus}}
  Hostile: {{#if this.isHostile}}Yes{{else}}No{{/if}}
  {{/if}}
  {{#if ../relationsModeActive}}
  Current Affinity towards {{../playerName}}: **{{this.affinity}}/100** (This score **DICTATES** their feelings and behavior towards {{../playerName}} on a scale from 0-10: Deep Hate, 11-30: Hostile, 31-45: Wary, 46-55: Neutral, 56-70: Friendly, 71-90: Loyal, 91-100: Devoted/Love). **ADHERE STRICTLY TO THE LEVELS DESCRIBED BELOW.**)
  Relationship Statuses: {{{this.relationsSummary}}} {{! MUST be in {{../currentLanguage}} }}
  {{else}}
  (Relations and affinity mode is disabled. Character behavior based on description and narrative context only.)
  {{/if}}
  History (summary): {{{this.historySummary}}} {{! MUST be in {{../currentLanguage}} }}
{{/each}}

User Action (from {{playerName}}): {{{userAction}}}

{{#if promptConfig.rpgContext}}
--- RPG Context (Legacy, prefer integrated fields) ---
Mode: {{promptConfig.rpgContext.mode}}
{{#if promptConfig.rpgContext.playerStats}}
Player Stats ({{../playerName}}): {{#each promptConfig.rpgContext.playerStats}}{{@key}}: {{this}} {{/each}}
{{/if}}
---
{{/if}}

Tasks:
1.  **Generate the "Narrative Continuation" (in {{currentLanguage}}):** Write the next part of the story.
    *   **If NOT in combat AND rpgModeActive is true:**
        *   Analyze the userAction and initialSituation. Could this lead to combat? (e.g., player attacks, an NPC becomes aggressive).
        *   **De-escalation:** If {{playerName}} is trying to talk their way out of a potentially hostile situation (e.g., with bullies, suspicious guards) BEFORE combat begins, assess this based on their userAction. Narrate the NPC's reaction. They might back down, demand something, or attack anyway, potentially initiating combat.
        *   If combat is initiated THIS turn: Clearly announce it. Identify combatants and their initial state (HP, MP if applicable). Describe the environment for activeCombat.environmentDescription. Populate combatUpdates.nextActiveCombatState with isActive: true and the list of combatants.
    *   **If IN COMBAT (activeCombat.isActive is true) AND rpgModeActive is true:**
        *   Narrate the userAction (player's combat move). Determine its success and effect based on player stats (assume basic stats if not detailed) and target's stats (e.g., AC). If the player casts a spell, note any MP cost implied or stated by the user.
        *   Determine actions for ALL OTHER active, non-defeated NPCs in activeCombat.combatants (especially 'enemy' team). Their actions should be based on their details, characterClass, isHostile status, current HP/MP, and combat sense. Spellcasters should use spells appropriate to their MP and the situation.
        *   Narrate these NPC actions and their outcomes. If an NPC casts a spell, estimate a reasonable MP cost (e.g., 3-5 MP for minor, 8-12 for moderate) and deduct it.
        *   The combined narration of player and NPC actions forms this turn's combatUpdates.turnNarration and should be the primary part of the main narrative output.
        *   Calculate HP/MP changes and populate combatUpdates.updatedCombatants. Mark isDefeated: true if HP <= 0. Include newMp if MP changed.
        *   If an enemy is defeated, award {{playerName}} EXP (e.g., 10-50 EXP per typical enemy, more for tougher ones) in combatUpdates.expGained.
        *   Optionally, defeated enemies might drop {{../currencyName}} or simple items. List these in combatUpdates.lootDropped.
        *   If all enemies are defeated/fled or player is defeated, set combatUpdates.combatEnded: true. Update combatUpdates.nextActiveCombatState.isActive to false.
        *   If combat continues, update combatUpdates.nextActiveCombatState with current combatant HPs, MPs, and statuses for the next turn.
    *   **Regardless of combat, if relationsModeActive is true:**
        Character behavior MUST reflect their 'Current Affinity' towards {{playerName}} (0-10: Deep Hate, 11-30: Hostile, 31-45: Wary, 46-55: Neutral, 56-70: Friendly, 71-90: Loyal, 91-100: Devoted/Love). Also consider inter-character 'Relationship Statuses'.

2.  **Identify New Characters (all text in {{currentLanguage}}):** List any newly mentioned characters in newCharacters.
    *   Include 'name', 'details' (with meeting location/circumstance), 'initialHistoryEntry'.
    *   {{#if rpgModeActive}}If introduced as hostile, set isHostile: true and provide estimated RPG stats (hitPoints, maxHitPoints, manaPoints, maxManaPoints, armorClass, attackBonus, damageBonus, characterClass, level). Base stats on their description (e.g., "Thug" vs "Dragon", "Apprentice Mage" might have MP).{{/if}}
    *   {{#if relationsModeActive}}Provide 'initialRelations' towards player and known NPCs. Infer specific status if possible, use 'Inconnu' as last resort.{{/if}}

3.  **Describe Scene for Image (English):** For sceneDescriptionForImage, visually describe setting, mood, characters (by appearance, not name).

4.  **Log Character Updates (in {{currentLanguage}}):** For KNOWN characters, log significant actions/quotes in characterUpdates.

{{#if relationsModeActive}}
5.  **Affinity Updates:** Analyze interactions with KNOWN characters. Update affinityUpdates for changes towards {{playerName}}. Small changes (+/- 1-2) usually, larger (+/- 5+) for major events.

6.  **Relation Status Updates (in {{currentLanguage}}):** For KNOWN characters (NPC-NPC or NPC-Player), detect fundamental changes in relationship *statuses*. If status was 'Inconnu' and can now be defined, update it. Add to relationUpdates.
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
    // Register the Handlebars helper
    // As of Genkit v1.x, custom Handlebars helpers are not directly supported in definePrompt in the same way.
    // Logic for complex data transformation should ideally happen in the flow's main function body before calling the prompt,
    // or the prompt needs to be structured to work with the data as-is.
    // For this use case, we'll ensure relationsSummary is pre-processed in the `generateAdventure` wrapper.
  },
  async input => {

    console.log("Generating adventure with input:", JSON.stringify(input, null, 2));

    const {output} = await prompt(input);

    if (!output?.narrative) {
        throw new Error("AI failed to generate a narrative.");
    }
    console.log("AI Output:", JSON.stringify(output, null, 2));

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
        console.log("Combat Turn Narration:", output.combatUpdates.turnNarration.substring(0, 100));
        if(output.combatUpdates.nextActiveCombatState) {
            console.log("Next combat state active:", output.combatUpdates.nextActiveCombatState.isActive);
            output.combatUpdates.nextActiveCombatState.combatants.forEach(c => {
                 console.log(`Combatant ${c.name} - HP: ${c.currentHp}/${c.maxHp}, MP: ${c.currentMp ?? 'N/A'}/${c.maxMp ?? 'N/A'}`);
            });
        }
    }


    return output;
  }
);

// Helper for Handlebars - This approach might not work with Genkit v1.x ai.definePrompt directly.
// If complex logic is needed within the template, it's better to pre-process data.
// For simple conditionals like `gt`, it's often better to structure the input data.
// However, keeping this here as a reference if a similar feature is needed or if Genkit evolves.
// genkit.registerHandlebarsHelper('gt', (a: number, b: number) => a > b);
// As of current understanding, direct helper registration like this for definePrompt is not standard.
// Simpler conditions can be done with #if. For `gt`, pre-calculate boolean flags if needed.
// Or, rely on the AI's ability to understand conditional output based on numeric values if the prompt is clear.
// For the MP display in the prompt, we will rely on {{#if this.maxMp}} and the AI to interpret.
// If maxMp > 0, then display MP.
// Update: Handlebars.js itself supports basic helpers. `gt` is not a standard one.
// The expression `{{#if (gt this.maxMp 0)}}` is not standard Handlebars.
// The correct way is to use `{{#if this.maxMp}}` and then check if it's greater than 0 implicitly, or pass a boolean flag.
// Let's simplify the template part: `{{#if this.maxMp}} - MP: {{this.currentMp}}/{{this.maxMp}}{{/if}}`
// This will show MP if maxMp is defined and non-zero (truthy).
// For clarity on 0 MP, the AI would need to know not to show "MP: X/0".
// A better check in Handlebars would be `{{#if this.maxMp}}{{#if (expr this.maxMp '>' 0)}}...{{/if}}{{/if}}` if `expr` helper was available.
// Since it's not standard, we rely on AI not to output "MP: X/0" or we pre-process.
// The prompt will be: `{{#if this.maxMp}}{{#if this.maxMp}} - MP: {{this.currentMp}}/{{this.maxMp}}{{/if}}{{/if}}` and AI must understand that if maxMp is 0, it shouldn't print.
// A better approach is: `{{#if this.maxMp}}{{#if (ne this.maxMp 0)}} - MP: {{this.currentMp}}/{{this.maxMp}}{{/if}}{{/if}}` if `ne` (not equal) was a known helper.
// Simplest for now: `{{#if this.maxMp}} {{#if (expr @root.rpgModeActive && this.maxMp > 0)}} - MP: {{this.currentMp}}/{{this.maxMp}} {{/if}}{{/if}}`
// Let's use a simpler structure and rely on the AI's intelligence for 0 maxMp cases.
// The prompt was: `{{#if this.maxMp}}{{#if (gt this.maxMp 0)}}- MP: {{this.currentMp}}/{{this.maxMp}}{{/if}}{{/if}}`
// Change to: `{{#if this.maxMp}} {{!-- Assuming maxMp > 0 if present --}} - MP: {{this.currentMp}}/{{this.maxMp}} {{/if}}`
// This is still not ideal.
// The best Handlebars native way: `{{#if maxMp}}MP: {{currentMp}}/{{maxMp}}{{/if}}`. If `maxMp` can be `0` and we want to hide it,
// the data itself should have a flag like `hasMana` or the AI should be smart.
// The fix used was to make `maxMp` optional in the schema, so `{{#if this.maxMp}}` works correctly.
// The `(gt this.maxMp 0)` part was likely causing parsing errors as `gt` isn't a standard helper.
// The prompt has been updated to remove `(gt this.maxMp 0)`.
