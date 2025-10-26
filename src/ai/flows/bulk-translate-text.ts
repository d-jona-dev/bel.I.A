
'use server';
/**
 * @fileOverview A bulk text translation AI agent.
 * Takes a source text and translates it into multiple target languages in one call.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const LANGUAGE_CODES = ['en', 'es', 'it', 'de', 'ja', 'ru', 'zh', 'pt', 'hi'];

const BulkTranslateInputSchema = z.object({
  text: z.string().describe('The source text to translate.'),
  sourceLanguage: z.string().describe('The language of the source text (e.g., "fr", "en").'),
  targetLanguages: z.array(z.string()).describe('An array of language codes to translate the text into.'),
});

// The output schema will be dynamic, so we use z.record
const BulkTranslateOutputSchema = z.record(z.string(), z.string()).describe(
    "An object where keys are the target language codes and values are the translated texts."
);

export type BulkTranslateInput = z.infer<typeof BulkTranslateInputSchema>;
export type BulkTranslateOutput = z.infer<typeof BulkTranslateOutputSchema>;


const prompt = ai.definePrompt({
    name: 'bulkTranslatePrompt',
    input: { schema: BulkTranslateInputSchema },
    output: { schema: BulkTranslateOutputSchema },
    prompt: `You are a professional translator. Translate the following text from '{{sourceLanguage}}' into each of the target languages listed.
The output MUST be a valid JSON object where each key is a language code from the target list and the value is the translated text in that language.

Source Text:
"{{{text}}}"

Target Languages: {{#each targetLanguages}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.

CRITICAL: Provide ONLY the JSON object. Do not add any extra text, explanations, or markdown.`,
});


export const bulkTranslateText = ai.defineFlow(
    {
        name: 'bulkTranslateTextFlow',
        inputSchema: BulkTranslateInputSchema,
        outputSchema: BulkTranslateOutputSchema,
    },
    async (input): Promise<BulkTranslateOutput> => {
        try {
            const { output } = await prompt(input);
            if (!output) {
                throw new Error('AI failed to return a translation object.');
            }
            return output;
        } catch (e: any) {
            console.error("Error in bulkTranslateText flow:", e);
            const errorMessage = e.message || String(e);
             if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
                 throw new Error("Le quota de l'API de traduction a été dépassé. Veuillez réessayer plus tard.");
            }
            if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
                 throw new Error("Le modèle d'IA de traduction est actuellement surchargé. Veuillez réessayer.");
            }
            throw new Error(`Erreur de traduction en masse : ${errorMessage}`);
        }
    }
);
