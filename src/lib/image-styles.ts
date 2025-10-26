// src/lib/image-styles.ts

export interface ImageStyle {
  key: string;
  langKey: string;
  prompt: string;
}

export const defaultImageStyles: ImageStyle[] = [
  { key: "default", langKey: "styleDefault", prompt: "" },
  { key: "realistic", langKey: "styleRealistic", prompt: "Photorealistic, ultra-detailed, 8k, sharp focus." },
  { key: "manga", langKey: "styleManga", prompt: "Vibrant anime illustration, expressive faces, clean lines, cel shading, cinematic composition." },
  { key: "fantasy", langKey: "styleFantasy", prompt: "Epic fantasy painting, dramatic atmosphere, detailed armor and fabrics, grand composition." },
  { key: "oil_painting", langKey: "styleOilPainting", prompt: "Classical oil painting look, visible brushstrokes, painterly texture, warm tonality." },
  { key: "comics", langKey: "styleComics", prompt: "Bold comic-style composition, strong inks, dynamic poses, halftone elements optional." },
];
