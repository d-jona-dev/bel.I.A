

'use server';

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { Character, GenerateAdventureInput as GenkitFlowInputType, GenerateAdventureOutput, AffinityUpdateSchema, RelationUpdateSchema } from '@/types';
import { GenerateAdventureInputSchema, GenerateAdventureOutputSchema, CharacterWithContextSummarySchema } from '@/types';


// Modified return type for the flow and its wrapper
export type GenerateAdventureFlowOutput = GenerateAdventureOutput & { error?: string };

const getDefaultOutput = (errorMsg?: string): GenerateAdventureFlowOutput => ({
    narrative: errorMsg ? "" : "An error occurred, narrative could not be generated.",
    sceneDescriptionForImage: undefined,
    affinityUpdates: [],
    relationUpdates: [],
    newEvent: "",
    error: errorMsg,
});


async function commonAdventureProcessing(input: GenkitFlowInputType): Promise<z.infer<typeof GenerateAdventureInputSchema>> {
    const processedCharacters: z.infer<typeof CharacterWithContextSummarySchema>[] = input.characters.map(char => {
        
        let relationsSummaryText = Object.entries(char.relations || {})
                      .map(([targetId, description]) => {
                          const targetName = targetId === 'player'
                              ? input.playerName
                              : input.characters.find(c => c.id === targetId)?.name || targetId;
                          return `${targetName}: ${description}`;
                      })
                      .join('; ') || (input.currentLanguage === 'fr' ? 'Aucune relation définie.' : 'No relations defined.');

        return {
            id: char.id,
            name: char.name,
            details: char.details || (input.currentLanguage === 'fr' ? "Aucun détail fourni." : "No details provided."),
            biographyNotes: char.biographyNotes || (input.currentLanguage === 'fr' ? 'Aucune note biographique.' : 'No biographical notes.'),
            appearanceDescription: char.appearanceDescription || (input.currentLanguage === 'fr' ? 'Aucune description d\'apparence.' : 'No appearance description.'),
            affinity: char.affinity ?? 50,
            relations: char.relations || { ['player']: (input.currentLanguage === 'fr' ? "Inconnu" : "Unknown") },
            relationsSummary: relationsSummaryText,
            portraitUrl: char.portraitUrl,
        };
    });
    
    const flowInput: z.infer<typeof GenerateAdventureInputSchema> = {
        ...input,
        characters: processedCharacters,
        relationsModeActive: true,
        comicModeActive: true,
        narrativeStyle: input.narrativeStyle,
        aiConfig: input.aiConfig,
        playerPortraitUrl: input.playerPortraitUrl,
    };
    return flowInput;
}

