
'use server';

/**
 * @fileOverview Generates adventure narratives based on world, initial situation, characters, and user actions.
 * Includes optional RPG context handling and provides scene descriptions for image generation.
 * Detects newly introduced characters, logs significant character events/quotes in the specified language,
 * and calculates changes in character affinity towards the player. Includes character relations.
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
  relations: z.record(z.string()).optional().describe("Relationship towards other characters/player (key: character ID or 'player', value: description e.g., 'Petite amie', 'Ami')"),
  // Add other fields explicitly used in the prompt or logic if needed
  // For simplicity, relying on passthrough() for less critical fields
}).passthrough();

// Define a schema specifically for the history summary and pre-processed relations summary
const ContextSummarySchema = z.object({
    historySummary: z.string().optional().describe('A brief summary of the last few history entries.'),
    relationsSummary: z.string().optional().describe('A pre-processed summary of the character\'s relations for prompt context.'), // Added relations summary field
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
  characters: z.array(CharacterWithContextSummarySchema).describe('Array of currently known characters with their details, including current affinity, relations summary, and history summary.'),
  userAction: z.string().describe('The action taken by the user.'),
  currentLanguage: z.string().describe('The current language code (e.g., "fr", "en") for generating history entries.'),
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
    details: z.string().optional().describe("A brief description of the new character derived from the narrative context, including the location/circumstance of meeting if possible."),
    initialHistoryEntry: z.string().optional().describe("A brief initial history entry (in the specified language) about meeting the character, including location if identifiable."),
    // Potentially suggest initial relations based on context? (More complex)
    // initialRelations: z.record(z.string()).optional().describe("Suggested initial relations based on meeting context (towards player and existing characters).")
});

// Define schema for character history updates
const CharacterUpdateSchema = z.object({
    characterName: z.string().describe("The name of the known character involved."),
    historyEntry: z.string().describe("A concise summary (in the specified language) of a significant action or quote by this character in the current narrative segment."),
});

// Define schema for affinity updates - Updated description for change magnitude
const AffinityUpdateSchema = z.object({
    characterName: z.string().describe("The name of the known character whose affinity changed."),
    change: z.number().int().describe("The integer change in affinity (+/-). Keep changes **small and gradual** for typical interactions (e.g., +2 for a kind word, -3 for a minor disagreement, 0 for neutral). Reserve larger changes (+/- 10 or more) for major story events or betrayals/heroic acts. Affinity is 0 (hate) to 100 (love/devotion), 50 is neutral."),
    reason: z.string().optional().describe("Brief justification for the affinity change based on the interaction.")
});

// Define schema for relation updates (New)
const RelationUpdateSchema = z.object({
    characterName: z.string().describe("The name of the character whose relation is updated."),
    targetName: z.string().describe("The name of the target character or the player name."),
    newRelation: z.string().describe("The new description of the relationship (e.g., 'Ennemi juré', 'Ami proche', 'Ex-petite amie')."),
    reason: z.string().optional().describe("Brief justification for the relation change based on the interaction.")
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
    .describe('List of characters newly introduced in this narrative segment.'),
  characterUpdates: z
    .array(CharacterUpdateSchema)
    .optional()
    .describe('List of significant events or quotes involving known characters in this narrative segment, for logging in their history. MUST be in the specified language.'),
  affinityUpdates: z
    .array(AffinityUpdateSchema)
    .optional()
    .describe("List of affinity changes for known characters based on the user's action and the resulting narrative."),
  relationUpdates: z // Added relation updates
    .array(RelationUpdateSchema)
    .optional()
    .describe("List of relationship changes between characters or towards the player based on the narrative.")
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
        let relationsSummary = "Aucune définie.";
        if (char.relations) {
            const relationEntries = Object.entries(char.relations)
                .map(([targetId, description]) => {
                    const targetName = targetId === 'player'
                        ? input.playerName // Use provided player name
                        : input.characters.find(c => c.id === targetId)?.name || targetId; // Find name or use ID
                    return `${targetName}: ${description}`;
                });
            if (relationEntries.length > 0) {
                relationsSummary = relationEntries.join(', ');
            }
        }

        return {
            ...char, // Spread existing character properties
            details: char.details || "No details provided.",
            affinity: char.affinity ?? 50,
            relations: char.relations || { ['player']: "Inconnu" }, // Ensure relations exist
            historySummary: historySummary,
            relationsSummary: relationsSummary, // Add the pre-processed summary
        };
    });

    const flowInput: z.infer<typeof GenerateAdventureInputSchema> = {
        ...input,
        characters: processedCharacters,
    };

  return generateAdventureFlow(flowInput);
}

// Removed the resolveRelationNames helper function as it's replaced by pre-processing


// Update Prompt Definition to use the internal schema with historySummary and relationsSummary
const prompt = ai.definePrompt({
  name: 'generateAdventurePrompt',
  input: {
    schema: GenerateAdventureInputSchema, // Use the updated internal input schema
  },
  output: {
    schema: GenerateAdventureOutputSchema, // Use the updated output schema
  },
  // Removed helpers registration
  // helpers: { resolveRelationNames },
  // Updated Handlebars prompt - Use pre-processed relationsSummary
  prompt: `You are an interactive fiction engine. Weave a cohesive and engaging story based on the context provided. The player character's name is **{{playerName}}**. The target language for history entries is {{currentLanguage}}.

World: {{{world}}}

Current Situation/Recent Narrative:
{{{initialSituation}}}

Known Characters:
{{#each characters}}
- Name: {{this.name}}
  Description: {{this.details}}
  Current Affinity towards {{../playerName}}: **{{this.affinity}}/100** (This score **DICTATES** their feelings and behavior towards {{../playerName}} on a scale from 0=Hate to 100=Love/Devotion. 50 is Neutral. **ADHERE STRICTLY TO THE LEVELS DESCRIBED BELOW.**)
  Relations: {{{this.relationsSummary}}} {{! Use the pre-processed summary }}
  {{#if this.characterClass}}Class: {{this.characterClass}}{{/if}}
  {{#if this.level}}Level: {{this.level}}{{/if}}
  {{#if this.stats}}Stats: {{#each this.stats}}{{@key}}: {{this}} {{/each}}{{/if}}
  {{#if this.inventory}}Inventory: {{#each this.inventory}}{{@key}}: {{this}} ({{this}}) {{/each}}{{/if}}
  History (summary): {{{this.historySummary}}}
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
1.  **Generate the "Narrative Continuation":** Write the next part of the story based on all context and the user's action. Be creative and engaging.
    **CRITICAL: Each known character's behavior, dialogue, actions, and internal thoughts (if appropriate) MUST STRONGLY AND CLEARLY REFLECT their 'Current Affinity' towards {{playerName}}. DO NOT DEVIATE.** Use the following affinity levels as a **strict guide**:
    *   **0-10 (Haine Profonde / Deep Hate):** Openly hostile, insulting, aggressive, disgusted. Actively sabotages or attacks {{playerName}}. REFUSES cooperation entirely. Dialogue is filled with contempt and vitriol. Actions are malicious.
    *   **11-30 (Hostile):** Uncooperative, distrustful, rude, sarcastic, cold. Avoids {{playerName}} or speaks negatively about them. May hinder {{playerName}} indirectly. Dialogue is sharp and dismissive. Actions are obstructionist.
    *   **31-45 (Méfiant / Wary):** Cautious, reserved, suspicious, guarded. Dialogue is curt, minimal, and evasive. Avoids sharing information. Actions are purely self-serving. Body language is closed off and tense.
    *   **46-55 (Neutre / Neutral):** Indifferent, polite but distant. Interactions are purely transactional or professional. Neither helps nor hinders unnecessarily. Normal, unremarkable, standard behavior. Dialogue is functional.
    *   **56-70 (Amical / Friendly):** Generally cooperative, willing to chat amiably. May offer minor assistance or advice freely. Shows basic positive regard and warmth. Dialogue is pleasant.
    *   **71-90 (Loyal):** Warm, supportive, actively helpful and protective. Trusts {{playerName}} and shares information/resources readily. Enjoys {{playerName}}'s company. May defend or assist {{playerName}} proactively. Compliments are genuine and frequent. Dialogue is open and encouraging.
    *   **91-100 (Dévoué / Amour / Devoted / Love):** Deep affection, unwavering loyalty. Prioritizes {{playerName}}'s well-being above their own, potentially taking significant risks. Expresses strong positive emotions (admiration, love, devotion). May confide secrets or declare feelings if contextually appropriate. Actions demonstrate selflessness towards {{playerName}}. Dialogue is filled with warmth and care.
    **ALSO CONSIDER** the defined 'Relations' between characters (summarized in {{{this.relationsSummary}}}). Their interactions should reflect these relationships (e.g., allies help each other, rivals compete).

2.  **Identify New Characters:** Analyze the "Narrative Continuation". List any characters mentioned by name that are NOT in the "Known Characters" list above in the 'newCharacters' field. Include their name, a brief description derived from the context, and the location/circumstance of meeting (if possible) in the description and/or 'initialHistoryEntry'. Ensure 'initialHistoryEntry' is in the target language: {{currentLanguage}}.

3.  **Describe the Scene for Image:** Provide a concise visual description for 'sceneDescriptionForImage'. Focus on setting, mood, key visual elements, and characters present. IMPORTANT: Describe characters by physical appearance or role (e.g., "a tall man with blond hair", "the shopkeeper") INSTEAD of their names. Omit or summarize ("Character thinking") if no strong visual scene.

4.  **Log Character Updates:** Analyze the "Narrative Continuation". For each **KNOWN character** involved in a significant action or memorable quote, create a brief 'historyEntry' summarizing it in the target language: {{currentLanguage}}. Add these to the 'characterUpdates' field. Include location if relevant (e.g., "At the market, Rina said...").

5.  **Calculate Affinity Updates:** Analyze {{playerName}}'s interaction with **KNOWN characters** in the "Narrative Continuation". Determine how events affect affinity (0-100 scale). Add entries to 'affinityUpdates' with the character's name, the integer change (+/-), and a brief 'reason'. **IMPORTANT: Keep changes small and gradual (+/- 1 to 3) for most interactions. Only use larger changes (+/- 5 to 10) for truly major events (life-saving, betrayal, etc.).**

6.  **Detect Relation Updates:** Analyze the "Narrative Continuation" for significant changes in relationships between **KNOWN characters** or between a character and **{{playerName}}**. If a relationship fundamentally changes (e.g., becoming enemies, lovers, rivals, ex-partners), add an entry to 'relationUpdates'. Include the source character's name, the target's name (or {{playerName}}), the new relation description, and a brief reason.

Narrative Continuation:
[Generate the next part of the story here, **strictly reflecting character affinities towards {{playerName}} and inter-character relations** as described in Task 1.]
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

    // Return the full output including scene description, new characters, updates, etc.
    return output;
  }
);

