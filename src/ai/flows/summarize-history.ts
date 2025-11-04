'use server';
/**
 * @fileOverview This file acts as a router for the memorize event AI flow.
 * It determines which underlying implementation to use based on the provided AI configuration.
 */

import { memorizeEventWithGenkit } from './summarize-history-genkit';
import { memorizeEventWithOpenRouter } from './summarize-history-openrouter';
import { memorizeEventWithLocalLlm } from './summarize-history-local';
import type { MemorizeEventInput, MemorizeEventOutput } from './summarize-history-schemas';

// The main flow function that acts as a router
export async function memorizeEvent(input: MemorizeEventInput): Promise<MemorizeEventOutput> {
    const { aiConfig } = input;

    if (aiConfig?.llm.source === 'openrouter') {
        return memorizeEventWithOpenRouter(input);
    }
    
    if (aiConfig?.llm.source === 'local') {
        return memorizeEventWithLocalLlm(input);
    }
    
    // Default to Genkit/Gemini
    return memorizeEventWithGenkit(input);
}
