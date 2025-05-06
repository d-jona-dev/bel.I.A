// src/app/page.structure.tsx
// This component defines the main layout structure for the adventure page.
// It uses the Sidebar components and places the AdventureDisplay and configuration panels.

import * as React from 'react';
import Link from 'next/link';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, Upload, Settings, PanelRight, HomeIcon, Scroll, UserCircle, Users2, FileCog, Users, BrainCircuit, RefreshCcw } from 'lucide-react'; // Added RefreshCcw
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import type { Character, AdventureSettings, Message } from "@/types"; // Added Message type
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema } from "@/ai/flows/generate-adventure"; // Added CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog" // Import AlertDialog components

// Import sub-components used in the structure
import { AdventureForm } from '@/components/adventure-form';
import { AdventureDisplay } from '@/components/adventure-display';
import { ModelLoader } from '@/components/model-loader';
import { LanguageSelector } from "@/components/language-selector";
import { CharacterSidebar } from "@/components/character-sidebar"; // Ensure this is imported

interface PageStructureProps {
  adventureSettings: AdventureSettings;
  characters: Character[];
  narrativeMessages: Message[]; // Changed from narrative: string
  currentLanguage: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleSettingsUpdate: (newSettings: any) => void;
  handleNarrativeUpdate: (content: string, type: 'user' | 'ai', sceneDesc?: string) => void; // Updated signature
  handleCharacterUpdate: (updatedCharacter: Character) => void;
  handleNewCharacters: (newChars: NewCharacterSchema[]) => void; // Use NewCharacterSchema
  handleCharacterHistoryUpdate: (updates: CharacterUpdateSchema[]) => void; // Added prop for history updates
  handleAffinityUpdates: (updates: AffinityUpdateSchema[]) => void; // Added prop for affinity updates
  handleRelationUpdate: (charId: string, targetId: string, newRelation: string) => void; // Added prop for manual relation updates
  handleRelationUpdatesFromAI: (updates: RelationUpdateSchema[]) => void; // Added prop for AI-driven relation updates
  handleSaveNewCharacter: (character: Character) => void; // Added prop for saving new chars
  handleSave: () => void;
  handleLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setCurrentLanguage: (lang: string) => void;
  translateTextAction: (input: TranslateTextInput) => Promise<TranslateTextOutput>;
  generateAdventureAction: (input: GenerateAdventureInput) => Promise<GenerateAdventureOutput>;
  generateSceneImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
  handleEditMessage: (messageId: string, newContent: string) => void;
  handleRegenerateLastResponse: () => Promise<void>; // Added regenerate handler prop
  handleUndoLastMessage: () => void; // Added undo handler prop
  playerId: string; // Add playerId prop
  playerName: string; // Add playerName prop
  onRestartAdventure: () => void; // Added restart adventure handler
}

