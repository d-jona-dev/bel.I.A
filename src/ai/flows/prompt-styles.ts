import type { SceneDescriptionForImage } from "@/types";

// This file is not a server module and can export helper functions safely.

// Build a strongly directive, composition-focused description that forces
// the image model to include character portraits together with the scene.
const buildFullDescription = (descriptionObject?: SceneDescriptionForImage): string => {
    if (!descriptionObject?.action) return "";

    const { action, charactersInScene } = descriptionObject;

    // Build a compact, detailed character block
    let charactersSection = "";
    if (charactersInScene && charactersInScene.length > 0) {
        const characterLines = charactersInScene.map((char, idx) => {
            const appearance = char.appearanceDescription
                ? `${char.appearanceDescription.trim()}`
                : "No visual details provided";
            // Add explicit role/placement hints to help composition
            return `Character ${idx + 1}: ${char.name}. Visual: ${appearance}.`;
        });
        charactersSection = characterLines.join(" ");
    }

    // Strong directives: composition + portraits + camera + lighting + interactions
    const fullDescription = [
        "Detailed scene description for image generation.",
        `Scene action: ${action.trim()}.`,
        charactersSection ? `Characters: ${charactersSection}` : "",
        // Force portrait integration + inset portraits
        "Composition instructions: Render the main scene as described, with all listed characters present and interacting naturally.",
        "Include a clear visual focus on characters: provide both a medium shot of the full scene and inset close-up bust portraits (shoulder-up/headshots) of each character, arranged naturally or as subtle insets within the image.",
        "Camera & framing: one medium-wide view of the scene, plus individual bust close-ups for each character. Ensure faces are clearly visible and match the described appearances.",
        "Expressions & posture: match expressions/body language to the action. Show clothing details, textures and accessories described.",
        "Lighting & atmosphere: cinematic lighting consistent across scene and portrait insets. Ensure color grading and shadows match the environment.",
        "Stylistic constraint: unify the art direction so characters and background look coherent (same lighting, rendering, and perspective).",
        "Output constraints: image only, no text or UI. High detail on faces, skin, hair, fabrics and small props."
    ].filter(Boolean).join(" ");

    return fullDescription;
};


export const getStyleEnhancedPrompt = (descriptionObject?: SceneDescriptionForImage, style?: string): string => {
  const finalDescription = buildFullDescription(descriptionObject);

  if (!finalDescription) {
    return "";
  }

  const negativePrompt = "No text, no letters, no numbers, no captions, no signatures, no watermarks.";
  const sizePrompt = "Generate a square image, 512x512 pixels.";

  const isPortrait = finalDescription.toLowerCase().includes('portrait of');

  // Compose the final prompt: negative prompt first (short), then style directive, then scene
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
