
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
import { Save, Upload, Settings, PanelRight, HomeIcon, Scroll, UserCircle, Users2, FileCog, BrainCircuit, CheckCircle, Lightbulb, Heart, Zap as ZapIcon, BarChart2 as BarChart2Icon, Briefcase, Package, PlayCircle, Trash2 as Trash2Icon, Coins } from 'lucide-react';
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import type { Character, AdventureSettings, Message, ActiveCombat, PlayerInventoryItem, LootedItem } from "@/types";
import type { GenerateAdventureInput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema, CombatUpdatesSchema } from "@/ai/flows/generate-adventure";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdventureForm, type AdventureFormValues } from '@/components/adventure-form';
import { CharacterSidebar } from '@/components/character-sidebar';
import { ModelLoader } from '@/components/model-loader';
import { AdventureDisplay } from '@/components/adventure-display';
import { LanguageSelector } from '@/components/language-selector';
import type { SuggestQuestHookInput } from '@/ai/flows/suggest-quest-hook';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { cn } from "@/lib/utils";


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
  handleNarrativeUpdate: (content: string, type: 'user' | 'ai', sceneDesc?: string, lootItems?: LootedItem[]) => void;
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
  playerName: string;
  onRestartAdventure: () => void;
  activeCombat?: ActiveCombat;
  onCombatUpdates: (combatUpdates: CombatUpdatesSchema) => void;
  suggestQuestHookAction: () => Promise<void>;
  isSuggestingQuest: boolean;
  showRestartConfirm: boolean;
  setShowRestartConfirm: (open: boolean) => void;
  handleTakeLoot: (messageId: string, itemsToTake: LootedItem[]) => void;
  handleDiscardLoot: (messageId: string) => void;
  handlePlayerItemAction: (itemName: string, action: 'use' | 'discard') => void;
  handleSellItem: (itemName: string) => void; // Added prop for selling items
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
  playerName,
  onRestartAdventure,
  activeCombat,
  onCombatUpdates,
  suggestQuestHookAction,
  isSuggestingQuest,
  showRestartConfirm,
  setShowRestartConfirm,
  handleTakeLoot,
  handleDiscardLoot,
  handlePlayerItemAction,
  handleSellItem, // Destructure the new prop
}: PageStructureProps) {

  const getItemTypeColor = (type: PlayerInventoryItem['type'] | undefined) => {
    switch (type) {
      case 'consumable': return 'border-blue-500';
      case 'weapon': return 'border-red-500';
      case 'armor': return 'border-gray-500';
      case 'quest': return 'border-purple-500';
      case 'misc': return 'border-yellow-600';
      default: return 'border-border';
    }
  };


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
               <Accordion type="single" collapsible className="w-full">
                 <AccordionItem value="ai-model-config-accordion-left">
                   <AccordionTrigger>
                     <div className="flex items-center gap-2">
                       <BrainCircuit className="h-5 w-5" />
                       <span className="group-data-[collapsible=icon]:hidden">Modèle IA</span>
                     </div>
                   </AccordionTrigger>
                   <AccordionContent className="pt-2 px-0 group-data-[collapsible=icon]:hidden">
                     <ModelLoader />
                   </AccordionContent>
                 </AccordionItem>
               </Accordion>

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
                suggestQuestHookAction={suggestQuestHookAction as any} // Cast to any to avoid TS error due to different function signatures
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
                onRestartAdventure={onRestartAdventure}
                isSuggestingQuest={isSuggestingQuest}
                handleTakeLoot={handleTakeLoot}
                handleDiscardLoot={handleDiscardLoot}
                handlePlayerItemAction={handlePlayerItemAction}
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
                     <Accordion type="single" collapsible className="w-full" defaultValue="adventure-config-accordion">
                         <AccordionItem value="adventure-config-accordion">
                             <AccordionTrigger>
                                 <div className="flex items-center gap-2">
                                     <FileCog className="h-5 w-5" /> Configuration de l'Aventure
                                 </div>
                             </AccordionTrigger>
                             <AccordionContent className="pt-2">
                                <AdventureForm
                                    formPropKey={formPropKey}
                                    initialValues={stagedAdventureSettings}
                                    onSettingsChange={handleSettingsUpdate}
                                />
                             </AccordionContent>
                         </AccordionItem>
                     </Accordion>

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
                                                    {/* TODO: Add player portrait if available from /avatars page or adventureSettings */}
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
                                                        <Label htmlFor="player-mp-sidebar" className="text-sm font-medium flex items-center"><ZapIcon className="h-4 w-4 mr-1 text-blue-500"/>PM</Label>
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
                                            
                                            {adventureSettings.rpgMode && adventureSettings.playerGold !== undefined && (
                                                <div className="mt-3 pt-3 border-t">
                                                    <Label className="text-sm font-medium flex items-center">
                                                        <Coins className="h-4 w-4 mr-1 text-yellow-600"/>
                                                        Pièces d'Or
                                                    </Label>
                                                    <p className="text-lg font-semibold mt-1">{adventureSettings.playerGold ?? 0}</p>
                                                </div>
                                            )}

                                            <CardDescription className="text-xs pt-2">
                                              <Briefcase className="inline h-3 w-3 mr-1" /> Inventaire :
                                            </CardDescription>
                                            <Card className="mt-1 bg-muted/30 border">
                                              <CardContent className="p-2">
                                                {(!adventureSettings.playerInventory || adventureSettings.playerInventory.filter(item => item.quantity > 0).length === 0) ? (
                                                  <p className="text-xs text-muted-foreground italic">Inventaire vide.</p>
                                                ) : (
                                                  <ScrollArea className="h-auto max-h-48">
                                                    <div className="grid grid-cols-5 gap-2 p-1">
                                                      {adventureSettings.playerInventory.filter(item => item.quantity > 0).map((item, index) => (
                                                        <DropdownMenu key={`${item.name}-${index}-${item.quantity}`}>
                                                          <TooltipProvider>
                                                            <Tooltip>
                                                              <TooltipTrigger asChild>
                                                                <DropdownMenuTrigger asChild>
                                                                  <div
                                                                    className={cn(
                                                                      "flex flex-col items-center justify-center aspect-square border-2 rounded-md bg-background hover:bg-accent/50 cursor-pointer p-1 shadow-sm relative overflow-hidden",
                                                                      getItemTypeColor(item.type)
                                                                    )}
                                                                  >
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
                                                                </DropdownMenuTrigger>
                                                              </TooltipTrigger>
                                                              <TooltipContent side="top" align="center">
                                                                <p className="font-semibold">{item.name} (x{item.quantity})</p>
                                                                {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                                                                {item.effect && <p className="text-xs text-primary">Effet: {item.effect}</p>}
                                                                {item.type && <p className="text-xs capitalize">Type: {item.type}</p>}
                                                                {item.goldValue !== undefined && item.goldValue > 0 && <p className="text-xs text-amber-600">Valeur : {item.goldValue} PO</p>}
                                                              </TooltipContent>
                                                            </Tooltip>
                                                          </TooltipProvider>
                                                          <DropdownMenuContent>
                                                            <DropdownMenuItem
                                                              onSelect={() => handlePlayerItemAction(item.name, 'use')}
                                                              disabled={item.type !== 'consumable'}
                                                            >
                                                              <PlayCircle className="mr-2 h-4 w-4" /> Utiliser
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handlePlayerItemAction(item.name, 'discard')}>
                                                              <Trash2Icon className="mr-2 h-4 w-4" /> Jeter
                                                            </DropdownMenuItem>
                                                             <DropdownMenuItem 
                                                              onSelect={() => handleSellItem(item.name)}
                                                              disabled={!item.goldValue || item.goldValue <= 0}
                                                            >
                                                              <Coins className="mr-2 h-4 w-4" /> Vendre (pour {Math.floor((item.goldValue || 0) / 2)} PO)
                                                            </DropdownMenuItem>
                                                          </DropdownMenuContent>
                                                        </DropdownMenu>
                                                      ))}
                                                    </div>
                                                  </ScrollArea>
                                                )}
                                              </CardContent>
                                            </Card>
                                        </CardContent>
                                    </Card>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}

                     <Accordion type="single" collapsible className="w-full" defaultValue="characters-accordion">
                         <AccordionItem value="characters-accordion">
                             <AccordionTrigger>
                                 <div className="flex items-center gap-2">
                                     <Users2 className="h-5 w-5" /> Personnages Secondaires
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

