
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

export const SuggestPlayerSkillInputSchema = z.object({
  playerClass: z.string().describe("The player's character class (e.g., 'Guerrier', 'Mage', 'Voleur')."),
  playerLevel: z.number().int().min(1).describe("The player's current level."),
  currentLanguage: z.string().describe('The target language for the skill name and description (e.g., "fr", "en").'),
  // existingSkills: z.array(z.string()).optional().describe("List of skills the player already possesses."),
  // suggestionType: z.enum(['initial', 'level_up']).default('initial').describe("Type of suggestion: 'initial' for the first skill, 'level_up' for subsequent skills."),
});
export type SuggestPlayerSkillInput = z.infer<typeof SuggestPlayerSkillInputSchema>;

export const SuggestedSkillSchema = z.object({
    name: z.string().describe('The name of the suggested skill. MUST be in {{currentLanguage}}.'),
    description: z.string().describe('A brief description of what the skill does. MUST be in {{currentLanguage}}.'),
    // category: z.enum(['class', 'social', 'utility']).optional().describe("The category of the skill. For an initial skill, it should usually be 'class'."),
});
export type SuggestedSkill = z.infer<typeof SuggestedSkillSchema>;


export const SuggestPlayerSkillOutputSchema = SuggestedSkillSchema; // For now, only one skill is suggested
export type SuggestPlayerSkillOutput = z.infer<typeof SuggestPlayerSkillOutputSchema>;


export async function suggestPlayerSkill(input: SuggestPlayerSkillInput): Promise<SuggestPlayerSkillOutput> {
  // For now, we only support initial skill suggestion which should be level 1.
  // The logic for level_up suggestions and multiple categories will be more complex.
  if (input.playerLevel !== 1) {
    // This part of the flow will be expanded later to handle level-up skill choices.
    // For now, we'll just return a placeholder or throw an error if used incorrectly.
    console.warn("SuggestPlayerSkill called for level > 1, but only initial skill (level 1) is currently supported for suggestion.");
    // Fallback to suggesting a generic skill if level > 1 for now.
  }
  return suggestPlayerSkillFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPlayerSkillPrompt',
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

const suggestPlayerSkillFlow = ai.defineFlow(
  {
    name: 'suggestPlayerSkillFlow',
    inputSchema: SuggestPlayerSkillInputSchema,
    outputSchema: SuggestPlayerSkillOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output?.name || !output?.description) {
      throw new Error("AI failed to generate a skill name or description.");
    }
    return output;
  }
);