export function PageStructure({
  adventureSettings,
  characters,
  narrativeMessages, // Use narrativeMessages
  currentLanguage,
  fileInputRef,
  handleSettingsUpdate,
  handleNarrativeUpdate,
  handleCharacterUpdate,
  handleNewCharacters, // Destructure new prop
  handleCharacterHistoryUpdate, // Destructure new prop
  handleAffinityUpdates, // Destructure new prop
  handleRelationUpdate, // Destructure manual relation prop
  handleRelationUpdatesFromAI, // Destructure AI relation prop
  handleSaveNewCharacter, // Destructure new prop
  handleSave,
  handleLoad,
  setCurrentLanguage,
  translateTextAction,
  generateAdventureAction,
  generateSceneImageAction,
  handleEditMessage,
  handleRegenerateLastResponse, // Added prop
  handleUndoLastMessage, // Added prop
  playerId, // Destructure player ID
  playerName, // Destructure player name
  onRestartAdventure, // Destructure restart handler
}: PageStructureProps) {
  return (
    <>
      {/* Left Sidebar: Global Actions & Navigation */}
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <h1 className="text-xl font-semibold text-sidebar-foreground">Aventurier Textuel</h1>
        </SidebarHeader>
        <ScrollArea className="flex-1">
           <SidebarContent className="p-4 space-y-4">
              {/* Navigation Links */}
              <nav className="space-y-2">
                 <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href="/">
                          <Button variant="secondary" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label="Aventure Actuelle"> {/* Active style */}
                            <HomeIcon className="h-5 w-5" />
                            <span className="ml-2 group-data-[collapsible=icon]:hidden">Aventure</span>
                          </Button>
                        </Link>
                      </TooltipTrigger>
                       <TooltipContent side="right" align="center">Aventure Actuelle</TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
                 <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <Link href="/histoires">
                            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label="Histoires Sauvegardées">
                               <Scroll className="h-5 w-5" />
                               <span className="ml-2 group-data-[collapsible=icon]:hidden">Histoires</span>
                            </Button>
                         </Link>
                      </TooltipTrigger>
                       <TooltipContent side="right" align="center">Gérer les Histoires</TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <Link href="/avatars">
                           <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label="Avatars Joueur">
                               <UserCircle className="h-5 w-5" />
                               <span className="ml-2 group-data-[collapsible=icon]:hidden">Avatars</span>
                            </Button>
                         </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center">Gérer les Avatars Joueur</TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
                 <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                          <Link href="/personnages">
                            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label="Personnages Secondaires">
                                <Users2 className="h-5 w-5" />
                               <span className="ml-2 group-data-[collapsible=icon]:hidden">Personnages</span>
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">Gérer les Personnages Secondaires</TooltipContent>
                     </Tooltip>
                  </TooltipProvider>
              </nav>

           </SidebarContent>
        </ScrollArea>
        <SidebarFooter className="p-4 border-t border-sidebar-border flex flex-col space-y-2">
            {/* Load Button */}
            <TooltipProvider>
                 <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="outline" className="w-full justify-start group-data-[collapsible=icon]:justify-center" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-5 w-5" />
                            <span className="ml-2 group-data-[collapsible=icon]:hidden">Charger</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center">Charger une Aventure (JSON)</TooltipContent>
                 </Tooltip>
            </TooltipProvider>
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleLoad}
                className="hidden"
            />
           {/* Settings Button (placeholder) */}
           <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" disabled>
                  <Settings className="h-5 w-5" />
                  <span className="ml-2 group-data-[collapsible=icon]:hidden">Paramètres (Future)</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">Paramètres Globaux (non implémenté)</TooltipContent>
            </Tooltip>
           </TooltipProvider>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset className="flex flex-col h-screen">
        <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
           <div className="flex items-center space-x-2">
             <SidebarTrigger /> {/* Trigger for Left Sidebar */}
             <span className="font-semibold">Aventure</span>
           </div>
          <div className="flex items-center space-x-2">
            <LanguageSelector
                translateTextAction={translateTextAction}
                currentText={narrativeMessages.map(m => m.content).join('\n\n')} // Join message content for translation context
                onLanguageChange={setCurrentLanguage}
                currentLanguage={currentLanguage}
            />
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleSave}>
                    <Save className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                 <TooltipContent>Sauvegarder l'Aventure (JSON)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
             <SidebarTrigger data-sidebar-target="right-sidebar">
                 <PanelRight className="h-5 w-5" />
             </SidebarTrigger>
          </div>
        </header>
        <main className="flex-1 overflow-hidden p-4">
             <AdventureDisplay
                generateAdventureAction={generateAdventureAction}
                generateSceneImageAction={generateSceneImageAction}
                world={adventureSettings.world}
                playerName={playerName} // Pass player name
                characters={characters}
                initialMessages={narrativeMessages} // Pass the message array
                currentLanguage={currentLanguage} // Pass current language
                onNarrativeChange={handleNarrativeUpdate} // Pass the updated handler
                onNewCharacters={handleNewCharacters} // Pass the new characters handler
                onCharacterHistoryUpdate={handleCharacterHistoryUpdate} // Pass history update handler
                onAffinityUpdates={handleAffinityUpdates} // Pass affinity update handler
                onRelationUpdates={handleRelationUpdatesFromAI} // Pass relation update handler from AI
                rpgMode={adventureSettings.rpgMode}
                onEditMessage={handleEditMessage}
                onRegenerateLastResponse={handleRegenerateLastResponse} // Pass regenerate handler
                onUndoLastMessage={handleUndoLastMessage} // Pass undo handler
                onRestartAdventure={onRestartAdventure} // Pass restart handler
             />
        </main>
      </SidebarInset>

      {/* Right Sidebar: Config, Characters, AI Settings */}
       <Sidebar id="right-sidebar" side="right" variant="sidebar" collapsible="offcanvas">
            <SidebarHeader className="p-4 border-b border-sidebar-border">
                 <h2 className="text-lg font-semibold text-sidebar-foreground">Détails & Configuration</h2>
             </SidebarHeader>
             <ScrollArea className="flex-1">
                 <SidebarContent className="p-4 space-y-6">
                      {/* Adventure Configuration */}
                     <Accordion type="single" collapsible className="w-full" defaultValue="adventure-config-accordion">
                         <AccordionItem value="adventure-config-accordion">
                             <AccordionTrigger>
                                 <div className="flex items-center gap-2">
                                     <FileCog className="h-5 w-5" /> Configuration de l'Aventure
                                 </div>
                             </AccordionTrigger>
                             <AccordionContent className="pt-2">
                                <AdventureForm
                                    initialValues={{ ...adventureSettings, characters: characters.map(({ name, details, id }) => ({ name, details, id })) }}
                                    onSettingsChange={handleSettingsUpdate}
                                />
                             </AccordionContent>
                         </AccordionItem>
                     </Accordion>

                      {/* AI Configuration */}
                     <Accordion type="single" collapsible className="w-full">
                         <AccordionItem value="ai-config-accordion">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                     <BrainCircuit className="h-5 w-5" /> Configuration IA
                                </div>
                             </AccordionTrigger>
                            <AccordionContent className="pt-2 px-0">
                                <ModelLoader />
                            </AccordionContent>
                         </AccordionItem>
                     </Accordion>

                     {/* Characters */}
                     <Accordion type="single" collapsible className="w-full" defaultValue="characters-accordion">
                         <AccordionItem value="characters-accordion">
                             <AccordionTrigger>
                                 <div className="flex items-center gap-2">
                                     <Users className="h-5 w-5" /> Personnages Secondaires
                                 </div>
                             </AccordionTrigger>
                             <AccordionContent className="pt-2">
                                 {/* Use CharacterSidebar component */}
                                 <CharacterSidebar
                                     characters={characters}
                                     onCharacterUpdate={handleCharacterUpdate}
                                     onSaveNewCharacter={handleSaveNewCharacter} // Pass save handler
                                     onRelationUpdate={handleRelationUpdate} // Pass manual relation update handler
                                     generateImageAction={generateSceneImageAction}
                                     rpgMode={adventureSettings.rpgMode}
                                     playerId={playerId} // Pass player ID
                                     playerName={playerName} // Pass player name
                                     currentLanguage={currentLanguage} // Pass current language
                                 />
                             </AccordionContent>
                         </AccordionItem>
                     </Accordion>
                 </SidebarContent>
             </ScrollArea>
       </Sidebar>
    </>
  );
}
