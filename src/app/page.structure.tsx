

// src/app/page.structure.tsx
// This component defines the main layout structure for the adventure page.
// It uses the Sidebar components and places the AdventureDisplay and configuration panels.

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import next/image
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Save, Upload, Settings, PanelRight, HomeIcon, Scroll, UserCircle, Users2, FileCog, BrainCircuit, CheckCircle, Lightbulb, Heart, BookOpen, Map as MapIconLucide, PawPrint, Clapperboard, Download, Gamepad2, Link as LinkIcon, Map, Users as UsersIcon, UserPlus } from 'lucide-react'; // Added Download and fixed FontIcon
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import type { Character, AdventureSettings, Message, PlayerInventoryItem, LootedItem, PlayerSkill, MapPointOfInterest, AiConfig, ComicPage } from "@/types";
import type { GenerateAdventureInput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema } from "@/ai/flows/generate-adventure-genkit";
import { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdventureForm, type AdventureFormValues, type AdventureFormHandle } from '@/components/adventure-form';
import { CharacterSidebar } from '@/components/character-sidebar';
import { ModelManager } from '@/components/model-manager';
import { AdventureDisplay } from '@/components/adventure-display';
import { LanguageSelector } from '@/components/language-selector';
import type { SuggestQuestHookInput } from '@/ai/flows/suggest-quest-hook';
import type { SummarizeHistoryInput } from '@/ai/flows/summarize-history';
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator';
import { Dialog } from '../components/ui/dialog';
import type { NewCharacterSchema } from '@/ai/flows/materialize-character-genkit';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';


interface PageStructureProps {
  adventureSettings: AdventureSettings;
  characters: Character[];
  stagedAdventureSettings: AdventureFormValues;
  handleApplyStagedChanges: () => void;
  narrativeMessages: Message[];
  currentLanguage: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  adventureFormRef: React.RefObject<AdventureFormHandle>;
  handleToggleRpgMode: () => void;
  handleToggleRelationsMode: () => void;
  handleToggleStrategyMode: () => void;
  handleCharacterUpdate: (updatedCharacter: Character) => void;
  handleNewCharacters: (newChars: NewCharacterSchema[]) => void;
  onMaterializeCharacter: (context: string) => Promise<void>;
  onSummarizeHistory: (context: string) => Promise<void>;
  handleSaveNewCharacter: (character: Character) => void;
  onAddStagedCharacter: (character: Character) => void;
  handleSave: () => void;
  handleLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setCurrentLanguage: (lang: string) => void;
  translateTextAction: (input: TranslateTextInput) => Promise<TranslateTextOutput>;
  generateAdventureAction: (userActionText: string) => Promise<void>;
  generateSceneImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
  handleEditMessage: (messageId: string, newContent: string) => void;
  handleRegenerateLastResponse: () => Promise<void>;
  handleUndoLastMessage: () => void;
  playerId: string;
  playerName: string;
  onRestartAdventure: () => void;
  suggestQuestHookAction: () => Promise<void>;
  isSuggestingQuest: boolean;
  showRestartConfirm: boolean;
  setShowRestartConfirm: (open: boolean) => void;
  useAestheticFont: boolean;
  onToggleAestheticFont: () => void;
  currentTurn: number;
  onNarrativeChange: (content: string, type: 'user' | 'ai', sceneDesc?: string, lootItems?: LootedItem[], imageUrl?: string, imageTransform?: ImageTransform, speakingCharacterNames?: string[]) => void;
  aiConfig: AiConfig;
  onAiConfigChange: (newConfig: AiConfig) => void;
  comicDraft: ComicPage[];
  onDownloadComicDraft: () => void;
  onAddComicPage: () => void;
  onAddComicPanel: () => void;
  onRemoveLastComicPanel: () => void;
  onUploadToComicPanel: (pageIndex: number, panelIndex: number, file: File) => void;
  currentComicPageIndex: number;
  onComicPageChange: (index: number) => void;
  onAddToComicPage: (dataUrl: string) => void;
  isSaveComicDialogOpen: boolean;
  setIsSaveComicDialogOpen: (isOpen: boolean) => void;
  comicTitle: string;
  setComicTitle: (title: string) => void;
  comicCoverUrl: string | null;
  onGenerateCover: () => void;
  onSaveToLibrary: () => void;
  isLoading: boolean;
}

