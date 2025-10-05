
import '@/ai/flows/generate-adventure.ts';
import '@/ai/flows/generate-scene-image-genkit.ts'; // Renamed
import '@/ai/flows/generate-scene-image-openrouter.ts'; // Added
import '@/ai/flows/translate-text.ts';
import '@/ai/flows/simple-chat.ts';
import '@/ai/flows/suggest-quest-hook.ts'; // Add the new quest hook flow
import '@/ai/flows/suggest-player-skill.ts'; // Add the new player skill suggestion flow
import '@/ai/flows/generate-adventure-local'; // Add the new local adventure flow
import '@/ai/flows/describe-appearance'; // NEW: Add the appearance description flow
import '@/ai/flows/creative-assistant'; // NEW: Add the creative assistant flow

// Note: prompt-styles.ts is not a flow, so it doesn't need to be imported here.
    
