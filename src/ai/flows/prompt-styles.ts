
import type { SceneDescriptionForImage } from "@/types";

// This file is not a server module and can export helper functions safely.

// Build a strongly directive, composition-focused description that forces
// the image model to include character portraits together with the scene.
const buildFullDescription = (descriptionObject?: SceneDescriptionForImage): string => {
    if (!descriptionObject?.action) return "";

    const { action, charactersInScene } = descriptionObject;

    // Build a structured XML-like block for each character
    let charactersBlock = "";
    if (charactersInScene && charactersInScene.length > 0) {
        charactersBlock = charactersInScene.map((char) => {
            const appearance = char.appearanceDescription
                ? char.appearanceDescription.trim()
                : "No visual details provided";
            
            const clothing = char.clothingDescription
                ? ` Wearing: ${char.clothingDescription.trim()}`
                : "";

            return `
<character>
  <name>${char.name}</name>
  <visual_description>${appearance}${clothing}</visual_description>
</character>`;
        }).join("");
    }

    // Use a structured, instruction-based prompt
    const fullDescription = `
<prompt_instructions>
  <system_task>
    Your task is to generate an image based on the scene and character descriptions provided below.
    - The <scene> block describes the environment and the action.
    - Each <character> block describes a person who must appear in the scene.
    - You MUST adhere strictly to the visual description provided for each character, including their clothing. Do not mix their appearances.
    - Render the scene as described, with all listed characters present and interacting naturally.
    - Ensure faces are clearly visible and match the provided visual descriptions.
  </system_task>
</prompt_instructions>
${charactersBlock}
<scene>
  ${action.trim()}
</scene>
`;

    return fullDescription.trim();
};


export const getStyleEnhancedPrompt = (descriptionObject?: SceneDescriptionForImage, style?: string): string => {
  const finalDescription = buildFullDescription(descriptionObject);

  if (!finalDescription) {
    return "";
  }

  const negativePrompt = "No text, no letters, no numbers, no captions, no signatures, no watermarks.";
  const sizePrompt = "Generate a square image, 512x512 pixels.";

  const isPortrait = finalDescription.toLowerCase().includes('portrait of');

  // Compose the final prompt: negative prompt first, then style directive, then scene
  if (isPortrait) {
      const base = style && style !== "Par Défaut"
          ? `${style}. ${finalDescription}`
          : `photorealistic portrait, highly detailed, dramatic lighting. ${finalDescription}`;

      return `${negativePrompt} ${sizePrompt} ${base}`;
  } else {
      const styleMap: Record<string, string> = {
        'Réaliste': `Photorealistic, ultra-detailed, 8k, sharp focus. ${finalDescription}`,
        'Manga / Anime': `Vibrant anime illustration, expressive faces, clean lines, cel shading, cinematic composition. ${finalDescription}`,
        'Fantaisie Epique': `Epic fantasy painting, dramatic atmosphere, detailed armor and fabrics, grand composition. ${finalDescription}`,
        "Peinture à l'huile": `Classical oil painting look, visible brushstrokes, painterly texture, warm tonality. ${finalDescription}`,
        'Comics': `Bold comic-style composition, strong inks, dynamic poses, halftone elements optional. ${finalDescription}`,
      };

      const stylePart = style && style !== "Par Défaut"
          ? (styleMap[style] || `${style}. ${finalDescription}`)
          : finalDescription;

      // Keep negative prompt and size at the start so it's consistently applied.
      return `${negativePrompt} ${sizePrompt} ${stylePart}`;
  }
};
