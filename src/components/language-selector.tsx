"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Languages } from "lucide-react";
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text"; // Import types only
import { useToast } from "@/hooks/use-toast";

// Example: Fetch available languages from an API or define statically
const availableLanguages = [
  { code: "fr", name: "Français" },
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "de", name: "Deutsch" },
];

// Define prop types for the AI function
interface LanguageSelectorProps {
    translateTextAction: (input: TranslateTextInput) => Promise<TranslateTextOutput>;
}


// TODO: Connect this component to the actual narrative state
// For now, it just simulates the translation request

export function LanguageSelector({ translateTextAction }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = React.useState<string>("fr");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();

  const handleLanguageChange = async (newLang: string) => {
     if (isLoading || newLang === selectedLanguage) return;

    setIsLoading(true);
    setSelectedLanguage(newLang); // Update UI immediately

    toast({
      title: "Traduction en cours...",
      description: `Changement de la langue vers ${availableLanguages.find(l => l.code === newLang)?.name || newLang}.`,
    });

    try {
      // *** Placeholder: In a real app, get the text to translate from the adventure state ***
      const textToTranslate = "Ceci est un texte d'exemple à traduire.";

      const input: TranslateTextInput = {
        text: textToTranslate,
        language: availableLanguages.find(l => l.code === newLang)?.name || newLang, // Use full language name for the AI
      };

      // Call the AI translation function passed via props
      const result = await translateTextAction(input);

      // *** Placeholder: Update the adventure narrative with the translated text ***
      console.log("Translated text:", result.translatedText);
       toast({
        title: "Traduction Réussie",
        description: `L'aventure est maintenant affichée en ${availableLanguages.find(l => l.code === newLang)?.name || newLang}.`,
        });


    } catch (error) {
      console.error("Error translating text:", error);
       toast({
        title: "Erreur de Traduction",
        description: "Impossible de traduire le texte. Veuillez réessayer.",
        variant: "destructive",
       });
      // Revert language selection on error? Optional.
      // setSelectedLanguage(selectedLanguage);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Select
        value={selectedLanguage}
        onValueChange={handleLanguageChange}
        disabled={isLoading}
    >
      <SelectTrigger className="w-[150px]">
        <div className="flex items-center gap-2">
             <Languages className="h-4 w-4" />
             <SelectValue placeholder="Langue" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {availableLanguages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
