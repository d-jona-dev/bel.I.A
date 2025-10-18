
import type { SceneDescriptionForImage } from "@/types";

// This file is not a server module and can export helper functions safely.

const buildFullDescription = (descriptionObject?: SceneDescriptionForImage): string => {
    if (!descriptionObject?.action) return "";

    const { action, charactersInScene } = descriptionObject;

    let charactersSection = "";

    if (charactersInScene && charactersInScene.length > 0) {
        const characterLines = charactersInScene.map((char) => {
            const appearance = char.appearanceDescription
                ? `Appearance: ${char.appearanceDescription}.`
                : "";
            return `Character: ${char.name}. ${appearance}`;
        });
        charactersSection = characterLines.join(" ");
    }

    // ✅ Combine les sections pour un contexte complet
    const fullDescription = `
A detailed scene depiction.
Scene context: ${action}.
${charactersSection}
Make sure all described characters are present in the scene, interacting naturally.
Show their facial expressions and body posture consistent with the action described.
Cinematic lighting and cohesive art direction.
`;

    return fullDescription.trim();
};


export const getStyleEnhancedPrompt = (descriptionObject?: SceneDescriptionForImage, style?: string): string => {
  const finalDescription = buildFullDescription(descriptionObject);
  
  if (!finalDescription) {
    return ""; // Return empty string if the base description is empty, preventing errors.
  }

  const negativePrompt = "Image only, no text, no letters, no numbers, no words, no captions, no signatures, no watermarks.";
  const sizePrompt = "Generate a square image, 512x512 pixels."
  
  const isPortrait = finalDescription.toLowerCase().includes('portrait of');

  if (isPortrait) {
      if (!style || style === "Par Défaut") {
        return `photorealistic portrait, highly detailed, dramatic lighting, ${finalDescription}`;
      }
      const stylePrompts: Record<string, string> = {
        'Réaliste': `photorealistic portrait, highly detailed, dramatic lighting, ${finalDescription}`,
        'Manga / Anime': `high-quality anime portrait, vibrant, detailed, by studio ghibli and makoto shinkai, ${finalDescription}`,
        'Fantaisie Epique': `epic fantasy portrait painting, detailed, D&D, ArtStation, dramatic lighting, by greg rutkowski, ${finalDescription}`,
        "Peinture à l'huile": `classical oil painting portrait, detailed brushstrokes, masterpiece, ${finalDescription}`,
        'Comics': `bold american comic book style portrait, ink, vibrant colors, halftone dots, ${finalDescription}`,
      };
      const styledDescription = stylePrompts[style] || `${finalDescription}, in the art style of ${style}`;
      return `${negativePrompt} ${styledDescription}`;

  } else {
    // Original logic for scene images
    if (!style || style === "Par Défaut") {
        return `${negativePrompt} ${sizePrompt} ${finalDescription}`;
    }
     const stylePrompts: Record<string, string> = {
        'Réaliste': `A photorealistic, highly detailed image. Keywords: realistic, photorealism, 8k, sharp focus. ${sizePrompt} Scene: ${finalDescription}`,
        'Manga / Anime': `A high-quality, detailed image in a vibrant Manga/Anime style. Keywords: anime aesthetic, clean lines, cel shading, by Studio Ghibli and Makoto Shinkai. ${sizePrompt} Scene: ${finalDescription}`,
        'Fantaisie Epique': `A dramatic and epic digital fantasy painting. Keywords: fantasy art, epic, detailed, D&D, ArtStation, dramatic lighting, by Greg Rutkowski. ${sizePrompt} Scene: ${finalDescription}`,
        "Peinture à l'huile": `An image in the style of a classical oil painting. Keywords: oil on canvas, classical, detailed brushstrokes, masterpiece. ${sizePrompt} Scene: ${finalDescription}`,
        'Comics': `An image in a bold, American comic book style. Keywords: comic book art, bold lines, ink, vibrant colors, halftone dots. ${sizePrompt} Scene: ${finalDescription}`,
    };
    const styledDescription = stylePrompts[style] || `${finalDescription}. Art style: ${style}`;
    return `${negativePrompt} ${styledDescription}`;
  }
};
