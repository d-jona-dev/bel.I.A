
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
import { Save, Upload, Settings, PanelRight, HomeIcon, Scroll, UserCircle, Users2, FileCog, Users, BrainCircuit, CheckCircle, Lightbulb, Heart, Zap, BarChart2 as BarChart2Icon, Briefcase, Sparkles as SparklesIcon, Shield as ShieldIcon, Swords as SwordsIcon, Package } from 'lucide-react';
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import type { Character, AdventureSettings, Message, ActiveCombat, PlayerInventoryItem } from "@/types";
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema, CombatUpdatesSchema } from "@/ai/flows/generate-adventure";
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
} from "@/components/ui/alert-dialog"

import { AdventureForm } from '@/components/adventure-form';
import { ModelLoader } from '@/components/model-loader';
import { LanguageSelector } from "@/components/language-selector";
import { CharacterSidebar } from "@/components/character-sidebar";
import { AdventureDisplay } from '@/components/adventure-display';
import type { AdventureFormValues } from '../app/page';
import type { SuggestQuestHookInput, SuggestQuestHookOutput } from '@/ai/flows/suggest-quest-hook';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription } from '@/components/ui/card';


interface PageStructureProps {
  adventureSettings: AdventureSettings;
  characters: Character[];
  stagedAdventureSettings: AdventureFormValues;
  stagedCharacters: Character[];
  formPropKey: number;
  handleApplyStagedChanges: () => void;
  narrativeMessages: Message[];
  currentLanguage: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleSettingsUpdate: (newSettings: AdventureFormValues) => void;
  handleNarrativeUpdate: (content: string, type: 'user' | 'ai', sceneDesc?: string) => void;
  handleCharacterUpdate: (updatedCharacter: Character) => void;
  handleNewCharacters: (newChars: NewCharacterSchema[]) => void;
  handleCharacterHistoryUpdate: (updates: CharacterUpdateSchema[]) => void;
  handleAffinityUpdates: (updates: AffinityUpdateSchema[]) => void;
  handleRelationUpdate: (charId: string, targetId: string, newRelation: string) => void;
  handleRelationUpdatesFromAI: (updates: RelationUpdateSchema[]) => void;
  handleSaveNewCharacter: (character: Character) => void;
  handleAddStagedCharacter: (character: Character) => void;
  handleSave: () => void;
  handleLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setCurrentLanguage: (lang: string) => void;
  translateTextAction: (input: TranslateTextInput) => Promise<TranslateTextOutput>;
  generateAdventureAction: (input: GenerateAdventureInput) => Promise<void>;
  generateSceneImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
  handleEditMessage: (messageId: string, newContent: string) => void;
  handleRegenerateLastResponse: () => Promise<void>;
  handleUndoLastMessage: () => void;
  playerId: string;
  playerName: string; // Explicitly pass playerName
  onRestartAdventure: () => void;
  activeCombat?: ActiveCombat;
  onCombatUpdates: (combatUpdates: CombatUpdatesSchema) => void;
  suggestQuestHookAction: (input: SuggestQuestHookInput) => Promise<void>;
  isSuggestingQuest: boolean;
  showRestartConfirm: boolean;
  setShowRestartConfirm: (open: boolean) => void;
}

