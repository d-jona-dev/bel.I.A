"use server";
/**
 * @fileOverview This file acts as a router for the creative assistant AI flow.
 * It determines which underlying implementation to use (Gemini, OpenRouter, Local)
 * based on the provided AI configuration.
 */

import type { AiConfig } from '@/types';
import { creativeAssistantWithGemini } from '@/ai/flows/creative-assistant-gemini';
import { creativeAssistantWithOpenRouter } from '@/ai/flows/creative-assistant-openrouter';
import { creativeAssistantWithLocalLlm } from '@/ai/flows/creative-assistant-local';
import type { CreativeAssistantInput, CreativeAssistantOutput } from './creative-assistant-schemas';

export async function creativeAssistant(input: CreativeAssistantInput): Promise<CreativeAssistantOutput> {
    const { aiConfig } = input;

    if (aiConfig?.llm.source === 'openrouter') {
        return creativeAssistantWithOpenRouter(input);
    }
    
    if (aiConfig?.llm.source === 'local') {
        return creativeAssistantWithLocalLlm(input);
    }
    
    // Default to Genkit/Gemini
    return creativeAssistantWithGemini(input);
}
