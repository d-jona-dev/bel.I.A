
// This file is not a server module and can export helper functions safely.

export const getStyleEnhancedPrompt = (description: string, style?: string): string => {
  const negativePrompt = "Image only, no text, no letters, no numbers, no words, no captions, no signatures, no watermarks.";
  const sizePrompt = "Generate a square image, 512x512 pixels."
  
  // New logic: Check if the description is for a portrait to apply a specific prompt structure.
  const isPortrait = description.toLowerCase().includes('portrait of');

  if (isPortrait) {
      if (!style || style === "Par Défaut") {
        return `photorealistic portrait, highly detailed, dramatic lighting, ${description}`;
      }
      const stylePrompts: Record<string, string> = {
        'Réaliste': `photorealistic portrait, highly detailed, dramatic lighting, ${description}`,
        'Manga / Anime': `high-quality anime portrait, vibrant, detailed, by studio ghibli and makoto shinkai, ${description}`,
        'Fantaisie Epique': `epic fantasy portrait painting, detailed, D&D, ArtStation, dramatic lighting, by greg rutkowski, ${description}`,
        'Peinture à l\'huile': `classical oil painting portrait, detailed brushstrokes, masterpiece, ${description}`,
        'Comics': `bold american comic book style portrait, ink, vibrant colors, halftone dots, ${description}`,
      };
      const styledDescription = stylePrompts[style] || `${description}, in the art style of ${style}`;
      return `${negativePrompt} ${styledDescription}`;

  } else {
    // Original logic for scene images
    if (!style || style === "Par Défaut") {
        return `${negativePrompt} ${sizePrompt} ${description}`;
    }
     const stylePrompts: Record<string, string> = {
        'Réaliste': `A photorealistic, highly detailed image. Keywords: realistic, photorealism, 8k, sharp focus. ${sizePrompt} Scene: ${description}`,
        'Manga / Anime': `A high-quality, detailed image in a vibrant Manga/Anime style. Keywords: anime aesthetic, clean lines, cel shading, by Studio Ghibli and Makoto Shinkai. ${sizePrompt} Scene: ${description}`,
        'Fantaisie Epique': `A dramatic and epic digital fantasy painting. Keywords: fantasy art, epic, detailed, D&D, ArtStation, dramatic lighting, by Greg Rutkowski. ${sizePrompt} Scene: ${description}`,
        'Peinture à l\'huile': `An image in the style of a classical oil painting. Keywords: oil on canvas, classical, detailed brushstrokes, masterpiece. ${sizePrompt} Scene: ${description}`,
        'Comics': `An image in a bold, American comic book style. Keywords: comic book art, bold lines, ink, vibrant colors, halftone dots. ${sizePrompt} Scene: ${description}`,
    };
    const styledDescription = stylePrompts[style] || `${description}. Art style: ${style}`;
    return `${negativePrompt} ${styledDescription}`;
  }
};
