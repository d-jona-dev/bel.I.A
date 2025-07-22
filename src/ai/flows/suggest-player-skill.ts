'use server';
/**
 * @fileOverview Suggests a player skill. For now, it suggests an initial class-based skill.
 *
 * - suggestPlayerSkill - A function that suggests a skill.
 * - SuggestPlayerSkillInput - The input type for the suggestPlayerSkill function.
 * - SuggestPlayerSkillOutput - The return type for the suggestPlayerSkill function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Schema definitions (not exported)
const SuggestPlayerSkillInputSchema = z.object({
  playerClass: z.string().describe("The player's character class (e.g., 'Guerrier', 'Mage', 'Voleur')."),
  playerLevel: z.number().int().min(1).describe("The player's current level."),
  currentLanguage: z.string().describe('The target language for the skill name and description (e.g., "fr", "en").'),
});
export type SuggestPlayerSkillInput = z.infer<typeof SuggestPlayerSkillInputSchema>;

const SuggestPlayerSkillOutputSchema = z.object({
    name: z.string().describe('The name of the suggested skill. MUST be in {{currentLanguage}}.'),
    description: z.string().describe('A brief description of what the skill does. MUST be in {{currentLanguage}}.'),
});
export type SuggestPlayerSkillOutput = z.infer<typeof SuggestPlayerSkillOutputSchema>;

// New type for the flow's return value, including potential errors
export type SuggestPlayerSkillFlowOutput = SuggestPlayerSkillOutput & { error?: string };


// Define the prompt locally; it will be used by the exported flow.
const suggestPlayerSkillPrompt = ai.definePrompt({
  name: 'suggestPlayerSkillPromptInternal', // Renamed to avoid conflict if used as flow name
  input: {schema: SuggestPlayerSkillInputSchema},
  output: {schema: SuggestPlayerSkillOutputSchema},
  prompt: `You are a game designer creating skills for a text-based RPG.
The player's class is {{playerClass}} and their current level is {{playerLevel}}.
The target language for the skill name and description is {{currentLanguage}}.

Suggest ONE iconic and simple-to-understand "class skill" suitable for a level {{playerLevel}} {{playerClass}}.
This skill should be a defining early ability for that class.
For example:
- If class is "Guerrier" (Warrior), suggest something like "Frappe Puissante" (Powerful Strike) or "Second Souffle" (Second Wind).
- If class is "Mage", suggest "Boule de Feu" (Fireball) or "Projectile Magique" (Magic Missile).
- If class is "Voleur" (Rogue), suggest "Attaque Furtive" (Sneak Attack) or "Discrétion" (Stealth).
- If class is "Étudiant", suggest something like "Concentration Accrue" (Heightened Focus) or "Débrouillardise" (Resourcefulness).

The skill name and description MUST be in {{currentLanguage}}.
Provide only the skill name and its description.
`,
});

// Export the flow function directly.
// The name of the exported const ('suggestPlayerSkill') is now also the flow's registered name.
export const suggestPlayerSkill = ai.defineFlow(
  {
    name: 'suggestPlayerSkill', // This is the name Genkit will register for this flow.
    inputSchema: SuggestPlayerSkillInputSchema,
    outputSchema: SuggestPlayerSkillOutputSchema, // This is for the AI, not the function's return
  },
  async (input: SuggestPlayerSkillInput): Promise<SuggestPlayerSkillFlowOutput> => {
    // Logic for handling playerLevel, if necessary, can go here.
    // For this specific flow, the prompt is geared towards level 1.
    if (input.playerLevel !== 1) {
        // This console.warn is fine for server-side logs.
        console.warn("Flow 'suggestPlayerSkill' (intended for level 1) called for level > 1. The prompt is geared for level 1 skills.");
    }

    try {
        const {output} = await suggestPlayerSkillPrompt(input); // Use the locally defined prompt

        if (!output?.name || !output?.description) {
          return { name: '', description: '', error: "AI failed to generate a skill name or description for suggestPlayerSkill flow." };
        }
        return { ...output, error: undefined };
    } catch (e: any) {
        console.error("Error in suggestPlayerSkill flow:", e);
        const errorMessage = e.message || String(e);
        if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
             return { name: '', description: '', error: "Le quota de l'API a été dépassé. Veuillez réessayer plus tard." };
        }
        if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
             return { name: '', description: '', error: "Le modèle d'IA est actuellement surchargé. Veuillez réessayer dans quelques instants." };
        }
        return { name: '', description: '', error: `Une erreur est survenue lors de la suggestion de compétence : ${errorMessage}`};
    }
  }
);