export function PageStructure({
  adventureSettings,
  characters,
  stagedAdventureSettings,
  stagedCharacters,
  formPropKey,
  handleApplyStagedChanges,
  narrativeMessages,
  currentLanguage,
  fileInputRef,
  handleSettingsUpdate,
  handleNarrativeUpdate,
  handleCharacterUpdate,
  handleNewCharacters,
  handleCharacterHistoryUpdate,
  handleAffinityUpdates,
  handleRelationUpdate,
  handleRelationUpdatesFromAI,
  handleSaveNewCharacter,
  handleAddStagedCharacter,
  handleSave,
  handleLoad,
  setCurrentLanguage,
  translateTextAction,
  generateAdventureAction,
  generateSceneImageAction,
  handleEditMessage,
  handleRegenerateLastResponse,
  handleUndoLastMessage,
  playerId,
  playerName, // Receive playerName
  onRestartAdventure,
  activeCombat,
  onCombatUpdates,
  suggestQuestHookAction,
  isSuggestingQuest,
  showRestartConfirm,
  setShowRestartConfirm,
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
                currentText={narrativeMessages.map(m => m.content).join('\n\n')}
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
                adventureSettings={adventureSettings}
                characters={characters}
                initialMessages={narrativeMessages}
                currentLanguage={currentLanguage}
                onNarrativeChange={handleNarrativeUpdate}
                onNewCharacters={handleNewCharacters}
                onCharacterHistoryUpdate={handleCharacterHistoryUpdate}
                onAffinityUpdates={handleAffinityUpdates}
                onRelationUpdates={handleRelationUpdatesFromAI}
                onEditMessage={handleEditMessage}
                onRegenerateLastResponse={handleRegenerateLastResponse}
                onUndoLastMessage={handleUndoLastMessage}
                activeCombat={activeCombat}
                onCombatUpdates={onCombatUpdates}
                onRestartAdventure={() => setShowRestartConfirm(true)}
                suggestQuestHookAction={suggestQuestHookAction}
                isSuggestingQuest={isSuggestingQuest}
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
                                    key={formPropKey.toString()}
                                    initialValues={stagedAdventureSettings}
                                    onSettingsChange={handleSettingsUpdate}
                                />
                             </AccordionContent>
                         </AccordionItem>
                     </Accordion>

                    {/* Player Character Section (RPG Mode) */}
                    {adventureSettings.rpgMode && (
                        <Accordion type="single" collapsible className="w-full" defaultValue="player-character-accordion">
                            <AccordionItem value="player-character-accordion">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2">
                                        <UserCircle className="h-5 w-5" /> {playerName || "Mon Personnage"}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 space-y-3">
                                    <Card>
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-16 w-16">
                                                    {/* TODO: Add player portraitUrl from adventureSettings if available */}
                                                    <AvatarFallback><UserCircle className="h-8 w-8" /></AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold">{playerName || "Héros"}</p>
                                                    <p className="text-sm text-muted-foreground">{adventureSettings.playerClass || "Aventurier"} - Niv. {adventureSettings.playerLevel || 1}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <Label htmlFor="player-hp-sidebar" className="text-sm font-medium flex items-center"><Heart className="h-4 w-4 mr-1 text-red-500"/>PV</Label>
                                                    <span className="text-xs text-muted-foreground">{adventureSettings.playerCurrentHp ?? 0} / {adventureSettings.playerMaxHp ?? 0}</span>
                                                </div>
                                                <Progress id="player-hp-sidebar" value={((adventureSettings.playerCurrentHp ?? 0) / (adventureSettings.playerMaxHp || 1)) * 100} className="h-2 [&>div]:bg-red-500" />
                                            </div>

                                            {(adventureSettings.playerMaxMp ?? 0) > 0 && (
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <Label htmlFor="player-mp-sidebar" className="text-sm font-medium flex items-center"><Zap className="h-4 w-4 mr-1 text-blue-500"/>PM</Label>
                                                        <span className="text-xs text-muted-foreground">{adventureSettings.playerCurrentMp ?? 0} / {adventureSettings.playerMaxMp ?? 0}</span>
                                                    </div>
                                                    <Progress id="player-mp-sidebar" value={((adventureSettings.playerCurrentMp ?? 0) / (adventureSettings.playerMaxMp || 1)) * 100} className="h-2 [&>div]:bg-blue-500" />
                                                </div>
                                            )}

                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <Label htmlFor="player-exp-sidebar" className="text-sm font-medium flex items-center"><BarChart2Icon className="h-4 w-4 mr-1 text-yellow-500"/>EXP</Label>
                                                    <span className="text-xs text-muted-foreground">{adventureSettings.playerCurrentExp ?? 0} / {adventureSettings.playerExpToNextLevel ?? 0}</span>
                                                </div>
                                                <Progress id="player-exp-sidebar" value={((adventureSettings.playerCurrentExp ?? 0) / (adventureSettings.playerExpToNextLevel || 1)) * 100} className="h-2 [&>div]:bg-yellow-500" />
                                            </div>
                                            
                                            <CardDescription className="text-xs pt-2">
                                              <Briefcase className="inline h-3 w-3 mr-1" /> Inventaire :
                                            </CardDescription>
                                            <Card className="mt-1 bg-muted/30 border">
                                              <CardContent className="p-2">
                                                {(!adventureSettings.playerInventory || adventureSettings.playerInventory.length === 0) ? (
                                                  <p className="text-xs text-muted-foreground italic">Inventaire vide.</p>
                                                ) : (
                                                  <ScrollArea className="h-auto max-h-48">
                                                    <div className="grid grid-cols-5 gap-2 p-1">
                                                      {adventureSettings.playerInventory.filter(item => item.quantity > 0).map((item, index) => (
                                                        <TooltipProvider key={`${item.name}-${index}`}>
                                                          <Tooltip>
                                                            <TooltipTrigger asChild>
                                                              <div className="flex flex-col items-center justify-center aspect-square border rounded-md bg-background hover:bg-accent/50 cursor-default p-1 shadow-sm relative overflow-hidden">
                                                                <Package size={20} className="text-foreground/80 mb-0.5" />
                                                                <span className="text-[10px] leading-tight truncate w-full text-center text-foreground/90 block">{item.name}</span>
                                                                {item.quantity > 1 && (
                                                                  <span
                                                                    className="absolute top-0 right-0 text-[10px] bg-primary text-primary-foreground rounded-bl-md px-1 py-0.5 leading-none"
                                                                  >
                                                                    {item.quantity}
                                                                  </span>
                                                                )}
                                                              </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" align="center">
                                                              <p className="font-semibold">{item.name} (x{item.quantity})</p>
                                                              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                                                              {item.effect && <p className="text-xs text-primary">Effet: {item.effect}</p>}
                                                              {item.type && <p className="text-xs">Type: {item.type}</p>}
                                                            </TooltipContent>
                                                          </Tooltip>
                                                        </TooltipProvider>
                                                      ))}
                                                    </div>
                                                  </ScrollArea>
                                                )}
                                              </CardContent>
                                            </Card>

                                             {adventureSettings.rpgMode && (
                                                <>
                                                    <CardDescription className="text-xs pt-2">
                                                        <SparklesIcon className="inline h-3 w-3 mr-1" /> Caractéristiques (Force, etc.) à venir.
                                                    </CardDescription>
                                                    <CardDescription className="text-xs">
                                                        <SwordsIcon className="inline h-3 w-3 mr-1" /> Sorts & Compétences à venir.
                                                    </CardDescription>
                                                </>
                                             )}
                                        </CardContent>
                                    </Card>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}


                     {/* Characters */}
                     <Accordion type="single" collapsible className="w-full" defaultValue="characters-accordion">
                         <AccordionItem value="characters-accordion">
                             <AccordionTrigger>
                                 <div className="flex items-center gap-2">
                                     <Users className="h-5 w-5" /> Personnages Secondaires
                                 </div>
                             </AccordionTrigger>
                             <AccordionContent className="pt-2">
                                 <CharacterSidebar
                                     characters={stagedCharacters}
                                     onCharacterUpdate={handleCharacterUpdate}
                                     onSaveNewCharacter={handleSaveNewCharacter}
                                     onAddStagedCharacter={handleAddStagedCharacter}
                                     onRelationUpdate={handleRelationUpdate}
                                     generateImageAction={generateSceneImageAction}
                                     rpgMode={stagedAdventureSettings.enableRpgMode ?? false}
                                     relationsMode={stagedAdventureSettings.enableRelationsMode ?? true}
                                     playerId={playerId}
                                     playerName={stagedAdventureSettings.playerName || "Player"}
                                     currentLanguage={currentLanguage}
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
                 </SidebarContent>
             </ScrollArea>
            <SidebarFooter className="p-4 border-t border-sidebar-border">
                <Button onClick={handleApplyStagedChanges} className="w-full">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Enregistrer les modifications
                </Button>
            </SidebarFooter>
       </Sidebar>
       <AlertDialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Recommencer l'aventure ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Êtes-vous sûr de vouloir recommencer l'aventure en cours ? Toute la progression narrative et les changements sur les personnages (non sauvegardés globalement) seront perdus et réinitialisés aux derniers paramètres de l'aventure (ou ceux par défaut si non modifiés). L'état de combat et les statistiques du joueur seront également réinitialisés.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowRestartConfirm(false)}>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={onRestartAdventure}>Recommencer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
