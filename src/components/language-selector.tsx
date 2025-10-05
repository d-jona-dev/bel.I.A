
"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Languages, Loader2 } from "lucide-react"; // Added Loader2
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text"; // Import types only
import { useToast } from "@/hooks/use-toast";

// Example: Fetch available languages from an API or define statically
const availableLanguages = [
  { code: "fr", name: "Français" },
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "日本語" },
  { code: "ru", name: "Русский" },
  { code: "zh", name: "中文" },
];

// Define prop types for the AI function and state management
interface LanguageSelectorProps {
    translateTextAction: (input: TranslateTextInput) => Promise<TranslateTextOutput>;
    currentText: string; // The text content to potentially translate (concatenated narrative)
    onLanguageChange: (newLangCode: string) => void; // Callback to update parent state
    currentLanguage: string; // Current language code from parent state
}


export function LanguageSelector({
    translateTextAction,
    currentText,
    onLanguageChange,
    currentLanguage,
}: LanguageSelectorProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();

  const handleLanguageChange = async (newLangCode: string) => {
     if (isLoading || newLangCode === currentLanguage) return;

    setIsLoading(true);
    const targetLanguageName = availableLanguages.find(l => l.code === newLangCode)?.name || newLangCode;

    // Show initial toast immediately
    setTimeout(() => {
      toast({
        title: "Changement de langue...",
        description: `Passage à ${targetLanguageName}.`,
      });
    }, 0);

    onLanguageChange(newLangCode);

    console.log("Language setting changed to:", newLangCode);

    setTimeout(() => {
      toast({
          title: "Langue Changée",
          description: `L'affichage est maintenant en ${targetLanguageName}.`,
      });
    }, 0);


    // Optional: Trigger translation of existing content (requires parent implementation)
    /*
    try {
       // Only translate if there's text to translate
       if (currentText.trim()) {
            const input: TranslateTextInput = {
                text: currentText, // Translate the concatenated narrative
                language: targetLanguageName, // Use full language name for the AI
            };

            // Call the AI translation function passed via props
            const result = await translateTextAction(input);

            // The parent component should handle updating the narrative
            // messages with result.translatedText based on the language change.
            // This component only signals the change and potentially provides the translation.
            console.log("Translated text (requires parent handling):", result.translatedText);

            setTimeout(() => {
              toast({
                  title: "Traduction Terminée",
                  description: `Le contenu existant a été traduit en ${targetLanguageName}.`,
              });
            }, 0);


       } else {
           console.log("No text to translate, just changing language setting.");
           setTimeout(() => {
             toast({
                  title: "Langue Changée",
                  description: `L'affichage est maintenant en ${targetLanguageName}.`,
              });
           }, 0);
       }

    } catch (error) {
      console.error("Error translating text:", error);
      setTimeout(() => {
        toast({
          title: "Erreur de Traduction",
          description: "Impossible de traduire le texte existant. La langue a été changée.",
          variant: "destructive",
        });
      }, 0);
      // Don't revert language selection optimistically, let parent handle state
    } finally {
      setIsLoading(false);
    }
    */

    setIsLoading(false);
  };


  return (
    <Select
        value={currentLanguage} // Controlled by parent state
        onValueChange={handleLanguageChange}
        disabled={isLoading}
    >
      <SelectTrigger className="w-[150px]">
        <div className="flex items-center gap-2">
             {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Languages className="h-4 w-4" />}
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