export function PageStructure({
  adventureSettings,
  characters,
  stagedAdventureSettings,
  handleApplyStagedChanges,
  narrativeMessages,
  currentLanguage,
  fileInputRef,
  adventureFormRef,
  handleToggleRpgMode,
  handleToggleRelationsMode,
  handleToggleStrategyMode,
  onNarrativeChange,
  handleCharacterUpdate,
  handleNewCharacters,
  onMaterializeCharacter,
  onSummarizeHistory,
  handleSaveNewCharacter,
  onAddStagedCharacter,
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
  playerName,
  onRestartAdventure,
  suggestQuestHookAction,
  isSuggestingQuest,
  showRestartConfirm,
  setShowRestartConfirm,
  useAestheticFont,
  onToggleAestheticFont,
  isLoading,
  currentTurn,
  aiConfig,
  onAiConfigChange,
  comicDraft,
  onDownloadComicDraft,
  onAddComicPage,
  onAddComicPanel,
  onRemoveLastComicPanel,
  onUploadToComicPanel,
  currentComicPageIndex,
  onComicPageChange,
  onAddToComicPage,
  isSaveComicDialogOpen,
  setIsSaveComicDialogOpen,
  comicTitle,
  setComicTitle,
  comicCoverUrl,
  onGenerateCover,
  onSaveToLibrary,
}: PageStructureProps) {

  const stagedCharacters = stagedAdventureSettings?.characters || [];

  return (
    <div className="flex w-full h-screen">
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
                          <Button variant="secondary" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label="Aventure Actuelle"> 
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
                          <Link href="/bd">
                            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label="Éditeur BD">
                                <Clapperboard className="h-5 w-5" />
                                <span className="ml-2 group-data-[collapsible=icon]:hidden">BD</span>
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">Éditeur de BD</TooltipContent>
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
            <a
              href="/downloads/app-local.zip"
              download
              className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start group-data-[collapsible=icon]:justify-center")}
            >
              <Download className="h-5 w-5" />
              <span className="ml-2 group-data-[collapsible=icon]:hidden">Version Locale</span>
            </a>
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
            <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleLoad}
                className="hidden"
            />
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
      <div className="flex-1 flex overflow-hidden">
        <SidebarInset className="flex flex-col h-screen">
            <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <SidebarTrigger /> 
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
            <main className="flex-1 overflow-auto p-4 flex flex-col gap-4">
                <AdventureDisplay
                    playerId={playerId}
                    generateAdventureAction={generateAdventureAction}
                    generateSceneImageAction={generateSceneImageAction}
                    suggestQuestHookAction={suggestQuestHookAction as any}
                    onSummarizeHistory={onSummarizeHistory}
                    adventureSettings={adventureSettings}
                    characters={characters}
                    initialMessages={narrativeMessages}
                    currentLanguage={currentLanguage}
                    onNarrativeChange={onNarrativeChange}
                    onEditMessage={handleEditMessage}
                    onRegenerateLastResponse={handleRegenerateLastResponse}
                    onUndoLastMessage={handleUndoLastMessage}
                    onMaterializeCharacter={onMaterializeCharacter}
                    onRestartAdventure={onRestartAdventure}
                    isSuggestingQuest={isSuggestingQuest}
                    useAestheticFont={useAestheticFont}
                    onToggleAestheticFont={onToggleAestheticFont}
                    comicDraft={comicDraft}
                    onDownloadComicDraft={onDownloadComicDraft}
                    onAddComicPage={onAddComicPage}
                    onAddComicPanel={onAddComicPanel}
                    onRemoveLastComicPanel={onRemoveLastComicPanel}
                    onUploadToComicPanel={onUploadToComicPanel}
                    currentComicPageIndex={currentComicPageIndex}
                    onComicPageChange={onComicPageChange}
                    onAddToComicPage={onAddToComicPage}
                    isSaveComicDialogOpen={isSaveComicDialogOpen}
                    setIsSaveComicDialogOpen={setIsSaveComicDialogOpen}
                    comicTitle={comicTitle}
                    setComicTitle={setComicTitle}
                    comicCoverUrl={comicCoverUrl}
                    onGenerateCover={onGenerateCover}
                    onSaveToLibrary={onSaveToLibrary}
                    isLoading={isLoading}
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
                      <Card>
                          <CardHeader>
                              <CardTitle className="text-base">Modes de Jeu</CardTitle>
                              <CardDescription className="text-xs">Activez ou désactivez les systèmes de jeu.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                              <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                  <div className="space-y-0.5">
                                      <Label className="flex items-center gap-2 text-sm"><Heart className="h-4 w-4"/> Mode Relations</Label>
                                  </div>
                                  <Switch checked={adventureSettings.relationsMode} onCheckedChange={handleToggleRelationsMode} />
                              </div>
                          </CardContent>
                      </Card>


                      <Accordion type="single" collapsible className="w-full" defaultValue="adventure-config-accordion">
                          <AccordionItem value="adventure-config-accordion">
                              <AccordionTrigger>
                                  <div className="flex items-center gap-2">
                                      <FileCog className="h-5 w-5" /> Configuration de l'Aventure
                                  </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                <AdventureForm
                                    ref={adventureFormRef}
                                    initialValues={stagedAdventureSettings}
                                    rpgMode={adventureSettings.rpgMode}
                                    relationsMode={adventureSettings.relationsMode}
                                    strategyMode={adventureSettings.strategyMode}
                                />
                              </AccordionContent>
                          </AccordionItem>
                      </Accordion>

                      <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="player-character-accordion">
                              <AccordionTrigger>
                                  <div className="flex items-center gap-2">
                                      <UserCircle className="h-5 w-5" /> {playerName || "Mon Personnage"}
                                  </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2 space-y-3">
                                  {/* Player details would go here if needed, simplified for relationship version */}
                                  <p className="text-xs text-muted-foreground p-2">Les détails du personnage joueur sont gérés dans l'onglet "Avatars".</p>
                              </AccordionContent>
                          </AccordionItem>
                      </Accordion>

                      <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="characters-accordion">
                              <AccordionTrigger>
                                  <div className="flex items-center gap-2">
                                      <UsersIcon className="h-5 w-5" /> Personnages Secondaires
                                  </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                  <CharacterSidebar
                                      characters={stagedCharacters}
                                      onCharacterUpdate={handleCharacterUpdate}
                                      onSaveNewCharacter={handleSaveNewCharacter}
                                      onAddStagedCharacter={onAddStagedCharacter}
                                      onRelationUpdate={()=>{}}
                                      generateImageAction={generateSceneImageAction}
                                      relationsMode={adventureSettings.relationsMode}
                                      playerId={playerId}
                                      playerName={stagedAdventureSettings.playerName || "Player"}
                                      currentLanguage={currentLanguage}
                                  />
                              </AccordionContent>
                          </AccordionItem>
                      </Accordion>

                      <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="ai-model-config-accordion">
                              <AccordionTrigger>
                                  <div className="flex items-center gap-2">
                                  <BrainCircuit className="h-5 w-5" /> Modèle IA
                                  </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                  <ModelManager
                                    config={aiConfig}
                                    onConfigChange={onAiConfigChange}
                                  />
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
      </div>

       <AlertDialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Recommencer l'aventure ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Êtes-vous sûr de vouloir recommencer l'aventure en cours ? Toute la progression narrative et les changements sur les personnages (non sauvegardés globalement) seront perdus et réinitialisés aux derniers paramètres de l'aventure (ou ceux par défaut si non modifiés).
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowRestartConfirm(false)}>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={onRestartAdventure}>Recommencer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
