

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
    error: errorMsg,
});


async function commonAdventureProcessing(input: GenkitFlowInputType): Promise<z.infer<typeof GenerateAdventureInputSchema>> {
    const processedCharacters: z.infer<typeof CharacterWithContextSummarySchema>[] = input.characters.map(char => {
        
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
            appearanceDescription: char.appearanceDescription || (input.currentLanguage === 'fr' ? 'Aucune description d\'apparence.' : 'No appearance description.'),
            affinity: input.relationsModeActive ? (char.affinity ?? 50) : 50,
            relations: input.relationsModeActive ? (char.relations || { ['player']: (input.currentLanguage === 'fr' ? "Inconnu" : "Unknown") }) : {},
            relationsSummary: relationsSummaryText,
            portraitUrl: char.portraitUrl,
        };
    });
    
    const flowInput: z.infer<typeof GenerateAdventureInputSchema> = {
        ...input,
        characters: processedCharacters,
        relationsModeActive: input.relationsModeActive ?? true,
        comicModeActive: input.comicModeActive ?? true,
aiConfig: input.aiConfig,
        playerPortraitUrl: input.playerPortraitUrl,
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
  prompt: `You are an interactive fiction engine. Weave a cohesive and engaging story based on the context provided. The player character's name is **{{playerName}}**. The target language for ALL textual outputs (narrative, relation descriptions) is **{{currentLanguage}}**.

**Overall Goal: Maintain strict character consistency. Characters' dialogues, actions, and reactions MUST reflect their established personality, affinity, and relationships as detailed below. Their style of speech (vocabulary, tone, formality) MUST also be consistent with their persona.**
**The player ({{playerName}}) makes ALL decisions for their character. DO NOT narrate actions or thoughts for {{playerName}} that they haven't explicitly stated in 'User Action'. Only narrate the consequences of their action and the reactions of NPCs and the environment.**
**Start the narrative directly from the consequences of the user's action. DO NOT repeat or summarize the user's action.**

**COMIC MODE ACTIVE: Your narrative MUST be structured. Use double quotes ("...") for all character speech. Use asterisks (*...*) for all character thoughts. Unadorned text is for pure narration.**

World: {{{world}}}

Current Situation/Recent Narrative (includes time tag from the game engine):
{{{initialSituation}}}

**Characters Present & Their Appearance:**
{{#each characters}}
- **Name:** {{this.name}}
  - **Description:** {{this.details}}
  - **Appearance Details (for image generation):** {{this.appearanceDescription}}
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

Tasks:
1.  **Generate the "Narrative Continuation" (in {{currentLanguage}}):** Write the next part of the story. 
2.  **Describe Scene for Image (in English):** For \`sceneDescriptionForImage\`, visually describe the setting, mood, and characters. **CRUCIAL: Use the 'Appearance Details' provided for each character to describe them accurately (hair color, clothing, style, etc.). Do not use their names.**
3.  **Affinity Updates:** Analyze interactions with KNOWN characters. Update \`affinityUpdates\` for changes towards {{playerName}}. Small changes (+/- 1-2) usually, larger (+/- 3-5, max +/-10 for extreme events). Justify with 'reason'.
4.  **Relation Status Updates (in {{currentLanguage}}):** Analyze the narrative for significant shifts in how characters view each other. If affinity crosses a major threshold or a significant event occurs, update \`relationUpdates\` with \`characterName\`, \`targetName\`, \`newRelation\`, and \`reason\`. If an existing relation is 'Inconnu', define it if possible.

**CRITICAL RULE: The game engine is the master of time. DO NOT mention the time, the day, or how much time has passed in your narrative. Your ONLY job is to narrate the immediate consequences of the user action.**
**VERY IMPORTANT: You are NO LONGER responsible for detecting new characters. This is handled by a separate user action.**

Narrative Continuation (in {{currentLanguage}}):
[Generate ONLY the narrative text here. Do NOT include any JSON, code, or non-narrative text.]
`,
});

export async function generateAdventureWithGenkit(input: GenkitFlowInputType): Promise<GenerateAdventureFlowOutput> {
    try {
        const processedInput = await commonAdventureProcessing(input);
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
