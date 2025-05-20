
'use server';
/**
 * @fileOverview A simple chat AI agent for interacting with a single character.
 * Allows characters to recall past adventure events.
 *
 * - simpleChat - A function that handles the chat process with a character.
 * - SimpleChatInput - The input type for the simpleChat function.
 * - SimpleChatOutput - The return type for the simpleChat function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { MessagePart } from 'genkit'; // Import MessagePart

// Define the schema for individual chat messages in history
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']), // Gemini specific roles. 'system' messages will be mapped to 'user'.
  parts: z.array(z.object({ text: z.string() })),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const SimpleChatInputSchema = z.object({
  characterName: z.string().describe('The name of the character to chat with.'),
  characterDetails: z.string().describe('A brief description of the character, including personality traits, background, and how they might speak. This is CRUCIAL for the AI to adopt the persona.'),
  chatHistory: z.array(ChatMessageSchema).optional().describe('The history of the conversation so far. This should be the history *before* the current userMessage.'),
  userMessage: z.string().describe('The latest message from the user to the character.'),
  adventureContextSummary: z.string().optional().describe('A summary of key interactions or events this character had with the player during past adventures. This helps the character remember these events and discuss them if relevant.'),
});
export type SimpleChatInput = z.infer<typeof SimpleChatInputSchema>;

const SimpleChatOutputSchema = z.object({
  response: z.string().describe("The character's response to the user's message."),
});
export type SimpleChatOutput = z.infer<typeof SimpleChatOutputSchema>;

export async function simpleChat(input: SimpleChatInput): Promise<SimpleChatOutput> {
  return simpleChatFlow(input);
}


const prompt = ai.definePrompt({
  name: 'simpleChatPrompt',
  // System message to set the persona and context
  system: `You are {{characterName}}.
Your personality and background: {{characterDetails}}.

You are now chatting with the user outside of any specific adventure or ongoing story. This is a direct conversation.
Engage naturally as this character, keeping your persona in mind.
Respond to the user's latest message based on the conversation history provided.
Keep your responses concise and in character.

{{#if adventureContextSummary}}
Here are some key memories or events from past adventures you had with the user (named 'Player' in those contexts, unless specified otherwise):
{{{adventureContextSummary}}}
You can refer to these memories if they are relevant to the current conversation.
{{else}}
You don't have any specific shared adventure memories to draw upon right now, so focus on the current conversation.
{{/if}}
`,
  // Input schema for the prompt (excluding chatHistory, which is handled by `messages` field)
  input: {
    schema: z.object({
        characterName: SimpleChatInputSchema.shape.characterName,
        characterDetails: SimpleChatInputSchema.shape.characterDetails,
        userMessage: SimpleChatInputSchema.shape.userMessage,
        adventureContextSummary: SimpleChatInputSchema.shape.adventureContextSummary, // Add adventureContextSummary
    })
  },
  output: {
    schema: SimpleChatOutputSchema
  },
  // The prompt itself is the user's message.
  prompt: `{{userMessage}}`,
});


const simpleChatFlow = ai.defineFlow<
  typeof SimpleChatInputSchema,
  typeof SimpleChatOutputSchema
>(
  {
    name: 'simpleChatFlow',
    inputSchema: SimpleChatInputSchema,
    outputSchema: SimpleChatOutputSchema,
  },
  async (input) => {
    // input.chatHistory should already be the history *before* the current input.userMessage
    const actualHistoryToSend: ChatMessage[] = input.chatHistory || [];

    console.log("SimpleChat Flow Input:", JSON.stringify(input, null, 2));
    console.log("SimpleChat Flow actualHistoryToSend:", JSON.stringify(actualHistoryToSend, null, 2));

    const {output, history: updatedHistory} = await prompt(
      // Pass characterName, characterDetails, userMessage and adventureContextSummary for the prompt's handlebars
      {
        characterName: input.characterName,
        characterDetails: input.characterDetails,
        userMessage: input.userMessage,
        adventureContextSummary: input.adventureContextSummary, // Pass the summary
      },
      // Pass the conversation history
      {
        history: actualHistoryToSend,
      }
    );

    if (!output?.response) {
      console.error("AI did not return a response. History from call:", updatedHistory);
      throw new Error("AI failed to generate a response for the character.");
    }
    console.log("SimpleChat Flow Output:", JSON.stringify(output, null, 2));
    console.log("SimpleChat Flow History after call:", JSON.stringify(updatedHistory, null, 2));

    return { response: output.response };
  }
);
