'use server';

/**
 * @fileOverview Generates adventure narratives based on world, initial situation, characters, and user actions.
 * Includes optional RPG context handling and provides scene descriptions for image generation.
 * Detects newly introduced characters, logs significant character events/quotes in the specified language,
 * and calculates changes in character affinity towards the player. Includes dynamic character relation updates (player-NPC and NPC-NPC).
 *
 * - generateAdventure - A function that generates adventure narratives.
 * - GenerateAdventureInput - The input type for the generateAdventure function.
 * - GenerateAdventureOutput - The return type for the generateAdventure function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { Character } from '@/types'; // Import Character type for better context

// Define RPG context schema (optional) - Kept from previous version
const RpgContextSchema = z.object({
    playerStats: z.record(z.union([z.string(), z.number()])).optional().describe("Player character's statistics (e.g., HP, STR)."),
    characterDetails: z.array(z.object({
        name: z.string(),
        details: z.string().optional().describe("Brief description of the character for context."),
        stats: z.record(z.union([z.string(), z.number()])).optional().describe("Character's statistics."),
        inventory: z.record(z.number()).optional().describe("Character's inventory (item name: quantity)."),
        relations: z.string().optional().describe("Summary of relations towards player and others.") // Added relations summary
    })).optional().describe("Details of relevant secondary characters already known."),
    mode: z.enum(["exploration", "dialogue", "combat"]).optional().describe("Current game mode."),
}).optional();

// Define a base schema for essential Character properties for internal use
// Using passthrough() to allow other properties defined in the Character type
const BaseCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  details: z.string(),
  affinity: z.number().optional().default(50).describe("Affinity score (0-100) indicating the character's feeling towards the player. 0=Hate, 50=Neutral, 100=Love/Devotion."),
  relations: z.record(z.string(), z.string()).optional().describe("Relationship towards other characters/player (key: character ID or 'player', value: description e.g., 'Petite amie', 'Ami'). MUST be in the specified language."),
  // Add other fields explicitly used in the prompt or logic if needed
  // For simplicity, relying on passthrough() for less critical fields
}).passthrough();

// Define a schema specifically for the history summary and pre-processed relations summary
const ContextSummarySchema = z.object({
    historySummary: z.string().optional().describe('A brief summary of the last few history entries.'),
    relationsSummary: z.string().optional().describe('A pre-processed summary of the character\'s relations for prompt context. MUST be in the specified language.'), // Added relations summary field
});

// Combine the base character schema and the summary schema
const CharacterWithContextSummarySchema = z.intersection(
    BaseCharacterSchema,
    ContextSummarySchema
);

// Define the internal type based on the intersection schema
type CharacterWithContextSummary = z.infer<typeof CharacterWithContextSummarySchema>;


// Update Input Schema - include characters with history and relations summaries, current language, and player name
const GenerateAdventureInputSchema = z.object({
  world: z.string().describe('Detailed description of the game world.'),
  initialSituation: z.string().describe('The current situation or narrative state, including recent events and dialogue.'),
  // Pass characters with pre-processed summaries
  characters: z.array(CharacterWithContextSummarySchema).describe('Array of currently known characters with their details, including current affinity, relations summary, and history summary. Relations and history summaries MUST be in the specified language.'),
  userAction: z.string().describe('The action taken by the user.'),
  currentLanguage: z.string().describe('The current language code (e.g., "fr", "en") for generating history entries and new character details.'),
  playerName: z.string().describe('The name of the player character.'),
  promptConfig: z.object({
      rpgContext: RpgContextSchema.optional()
  }).optional(),
});
// We still expose the original Character type for external use
export type GenerateAdventureInput = Omit<z.infer<typeof GenerateAdventureInputSchema>, 'characters'> & {
    characters: Character[];
};


// Define schema for newly introduced characters
const NewCharacterSchema = z.object({
    name: z.string().describe("The name of the newly introduced character."),
    details: z.string().optional().describe("A brief description of the new character derived from the narrative context, including the location/circumstance of meeting if possible. MUST be in the specified language."),
    initialHistoryEntry: z.string().optional().describe("A brief initial history entry (in the specified language) about meeting the character, including location if identifiable. MUST be in the specified language."),
    // Suggest initial relations based on context
    initialRelations: z.object({}).passthrough().optional().describe("Suggested initial relations for the new character based on the meeting context (towards player and existing characters). Keys should be character names (or player's name), values are relation descriptions (e.g., 'Ami potentiel', 'Suspect'). MUST be in the specified language.")
});

// Define schema for character history updates
const CharacterUpdateSchema = z.object({
    characterName: z.string().describe("The name of the known character involved."),
    historyEntry: z.string().describe("A concise summary (in the specified language) of a significant action or quote by this character in the current narrative segment. MUST be in the specified language."),
});

// Define schema for affinity updates - Updated description for change magnitude
const AffinityUpdateSchema = z.object({
    characterName: z.string().describe("The name of the known character whose affinity **towards the player** changed."),
    change: z.number().int().describe("The integer change in affinity towards the player (+/-). Keep changes **very small and gradual** for typical interactions (e.g., +1 for a kind word, -2 for a minor disagreement, 0 for neutral). Reserve larger changes (+/- 5 or more) for major story events or betrayals/heroic acts. Affinity is 0 (hate) to 100 (love/devotion), 50 is neutral."),
    reason: z.string().optional().describe("Brief justification for the affinity change based on the interaction.")
});

// Define schema for relation updates (New) - Target can be player or another character
const RelationUpdateSchema = z.object({
    characterName: z.string().describe("The name of the character whose relation is updated (the source)."),
    targetName: z.string().describe("The name of the target character OR the player's name."), // Use name for easier processing later
    newRelation: z.string().describe("The new description of the relationship from the source's perspective (e.g., 'Ennemi juré', 'Ami proche', 'Ex-petite amie', 'Rival', 'Amant secret', 'Confidente'). Be specific and clear. MUST be in the specified language."),
    reason: z.string().optional().describe("Brief justification for the relation change based on the narrative interaction or event.")
});


// Update Output Schema to include sceneDescriptionForImage, newCharacters, characterUpdates, affinityUpdates, and relationUpdates
const GenerateAdventureOutputSchema = z.object({
  narrative: z.string().describe('The generated narrative continuation.'),
  sceneDescriptionForImage: z
    .string()
    .optional()
    .describe('A concise visual description of the current scene, suitable for an image generation prompt. Describe characters using their physical appearance, not their names.'),
  newCharacters: z
    .array(NewCharacterSchema)
    .optional()
    .describe('List of characters newly introduced in this narrative segment. All textual fields (details, history, relations) MUST be in the specified language.'),
  characterUpdates: z
    .array(CharacterUpdateSchema)
    .optional()
    .describe('List of significant events or quotes involving known characters in this narrative segment, for logging in their history. MUST be in the specified language.'),
  affinityUpdates: z
    .array(AffinityUpdateSchema)
    .optional()
    .describe("List of affinity changes for known characters **towards the player** based on the user's action and the resulting narrative."),
  relationUpdates: z // Added relation updates
    .array(RelationUpdateSchema)
    .optional()
    .describe("List of relationship changes between characters OR towards the player based on the narrative. Capture changes like becoming lovers, enemies, rivals, etc. MUST be in the specified language.")
});
export type GenerateAdventureOutput = z.infer<typeof GenerateAdventureOutputSchema>;

// The externally exposed function takes the original Character type
export async function generateAdventure(input: GenerateAdventureInput): Promise<GenerateAdventureOutput> {
    // Pre-process characters before calling the internal flow
    const processedCharacters: CharacterWithContextSummary[] = input.characters.map(char => {
        // History Summary
        const history = char.history || [];
        const lastThreeEntries = history.slice(-3);
        const historySummary = lastThreeEntries.length > 0 ? lastThreeEntries.join(' | ') : 'None';

        // Relations Summary (replaces the helper function)
        let relationsSummary = "Aucune définie."; // Default in French, should adapt if language changes or be provided by AI
        if (char.relations) {
            const relationEntries = Object.entries(char.relations)
                .map(([targetId, description]) => {
                    const targetName = targetId === 'player'
                        ? input.playerName // Use provided player name
                        : input.characters.find(c => c.id === targetId)?.name || targetId; // Find name or use ID
                    return `${targetName}: ${description}`; // Description already in target language from previous steps or AI
                });
            if (relationEntries.length > 0) {
                relationsSummary = relationEntries.join(', ');
            }
        }

        return {
            ...char, // Spread existing character properties
            details: char.details || "No details provided.", // Details should be in target language
            affinity: char.affinity ?? 50,
            relations: char.relations || { ['player']: "Inconnu" }, // Ensure relations exist, default to French "Inconnu"
            historySummary: historySummary, // History entries already in target language
            relationsSummary: relationsSummary, // Add the pre-processed summary, already in target language
        };
    });

    const flowInput: z.infer<typeof GenerateAdventureInputSchema> = {
        ...input,
        characters: processedCharacters,
    };

  return generateAdventureFlow(flowInput);
}


// Update Prompt Definition to use the internal schema with historySummary and relationsSummary
const prompt = ai.definePrompt({
  name: 'generateAdventurePrompt',
  input: {
    schema: GenerateAdventureInputSchema, // Use the updated internal input schema
  },
  output: {
    schema: GenerateAdventureOutputSchema, // Use the updated output schema
  },
  // Updated Handlebars prompt - Use pre-processed relationsSummary and refined instructions
  prompt: `You are an interactive fiction engine. Weave a cohesive and engaging story based on the context provided. The player character's name is **{{playerName}}**. The target language for ALL textual outputs (narrative, character details, history entries, relation descriptions) is **{{currentLanguage}}**.

World: {{{world}}}

Current Situation/Recent Narrative:
{{{initialSituation}}}

Known Characters:
{{#each characters}}
- Name: {{this.name}}
  Description: {{this.details}} {{! MUST be in {{../currentLanguage}} }}
  Current Affinity towards {{../playerName}}: **{{this.affinity}}/100** (This score **DICTATES** their feelings and behavior towards {{../playerName}} on a scale from 0=Hate to 100=Love/Devotion. 50 is Neutral. **ADHERE STRICTLY TO THE LEVELS DESCRIBED BELOW.**)
  Relations: {{{this.relationsSummary}}} {{! This summarizes this character's relationship TOWARDS others. MUST be in {{../currentLanguage}} }}
  {{#if this.characterClass}}Class: {{this.characterClass}}{{/if}}
  {{#if this.level}}Level: {{this.level}}{{/if}}
  {{#if this.stats}}Stats: {{#each this.stats}}{{@key}}: {{this}} {{/each}}{{/if}}
  {{#if this.inventory}}Inventory: {{#each this.inventory}}{{@key}}: {{this}} ({{this}}) {{/each}}{{/if}}
  History (summary): {{{this.historySummary}}} {{! MUST be in {{../currentLanguage}} }}
{{/each}}

User Action (from {{playerName}}): {{{userAction}}}

{{#if promptConfig.rpgContext}}
--- RPG Context ---
Mode: {{promptConfig.rpgContext.mode}}
{{#if promptConfig.rpgContext.playerStats}}
Player Stats ({{../playerName}}): {{#each promptConfig.rpgContext.playerStats}}{{@key}}: {{this}} {{/each}}
{{/if}}
{{! Character details including relations are now part of the main character list }}
---
{{/if}}

Tasks:
1.  **Generate the "Narrative Continuation" (in {{currentLanguage}}):** Write the next part of the story based on all context and the user's action. Be creative and engaging.
    **CRITICAL: Each known character's behavior, dialogue, actions, and internal thoughts (if appropriate) MUST STRONGLY AND CLEARLY REFLECT their 'Current Affinity' towards {{playerName}}. DO NOT DEVIATE.** Use the following affinity levels as a **strict guide**:
    *   **0-10 (Haine Profonde / Deep Hate):** Openly hostile, insulting, aggressive, disgusted. Actively sabotages or attacks {{playerName}}. REFUSES cooperation entirely. Dialogue is filled with contempt and vitriol. Actions are malicious.
    *   **11-30 (Hostile):** Uncooperative, distrustful, rude, sarcastic, cold. Avoids {{playerName}} or speaks negatively about them. May hinder {{playerName}} indirectly. Dialogue is sharp and dismissive. Actions are obstructionist.
    *   **31-45 (Méfiant / Wary):** Cautious, reserved, suspicious, guarded. Dialogue is curt, minimal, and evasive. Avoids sharing information. Actions are purely self-serving. Body language is closed off and tense.
    *   **46-55 (Neutre / Neutral):** Indifferent, polite but distant. Interactions are purely transactional or professional. Neither helps nor hinders unnecessarily. Normal, unremarkable, standard behavior. Dialogue is functional.
    *   **56-70 (Amical / Friendly):** Generally cooperative, willing to chat amiably. May offer minor assistance or advice freely. Shows basic positive regard and warmth. Dialogue is pleasant.
    *   **71-90 (Loyal):** Warm, supportive, actively helpful and protective. Trusts {{playerName}} and shares information/resources readily. Enjoys {{playerName}}'s company. May defend or assist {{playerName}} proactively. Compliments are genuine and frequent. Dialogue is open and encouraging.
    *   **91-100 (Dévoué / Amour / Devoted / Love):** Deep affection, unwavering loyalty. Prioritizes {{playerName}}'s well-being above their own, potentially taking significant risks. Expresses strong positive emotions (admiration, love, devotion). May confide secrets or declare feelings if contextually appropriate. Actions demonstrate selflessness towards {{playerName}}. Dialogue is filled with warmth and care.
    **ALSO CONSIDER** the defined 'Relations' **between** characters (summarized for each character in their 'Relations: {{{this.relationsSummary}}}'). Their interactions with EACH OTHER should reflect these relationships (e.g., allies help each other, rivals compete, lovers are affectionate). **These relationships can also change based on events in the narrative (see Task 6).** Ensure all character interactions in the narrative adhere to these established relations and affinities.

2.  **Identify New Characters (all text in {{currentLanguage}}):** Analyze the "Narrative Continuation". List any characters mentioned by name that are NOT in the "Known Characters" list above in the 'newCharacters' field.
    *   Include their 'name'.
    *   Provide 'details': a brief description derived from the context, including the location/circumstance of meeting (if possible). **MUST be in {{currentLanguage}}.**
    *   Provide 'initialHistoryEntry': a brief log about meeting the character (e.g., "Met {{playerName}} at the market."). **MUST be in {{currentLanguage}}.**
    *   Provide 'initialRelations': an object where keys are names of known characters or '{{playerName}}', and values are string descriptions of the new character's initial relation towards them (e.g., { "{{playerName}}": "Curieux", "Rina": "Indifférent" }). Base this on the context of their introduction. If no specific interaction implies a relation, use "Inconnu" (or its {{currentLanguage}} equivalent). **ALL relation descriptions MUST be in {{currentLanguage}}.**

3.  **Describe the Scene for Image (in English, for image model):** Provide a concise visual description for 'sceneDescriptionForImage'. Focus on setting, mood, key visual elements, and characters present. IMPORTANT: Describe characters by physical appearance or role (e.g., "a tall man with blond hair", "the shopkeeper", "a young woman with brown hair") INSTEAD of their names. Omit or summarize ("Character thinking") if no strong visual scene.

4.  **Log Character Updates (in {{currentLanguage}}):** Analyze the "Narrative Continuation". For each **KNOWN character** involved in a significant action or memorable quote, create a brief 'historyEntry' summarizing it. Include location if relevant (e.g., "At the market, Rina said..."). Add these to the 'characterUpdates' field. **ALL history entries MUST be in {{currentLanguage}}.**

5.  **Calculate Affinity Updates (Player Interaction):** Analyze {{playerName}}'s interaction with **KNOWN characters** in the "Narrative Continuation". Determine how events affect the character's affinity **towards {{playerName}}** (0-100 scale). Add entries to 'affinityUpdates' with the character's name, the integer change (+/-), and a brief 'reason'. **IMPORTANT: Keep changes VERY small and gradual (+/- 1 or 2) for most interactions. Only use larger changes (+/- 5 or more) for truly major events (life-saving, betrayal, deep declaration of feelings, etc.).**

6.  **Detect Relation Updates (ALL Characters, in {{currentLanguage}}):** Analyze the "Narrative Continuation" for significant changes in relationships **between ANY two KNOWN characters** OR between a known character and **{{playerName}}**. If a relationship fundamentally changes (e.g., becoming enemies, lovers, rivals, ex-partners, mentor/mentee, servant/master) due to plot developments, add an entry to 'relationUpdates'.
    *   Include the source character's name (whose perspective is changing).
    *   Include the target's name (the character or {{playerName}} being viewed differently).
    *   Provide the *new* specific relation description from the source's perspective (e.g., 'Ennemi juré', 'Ami proche', 'Amant secret', 'Rivale', 'Mentor'). **Be specific with the new relation. This description MUST be in {{currentLanguage}}.**
    *   Include a brief 'reason' for the change.
    Only report if there is a *change*. **The narrative MUST reflect these changes immediately.**

Narrative Continuation (in {{currentLanguage}}):
[Generate the next part of the story here, **strictly reflecting character affinities towards {{playerName}} AND inter-character relations** as described in Task 1. **Crucially, incorporate any relationship changes detected in Task 6 into subsequent interactions and character behavior within this narrative segment and future ones.** Make the impact of affinity and relations **obvious** in dialogue and actions. Ensure ALL generated text is in **{{currentLanguage}}**.]
`,
});


// Flow definition using the internal schema
const generateAdventureFlow = ai.defineFlow<
  typeof GenerateAdventureInputSchema, // Input uses pre-processed characters
  typeof GenerateAdventureOutputSchema
>(
  {
    name: 'generateAdventureFlow',
    inputSchema: GenerateAdventureInputSchema, // Use internal schema
    outputSchema: GenerateAdventureOutputSchema,
  },
  async input => {

    console.log("Generating adventure with input:", JSON.stringify(input, null, 2)); // Log input for debugging

    const {output} = await prompt(input);

    if (!output?.narrative) {
        throw new Error("AI failed to generate a narrative.");
    }
    console.log("AI Output:", JSON.stringify(output, null, 2)); // Log the full output

    // Ensure new character details, history, and relations are in the specified language
    if (output.newCharacters) {
        output.newCharacters.forEach(nc => {
            // The prompt now requests these in the target language directly.
            // This is a fallback or logging step.
            if (nc.details) console.log(`New char ${nc.name} details language check (should be ${input.currentLanguage}): ${nc.details.substring(0,20)}`);
            if (nc.initialHistoryEntry) console.log(`New char ${nc.name} history language check (should be ${input.currentLanguage}): ${nc.initialHistoryEntry.substring(0,20)}`);
            if (nc.initialRelations) {
                Object.entries(nc.initialRelations).forEach(([target, desc]) => {
                     console.log(`New char ${nc.name} relation to ${target} language check (should be ${input.currentLanguage}): ${String(desc).substring(0,20)}`);
                });
            }
        });
    }
    if (output.characterUpdates) {
        output.characterUpdates.forEach(upd => {
            console.log(`History update for ${upd.characterName} language check (should be ${input.currentLanguage}): ${upd.historyEntry.substring(0,20)}`);
        });
    }
    if (output.relationUpdates) {
        output.relationUpdates.forEach(upd => {
             console.log(`Relation update for ${upd.characterName} towards ${upd.targetName} language check (should be ${input.currentLanguage}): ${upd.newRelation.substring(0,20)}`);
        });
    }


    // Return the full output including scene description, new characters, updates, etc.
    return output;
  }
);