const defaultSystemPrompt = `You are an interactive fiction engine for a relationship-focused game. Weave a cohesive and engaging story based on the context provided. The target language for ALL textual outputs (narrative, relation descriptions) is **{{currentLanguage}}**.

**Player Character:**
- **Name:** {{playerName}}
{{#if playerDetails}}- **Physical Description:** {{playerDetails}}{{/if}}
{{#if playerDescription}}- **Background/Personality:** {{playerDescription}}{{/if}}
{{#if playerOrientation}}- **Romantic Orientation:** {{playerOrientation}}{{/if}}

**Overall Goal: Maintain strict character consistency. Characters' dialogues, actions, and reactions MUST reflect their established personality, affinity, and relationships as detailed below. Their style of speech (vocabulary, tone, formality) MUST also be consistent with their persona.**
**The player ({{playerName}}) makes ALL decisions for their character. DO NOT narrate actions or thoughts for {{playerName}} that they haven't explicitly stated in 'User Action'. Only narrate the consequences of their action and the reactions of NPCs and the environment.**
**Start the narrative directly from the consequences of the user's action. DO NOT repeat or summarize the user's action.**
**NEW RULE: To avoid ambiguity, when an NPC performs an action, start the sentence with their name (e.g., "L'espionne prend une profonde inspiration..."). You can use pronouns for subsequent actions in the same paragraph.**
**COMIC MODE ACTIVE: Your narrative MUST be structured. Use {{narrativeStyle.dialogueStartSymbol}}...{{narrativeStyle.dialogueEndSymbol}} for all character speech. Use {{narrativeStyle.thoughtStartSymbol}}...{{narrativeStyle.thoughtEndSymbol}} for all character thoughts. Unadorned text is for pure narration.**

World: {{{world}}}

Current Situation/Recent Narrative (includes current event if any):
{{{initialSituation}}}

{{#if activeConditions}}
**Active Game Conditions to consider:**
{{#each activeConditions}}
- {{{this}}}
{{/each}}
{{/if}}

**Characters Present & Their Context:**
{{#each characters}}
- **Name:** {{this.name}}
  - **Contextual Details:** {{this.details}}
  {{#if this.biographyNotes}}
  - **Biography/Notes (internal context, do not reveal directly):** {{{this.biographyNotes}}}
  {{/if}}
  - **Current Affinity towards {{../playerName}}:** **{{this.affinity}}/100**. Behavior Guide:
    0-10 (Hate): Actively hostile, insulting.
    11-30 (Hostile): Disdainful, obstructive.
    31-45 (Wary): Suspicious, uncooperative.
    46-55 (Neutral): Indifferent, formal.
    56-70 (Friendly): Helpful, agreeable.
    71-90 (Loyal): Trusting, supportive.
    91-100 (Devoted): Self-sacrificing, deep affection.
  - **Relationship Statuses:** {{{this.relationsSummary}}}. These define the *nature* of the bond. If a relation is "Inconnu", try to define it based on current interactions.
  - **IMPORTANT: When this character speaks or acts, their words, tone, and decisions MUST be consistent with their Description and Affinity. Their style of speech (vocabulary, tone, formality) must also align.**
{{else}}
**No other characters are currently present.**
{{/each}}

User Action (from {{playerName}}): {{{userAction}}}

{{#if playerPortraitUrl}}
An image was attached to the user action. Take it into consideration when generating the narrative.
Attached Image: {{media url=playerPortraitUrl}}
{{/if}}

--- YOUR TASKS ---
1.  **Generate Narrative:** Write the next part of the story in {{currentLanguage}}.
2.  **Describe Scene for Image (in English):** 
    - For \`sceneDescriptionForImage.action\`, provide a MINIMAL description of the scene. Focus on **"who is doing what, and where"**. Include character NAMES, their key actions, and the environment. **DO NOT describe their physical appearance (hair color, clothes, etc.).** The application will inject these details later. Example: "The spy and the warrior are arguing in a tavern." or "The hero examines a glowing sword in a dark cave."
    - For \`sceneDescriptionForImage.cameraAngle\`, suggest a CREATIVE and DYNAMIC camera angle to make the scene more visually interesting. Examples: "dynamic low-angle shot", "dramatic close-up on the spy's face", "aerial view of the tavern", "over-the-shoulder shot from the warrior's perspective", "Dutch angle showing the tension". Leave empty if no specific angle comes to mind.
3.  **Affinity Updates:** Analyze interactions with KNOWN characters. Update \`affinityUpdates\` for changes towards {{playerName}}. Small changes (+/- 1-2) usually, larger (+/- 3-5, max +/-10 for extreme events). Justify with 'reason'.
4.  **Relation Status Updates (in {{currentLanguage}}):** Analyze the narrative for significant shifts in how characters view each other. If affinity crosses a major threshold or a significant event occurs, update \`relationUpdates\` with \`characterName\`, \`targetName\`, \`newRelation\`, and \`reason\`. If an existing relation is 'Inconnu', define it if possible.
5.  **Suggest New Event:** If the story dictates a change in the current event (e.g., "class ends"), fill the \`newEvent\` field in your JSON response with a short description. Otherwise, leave it as an empty string.

**CRITICAL RULE: The game engine is the master of time. DO NOT mention the time, the day, or how much time has passed in your narrative. Your ONLY job is to narrate the immediate consequences of the user action.**
**VERY IMPORTANT: You are NO LONGER responsible for detecting new characters. This is handled by a separate user action.**

You must respond with a valid JSON object strictly matching the output schema. No explanations, no Markdown, no text outside this structure.
`;

const prompt = ai.definePrompt({
  name: 'generateAdventurePrompt',
  input: {
    schema: GenerateAdventureInputSchema,
  },
  output: {
    schema: GenerateAdventureOutputSchema,
  },
  // Use the system prompt from the input if it exists, otherwise use the default
  system: `{{#if systemPrompt}}{{{systemPrompt}}}{{else}}${defaultSystemPrompt}{{/if}}`,
  prompt: `User Action (from {{playerName}}): {{{userAction}}}`, // The user prompt is now just the action
});

export async function generateAdventureWithGenkit(input: GenkitFlowInputType): Promise<GenerateAdventureFlowOutput> {
    try {
        const processedInput = await commonAdventureProcessing(input);
        
        // Pass the full processed input to the prompt, including the systemPrompt if it exists
        const { output } = await prompt(processedInput);
        
        if (!output) {
            return getDefaultOutput("AI response was empty.");
        }
        
        // Remove rpg/strategy fields from the output to be safe
        const cleanOutput: GenerateAdventureOutput = {
            narrative: output.narrative,
            sceneDescriptionForImage: output.sceneDescriptionForImage,
            affinityUpdates: output.affinityUpdates,
            relationUpdates: output.relationUpdates,
            newEvent: output.newEvent,
        };

        return { ...cleanOutput, error: undefined };

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
