

// src/app/page.structure.tsx
// This component defines the main layout structure for the adventure page.
// It uses the Sidebar components and places the AdventureDisplay and configuration panels.

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import next/image
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, Upload, Settings, PanelRight, HomeIcon, Scroll, UserCircle, Users2, FileCog, BrainCircuit, CheckCircle, Lightbulb, Heart, Zap as ZapIcon, BarChart2 as BarChart2Icon, Briefcase, Package, PlayCircle, Trash2 as Trash2Icon, Coins, ImageIcon, Dices, PackageOpen, Shirt, ShieldIcon as ArmorIcon, Sword, Gem, BookOpen, Map as MapIconLucide, PawPrint, MapPin } from 'lucide-react'; // Added MapPin & PawPrint
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import type { Character, AdventureSettings, Message, ActiveCombat, PlayerInventoryItem, LootedItem, PlayerSkill, MapPointOfInterest, Familiar, AiConfig } from "@/types"; // Added Familiar & AiConfig
import type { GenerateAdventureInput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema, CombatUpdatesSchema, NewFamiliarSchema } from "@/ai/flows/generate-adventure-genkit";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from '@/ai/flows/generate-scene-image';
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
import { ModelManager } from '@/components/model-manager';
import { AdventureDisplay } from '@/components/adventure-display';
import { LanguageSelector } from '@/components/language-selector';
import type { SuggestQuestHookInput } from '@/ai/flows/suggest-quest-hook';
import { Avatar, AvatarFallback, AvatarImage as UIAvatarImage } from '@/components/ui/avatar'; 
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter } from '@/components/ui/card'; 
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator';
import type { SellingItemDetails } from './page'; 
import { Input } from '@/components/ui/input'; 
import { PoiSidebar } from '@/components/poi-sidebar';
import { FamiliarSidebar } from '@/components/familiar-sidebar';


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
  generateAdventureAction: (userActionText: string) => Promise<void>;
  generateSceneImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
  handleEditMessage: (messageId: string, newContent: string) => void;
  handleRegenerateLastResponse: () => Promise<void>;
  handleUndoLastMessage: () => void;
  playerId: string;
  playerName: string;
  onRestartAdventure: () => void;
  activeCombat?: ActiveCombat;
  onCombatUpdates: (combatUpdates: CombatUpdatesSchema, itemsObtained: LootedItem[], currencyGained: number) => void;
  suggestQuestHookAction: () => Promise<void>;
  isSuggestingQuest: boolean;
  showRestartConfirm: boolean;
  setShowRestartConfirm: (open: boolean) => void;
  handleTakeLoot: (messageId: string, itemsToTake: PlayerInventoryItem[]) => void;
  handleDiscardLoot: (messageId: string) => void;
  handlePlayerItemAction: (itemId: string, action: 'use' | 'discard') => void;
  handleSellItem: (itemId: string) => void;
  handleGenerateItemImage: (item: PlayerInventoryItem) => Promise<void>;
  isGeneratingItemImage: boolean;
  handleEquipItem: (itemId: string) => void;
  handleUnequipItem: (slot: keyof NonNullable<AdventureSettings['equippedItemIds']>) => void;
  itemToSellDetails: SellingItemDetails | null;
  sellQuantity: number;
  setSellQuantity: (quantity: number) => void;
  confirmSellMultipleItems: (quantity: number) => void;
  onCloseSellDialog: () => void;
  handleMapAction: (poiId: string, action: 'travel' | 'examine' | 'collect' | 'attack' | 'upgrade' | 'visit', buildingId?: string) => void;
  useAestheticFont: boolean;
  onToggleAestheticFont: () => void;
  onGenerateMap: () => Promise<void>;
  isGeneratingMap: boolean;
  onPoiPositionChange: (poiId: string, newPosition: { x: number; y: number; }) => void;
  isLoading: boolean;
  onCreatePoi: (data: { name: string; description: string; type: MapPointOfInterest['icon']; ownerId: string; }) => void;
  onBuildInPoi: (poiId: string, buildingId: string) => void;
  currentTurn: number;
  handleNewFamiliar: (newFamiliar: NewFamiliarSchema) => void;
  handleFamiliarUpdate: (familiar: Familiar) => void;
  handleSaveFamiliar: (familiar: Familiar) => void;
  handleAddStagedFamiliar: (familiar: Familiar) => void;
  onMapImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleNarrativeUpdate: (content: string, type: 'user' | 'ai', sceneDesc?: string, lootItems?: LootedItem[]) => void;
  aiConfig: AiConfig;
  onAiConfigChange: (newConfig: AiConfig) => void;
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
  handleSellItem,
  handleGenerateItemImage,
  isGeneratingItemImage,
  handleEquipItem,
  handleUnequipItem,
  itemToSellDetails,
  sellQuantity,
  setSellQuantity,
  confirmSellMultipleItems,
  onCloseSellDialog,
  handleMapAction,
  useAestheticFont,
  onToggleAestheticFont,
  onGenerateMap,
  isGeneratingMap,
  onPoiPositionChange,
  isLoading,
  onCreatePoi,
  onBuildInPoi,
  currentTurn,
  handleNewFamiliar,
  handleFamiliarUpdate,
  handleSaveFamiliar,
  handleAddStagedFamiliar,
  onMapImageUpload,
  aiConfig,
  onAiConfigChange,
}: PageStructureProps) {

  const getItemTypeColor = (type: PlayerInventoryItem['type'] | undefined, isEquipped?: boolean) => {
    if (isEquipped) return 'border-green-500 ring-2 ring-green-500'; 
    switch (type) {
      case 'consumable': return 'border-blue-500';
      case 'weapon': return 'border-red-500';
      case 'armor': return 'border-gray-500';
      case 'jewelry': return 'border-purple-500';
      case 'quest': return 'border-yellow-600';
      case 'misc': return 'border-orange-500';
      default: return 'border-border';
    }
  };
  
  const getEquippedItem = (slot: keyof NonNullable<AdventureSettings['equippedItemIds']>) => {
    const itemId = adventureSettings.equippedItemIds?.[slot];
    if (!itemId) return null;
    return adventureSettings.playerInventory?.find(item => item.id === itemId);
  };

  const calculateSellPricePerUnit = (item: PlayerInventoryItem | undefined): number => {
    if (!item || !item.goldValue || item.goldValue <= 0) return 0;
    let price = Math.floor(item.goldValue / 2);
    if (price === 0 && item.goldValue > 0) price = 1;
    if (item.goldValue === 1) price = 1;
    return price;
  };

  const playerLocation = adventureSettings.mapPointsOfInterest?.find(
    poi => poi.id === adventureSettings.playerLocationId
  );
  const playerLocationName = playerLocation ? playerLocation.name : "En voyage";


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
                  <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                          <Link href="/familiers">
                            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label="Familiers">
                                <PawPrint className="h-5 w-5" />
                               <span className="ml-2 group-data-[collapsible=icon]:hidden">Familiers</span>
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">Gérer les Familiers</TooltipContent>
                     </Tooltip>
                  </TooltipProvider>
              </nav>
           </SidebarContent>
        </ScrollArea>
        <SidebarFooter className="p-4 border-t border-sidebar-border flex flex-col space-y-2">
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
        <main className="flex-1 overflow-hidden p-4">
             <AdventureDisplay
                playerId={playerId}
                generateAdventureAction={generateAdventureAction}
                generateSceneImageAction={generateSceneImageAction}
                suggestQuestHookAction={suggestQuestHookAction as any}
                adventureSettings={adventureSettings}
                characters={characters}
                initialMessages={narrativeMessages}
                currentLanguage={currentLanguage}
                onNarrativeChange={handleNarrativeUpdate}
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
                handleEquipItem={handleEquipItem} 
                handleUnequipItem={handleUnequipItem}
                handleMapAction={handleMapAction}
                useAestheticFont={useAestheticFont}
                onToggleAestheticFont={onToggleAestheticFont}
                onGenerateMap={onGenerateMap}
                isGeneratingMap={isGeneratingMap}
                onPoiPositionChange={onPoiPositionChange}
                onCreatePoi={onCreatePoi}
                onMapImageUpload={onMapImageUpload}
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
                                                <div className="mt-2 pt-2 border-t">
                                                    <Label className="text-sm font-medium flex items-center">
                                                        <Coins className="h-4 w-4 mr-1 text-amber-600"/>
                                                        Pièces d'Or
                                                    </Label>
                                                    <p className="text-lg font-semibold mt-1">{adventureSettings.playerGold ?? 0}</p>
                                                </div>
                                            )}

                                            {adventureSettings.strategyMode && (
                                            <div className="mt-2 pt-2 border-t">
                                                <Label className="text-sm font-medium flex items-center">
                                                    <MapPin className="h-4 w-4 mr-1 text-blue-600"/>
                                                    Lieu Actuel
                                                </Label>
                                                <p className="text-lg font-semibold mt-1">{playerLocationName}</p>
                                            </div>
                                            )}
                                            
                                            <Accordion type="single" collapsible className="w-full mt-3" defaultValue="player-equipment-accordion">
                                                <AccordionItem value="player-equipment-accordion">
                                                    <AccordionTrigger className="text-sm p-2 hover:no-underline bg-muted/30 rounded-md">
                                                        <div className="flex items-center gap-2">
                                                            <Shirt className="h-4 w-4" /> Équipement
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-2 space-y-2 text-xs">
                                                        {[
                                                            { slot: 'weapon', label: 'Arme', icon: Sword },
                                                            { slot: 'armor', label: 'Armure', icon: ArmorIcon },
                                                            { slot: 'jewelry', label: 'Bijou', icon: Gem },
                                                        ].map(({slot, label, icon: SlotIcon}) => {
                                                            const item = getEquippedItem(slot as keyof NonNullable<AdventureSettings['equippedItemIds']>);
                                                            return (
                                                                <div key={slot} className="flex items-center justify-between p-2 border rounded-md bg-background shadow-sm">
                                                                    <div className="flex items-center gap-2">
                                                                        <SlotIcon className="h-4 w-4 text-muted-foreground" />
                                                                        <span className="font-medium">{label}:</span>
                                                                        <span className="text-muted-foreground truncate max-w-[100px]">{item ? item.name : "Vide"}</span>
                                                                    </div>
                                                                    {item && (
                                                                        <Button variant="outline" size="xs" onClick={() => handleUnequipItem(slot as keyof NonNullable<AdventureSettings['equippedItemIds']>)} disabled={isLoading}>
                                                                            Déséquiper
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>


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
                                                      {adventureSettings.playerInventory.filter(item => item.quantity > 0).map((item, index) => {
                                                          const sellPricePerUnit = calculateSellPricePerUnit(item);
                                                          const sellLabel = sellPricePerUnit > 0
                                                            ? `Vendre (pour ${sellPricePerUnit} PO ${item.quantity > 1 ? 'chacun' : ''})`
                                                            : "Vendre (invendable)";

                                                          return (
                                                            <DropdownMenu key={`inventory-item-${item.id}`}>
                                                              <TooltipProvider>
                                                                <Tooltip>
                                                                  <TooltipTrigger asChild>
                                                                    <DropdownMenuTrigger asChild>
                                                                      <div
                                                                        className={cn(
                                                                          "relative flex flex-col items-center justify-center aspect-square border-2 rounded-md bg-background hover:bg-accent/50 cursor-pointer p-1 shadow-sm overflow-hidden",
                                                                          getItemTypeColor(item.type, item.isEquipped),
                                                                          isLoading && "cursor-not-allowed opacity-50"
                                                                        )}
                                                                      >
                                                                        {item.generatedImageUrl && typeof item.generatedImageUrl === 'string' && item.generatedImageUrl.startsWith('data:image') ? (
                                                                            <Image
                                                                                key={item.generatedImageUrl} 
                                                                                src={item.generatedImageUrl}
                                                                                alt={`${item.name} icon`}
                                                                                fill
                                                                                style={{ objectFit: 'contain' }}
                                                                                sizes="40px"
                                                                                data-ai-hint={`${item.name} icon`}
                                                                            />
                                                                        ) : (
                                                                            <PackageOpen size={20} className="text-foreground/80" />
                                                                        )}
                                                                         <span className="absolute bottom-0 left-0 right-0 text-[10px] leading-tight truncate w-full text-center text-foreground/90 block bg-background/70 px-0.5">
                                                                            {item.name}
                                                                          </span>
                                                                        {item.quantity > 1 && (
                                                                          <span
                                                                            className="absolute top-0 right-0 text-[10px] bg-primary text-primary-foreground rounded-bl-md px-1 py-0.5 leading-none"
                                                                          >
                                                                            {item.quantity}
                                                                          </span>
                                                                        )}
                                                                         {item.isEquipped && <CheckCircle size={12} className="absolute top-0.5 left-0.5 text-green-500 bg-background rounded-full"/>}
                                                                      </div>
                                                                    </DropdownMenuTrigger>
                                                                  </TooltipTrigger>
                                                                  <TooltipContent side="top" align="center" className="w-auto max-w-xs">
                                                                    {item.generatedImageUrl && typeof item.generatedImageUrl === 'string' && item.generatedImageUrl.startsWith('data:image') && (
                                                                        <div className="relative w-24 h-24 mb-2 mx-auto border rounded-md overflow-hidden bg-muted">
                                                                            <Image
                                                                                src={item.generatedImageUrl}
                                                                                alt={`${item.name} image`}
                                                                                fill
                                                                                style={{ objectFit: 'contain' }}
                                                                                sizes="96px"
                                                                                data-ai-hint={`${item.name} preview`}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <p className="font-semibold">{item.name} (x{item.quantity}) {item.isEquipped ? "(Équipé)" : ""}</p>
                                                                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                                                                    {item.effect && <p className="text-xs text-primary">Effet: {item.effect}</p>}
                                                                    {item.statBonuses && (
                                                                        <div className="text-xs mt-1">
                                                                            <p className="font-medium">Bonus:</p>
                                                                            {item.statBonuses.ac && <p>CA: +{item.statBonuses.ac}</p>}
                                                                            {item.statBonuses.attack && <p>Attaque: +{item.statBonuses.attack}</p>}
                                                                            {item.statBonuses.damage && <p>Dégâts: {item.statBonuses.damage}</p>}
                                                                        </div>
                                                                    )}
                                                                    {item.type && <p className="text-xs capitalize">Type: {item.type}</p>}
                                                                    {item.goldValue !== undefined && item.goldValue > 0 && <p className="text-xs text-amber-600">Valeur : {item.goldValue} PO</p>}
                                                                     {sellPricePerUnit > 0 && <p className="text-xs text-green-600">Vendable pour : {sellPricePerUnit} PO {item.quantity > 1 ? 'chacun' : ''}</p>}
                                                                  </TooltipContent>
                                                                </Tooltip>
                                                              </TooltipProvider>
                                                              <DropdownMenuContent>
                                                                 {(item.type === 'weapon' || item.type === 'armor' || item.type === 'jewelry') && (
                                                                    item.isEquipped ? (
                                                                        <DropdownMenuItem onSelect={() => handleUnequipItem(item.type as 'weapon' | 'armor' | 'jewelry')} disabled={isLoading}>
                                                                            <Trash2Icon className="mr-2 h-4 w-4" /> Déséquiper
                                                                        </DropdownMenuItem>
                                                                    ) : (
                                                                        <DropdownMenuItem onSelect={() => handleEquipItem(item.id)} disabled={isLoading}>
                                                                            <Shirt className="mr-2 h-4 w-4" /> Équiper
                                                                        </DropdownMenuItem>
                                                                    )
                                                                )}
                                                                <DropdownMenuItem
                                                                  onSelect={() => handlePlayerItemAction(item.id, 'use')}
                                                                  disabled={(item.type !== 'consumable' && item.type !== 'misc') || isLoading}
                                                                >
                                                                  <PlayCircle className="mr-2 h-4 w-4" /> Utiliser
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handlePlayerItemAction(item.id, 'discard')} disabled={isLoading}>
                                                                  <Trash2Icon className="mr-2 h-4 w-4" /> Jeter
                                                                </DropdownMenuItem>
                                                                 <DropdownMenuItem 
                                                                  onSelect={() => handleSellItem(item.id)}
                                                                  disabled={sellPricePerUnit <= 0 || isLoading}
                                                                >
                                                                  <Coins className="mr-2 h-4 w-4" /> {sellLabel}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                  onSelect={() => handleGenerateItemImage(item)}
                                                                  disabled={isLoading}
                                                                >
                                                                  <ImageIcon className="mr-2 h-4 w-4" /> Générer Image
                                                                </DropdownMenuItem>
                                                              </DropdownMenuContent>
                                                            </DropdownMenu>
                                                          );
                                                      })}
                                                    </div>
                                                  </ScrollArea>
                                                )}
                                                {isLoading && (
                                                  <p className="text-xs text-muted-foreground italic text-center p-1 mt-2">
                                                    Veuillez attendre la fin de l'action en cours avant d'en utiliser un autre.
                                                  </p>
                                                )}
                                              </CardContent>
                                            </Card>
                                            <Accordion type="single" collapsible className="w-full mt-3">
                                                <AccordionItem value="player-skills-accordion">
                                                    <AccordionTrigger className="text-sm p-2 hover:no-underline bg-muted/30 rounded-md">
                                                        <div className="flex items-center gap-2">
                                                            <BookOpen className="h-4 w-4" /> Compétences
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-2 space-y-1 text-xs">
                                                        {(adventureSettings.playerSkills && adventureSettings.playerSkills.length > 0) ? (
                                                            adventureSettings.playerSkills.map(skill => (
                                                                <TooltipProvider key={skill.id}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="p-2 border rounded-md bg-background shadow-sm cursor-default">
                                                                                <p className="font-medium text-foreground">{skill.name}</p>
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" align="start" className="w-auto max-w-xs">
                                                                            <p className="font-semibold">{skill.name}</p>
                                                                            <p className="text-xs text-muted-foreground">{skill.description}</p>
                                                                            {skill.category && <p className="text-xs capitalize text-primary">Catégorie: {skill.category}</p>}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            ))
                                                        ) : (
                                                            <p className="text-muted-foreground italic px-2">Aucune compétence acquise.</p>
                                                        )}
                                                        {/* Future: Button to choose new skill on level up */}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </CardContent>
                                    </Card>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}

                     {adventureSettings.strategyMode && (
                     <Accordion type="single" collapsible className="w-full" defaultValue="poi-accordion">
                         <AccordionItem value="poi-accordion">
                             <AccordionTrigger>
                                 <div className="flex items-center gap-2">
                                     <MapIconLucide className="h-5 w-5" /> Points d'Intérêt
                                 </div>
                             </AccordionTrigger>
                             <AccordionContent className="pt-2">
                                <PoiSidebar
                                    playerId={playerId}
                                    playerName={playerName}
                                    pointsOfInterest={adventureSettings.mapPointsOfInterest || []}
                                    characters={characters}
                                    onMapAction={handleMapAction}
                                    currentTurn={currentTurn}
                                    isLoading={isLoading}
                                    playerGold={adventureSettings.playerGold}
                                    onBuildInPoi={onBuildInPoi}
                                 />
                             </AccordionContent>
                         </AccordionItem>
                     </Accordion>
                     )}

                     <Accordion type="single" collapsible className="w-full">
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
                                     rpgMode={adventureSettings.rpgMode ?? false}
                                     relationsMode={adventureSettings.relationsMode ?? true}
                                     strategyMode={adventureSettings.strategyMode ?? false}
                                     playerId={playerId}
                                     playerName={stagedAdventureSettings.playerName || "Player"}
                                     currentLanguage={currentLanguage}
                                     pointsOfInterest={adventureSettings.mapPointsOfInterest || []}
                                 />
                             </AccordionContent>
                         </AccordionItem>
                     </Accordion>
                      
                     {adventureSettings.rpgMode && (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="familiars-accordion">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2">
                                        <PawPrint className="h-5 w-5" /> Familiers
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2">
                                    <FamiliarSidebar
                                        familiars={stagedAdventureSettings.familiars || []}
                                        onFamiliarUpdate={handleFamiliarUpdate}
                                        onSaveFamiliar={handleSaveFamiliar}
                                        onAddStagedFamiliar={handleAddStagedFamiliar}
                                        generateImageAction={generateSceneImageAction}
                                        rpgMode={stagedAdventureSettings.rpgMode ?? false}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                      )}

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

        {itemToSellDetails && (
             <AlertDialog open={!!itemToSellDetails} onOpenChange={(open) => !open && onCloseSellDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Vendre {itemToSellDetails.item.name}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Combien d'exemplaires de "{itemToSellDetails.item.name}" souhaitez-vous vendre ?
                            <br />
                            Vous en possédez {itemToSellDetails.item.quantity}.
                            Prix de vente unitaire : {itemToSellDetails.sellPricePerUnit} PO.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="sell-quantity-input">Quantité à vendre :</Label>
                        <Input
                            id="sell-quantity-input"
                            type="number"
                            value={sellQuantity}
                            onChange={(e) => {
                                let val = parseInt(e.target.value, 10);
                                if (isNaN(val)) val = 1;
                                if (val < 1) val = 1;
                                if (val > itemToSellDetails.item.quantity) val = itemToSellDetails.item.quantity;
                                setSellQuantity(val);
                            }}
                            min="1"
                            max={itemToSellDetails.item.quantity}
                            className="mt-1"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={onCloseSellDialog}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => confirmSellMultipleItems(sellQuantity)}>
                            Vendre {sellQuantity} pour {sellQuantity * itemToSellDetails.sellPricePerUnit} PO
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
    </>
  );
}
