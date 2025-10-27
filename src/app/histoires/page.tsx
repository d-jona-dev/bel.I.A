

"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Play, PlusCircle, MessageSquare, AlertTriangle, Download, Edit, Brush, BrainCircuit, Bot, Users as UsersIcon, UserCog, UserPlus } from 'lucide-react';
import Link from 'next/link';
import type { Character, AdventureSettings, SaveData, MapPointOfInterest, PlayerAvatar, TimeManagementSettings, AiConfig, LocalizedText } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdventureForm, type AdventureFormValues, type AdventureFormHandle } from '@/components/adventure-form';
import { ModelManager } from '@/components/model-manager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSaveLoad } from '@/hooks/systems/useSaveLoad';
import { i18n, type Language } from '@/lib/i18n';
import { getLocalizedText } from '@/hooks/systems/useAdventureState';


// Helper to generate a unique ID
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

interface SavedStory {
  id: string;
  title: string;
  date: string;
  description: string;
  // This will hold the full adventure state
  adventureState: SaveData;
}

const createNewAdventureState = (): SaveData => ({
    adventureSettings: {
        world: { fr: "" },
        initialSituation: { fr: "" },
        rpgMode: true,
        relationsMode: true,
        strategyMode: true,
        comicModeActive: false,
        playerName: "Héros",
        playerClass: "Aventurier",
        playerLevel: 1,
        playerInitialAttributePoints: 10,
        playerStrength: 8,
        playerDexterity: 8,
        playerConstitution: 8,
        playerIntelligence: 8,
        playerWisdom: 8,
        playerCharisma: 8,
        playerCurrentHp: 20,
        playerMaxHp: 20,
        playerCurrentMp: 0,
        playerMaxMp: 0,
        playerCurrentExp: 0,
        playerExpToNextLevel: 100,
        playerGold: 10,
        playerInventory: [],
        playerSkills: [],
        equippedItemIds: { weapon: null, armor: null, jewelry: null },
        familiars: [],
        mapPointsOfInterest: [],
        mapImageUrl: null,
        playerPortraitUrl: null,
        playerDetails: "",
        playerDescription: "",
        playerOrientation: "",
        timeManagement: {
            enabled: false,
            day: 1,
            dayName: "Lundi",
            dayNames: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
            currentTime: "12:00",
            timeFormat: "24h",
            currentEvent: "",
            timeElapsedPerTurn: "00:15",
        },
    },
    characters: [],
    narrative: [],
    currentLanguage: "fr",
    saveFormatVersion: 2.6,
    timestamp: new Date().toISOString(),
});


export default function HistoiresPage() {
  const { toast } = useToast();
  
  const [savedStories, setSavedStories] = React.useState<SavedStory[]>([]);
  const [savedCharacters, setSavedCharacters] = React.useState<Character[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [storyToDelete, setStoryToDelete] = React.useState<SavedStory | null>(null);
  const [editingStory, setEditingStory] = React.useState<SavedStory | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isCreateFormValid, setIsCreateFormValid] = React.useState(false);
  const importFileRef = React.useRef<HTMLInputElement>(null);
  
  const editFormRef = React.useRef<AdventureFormHandle>(null);
  const createFormRef = React.useRef<AdventureFormHandle>(null);

  // New state for character slot assignment
  const [assigningSlotsForStory, setAssigningSlotsForStory] = React.useState<SavedStory | null>(null);
  const [slotAssignments, setSlotAssignments] = React.useState<Record<string, string>>({});


  const [aiConfig, setAiConfig] = React.useState<AiConfig>({
      llm: { source: 'gemini' },
      image: { source: 'gemini' }
  });
  const [isAiConfigOpen, setIsAiConfigOpen] = React.useState(false);
  const [currentLanguage, setCurrentLanguage] = React.useState<Language>('fr');
  const lang = i18n[currentLanguage] || i18n.fr;

  const loadData = React.useCallback(() => {
    try {
      const savedLanguage = localStorage.getItem('adventure_language') as Language;
      if (savedLanguage && i18n[savedLanguage]) {
          setCurrentLanguage(savedLanguage);
      }
      const storiesFromStorage = localStorage.getItem('adventureStories');
      if (storiesFromStorage) {
        setSavedStories(JSON.parse(storiesFromStorage));
      } else {
        setSavedStories([]);
      }
      const charactersFromStorage = localStorage.getItem('globalCharacters');
      if (charactersFromStorage) {
        setSavedCharacters(JSON.parse(charactersFromStorage));
      } else {
        setSavedCharacters([]);
      }
      const aiConfigFromStorage = localStorage.getItem('globalAiConfig');
      if (aiConfigFromStorage) {
        setAiConfig(JSON.parse(aiConfigFromStorage));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
      toast({
        title: lang.loadingErrorTitle,
        description: lang.loadingErrorDescription,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  },[toast, lang]);

  // Use the new hook
  const { handleDownloadStory, handleImportStory: handleImportStoryGeneric } = useSaveLoad({
    // Pass dummy state as this page doesn't have an active adventure
    adventureSettings: createNewAdventureState().adventureSettings,
    characters: [],
    narrativeMessages: [],
    currentLanguage: currentLanguage,
    aiConfig: aiConfig,
    loadAdventureState: () => {}, // Not used here
  });

  const handleImportStory = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleImportStoryGeneric(event, savedStories, (newStories) => saveStories(newStories));
  };


  React.useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleAiConfigChange = (newConfig: AiConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('globalAiConfig', JSON.stringify(newConfig));
    toast({ title: lang.aiConfigTitle + " mise à jour." });
  }


  const saveStories = (stories: SavedStory[]) => {
    setSavedStories(stories);
    localStorage.setItem('adventureStories', JSON.stringify(stories));
  }

  const handleClearLocalStorage = () => {
    try {
      const keysToClear = [
        'adventureStories',
        'globalCharacters',
        'savedComics_v1',
        'playerAvatars_v2',
        'currentAvatarId',
        'globalFamiliars',
        'customImageStyles_v1',
        // Ajoutez d'autres clés si nécessaire
      ];
      keysToClear.forEach(key => localStorage.removeItem(key));
      loadData(); // Re-load data which will now be empty
      toast({
        title: "Données Locales Effacées",
        description: "Toutes les sauvegardes d'aventures, de personnages et de BD ont été supprimées.",
      });
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'effacer les données locales.",
        variant: "destructive",
      });
    }
  };
  
  const handleLaunchStory = (storyId: string) => {
    const storyToLoad = savedStories.find(s => s.id === storyId);
    if (!storyToLoad) {
      toast({ title: "Erreur", description: `Impossible de charger l'histoire.`, variant: 'destructive' });
      return;
    }

    // Save the currently selected language so the adventure page can pick it up.
    localStorage.setItem('adventure_language', currentLanguage);

    const placeholderChars = storyToLoad.adventureState.characters.filter(c => c.isPlaceholder);

    if (placeholderChars.length > 0) {
        setAssigningSlotsForStory(storyToLoad);
        setSlotAssignments({}); // Reset previous assignments
    } else {
        localStorage.setItem('loadStoryIdOnMount', storyId);
        window.location.href = '/';
    }
  };

  const handleConfirmSlotAssignmentsAndLaunch = () => {
    if (!assigningSlotsForStory) return;

    // Save the currently selected language so the adventure page can pick it up.
    localStorage.setItem('adventure_language', currentLanguage);
    
    const placeholderChars = assigningSlotsForStory.adventureState.characters.filter(c => c.isPlaceholder);
    const allSlotsFilled = placeholderChars.every(p => slotAssignments[p.id!]);

    if (!allSlotsFilled) {
        toast({ title: "Erreur", description: "Veuillez assigner un personnage à chaque rôle.", variant: "destructive" });
        return;
    }
    
    // Create a temporary copy for the session, DO NOT modify the original story
    const temporaryAdventureState = JSON.parse(JSON.stringify(assigningSlotsForStory.adventureState)) as SaveData;

    temporaryAdventureState.characters = temporaryAdventureState.characters.map(char => {
        if (char.isPlaceholder) {
            const assignedCharId = slotAssignments[char.id!];
            const fullCharData = savedCharacters.find(sc => sc.id === assignedCharId);
            if (fullCharData) {
                // Create a fresh copy of the global character
                const charCopy = JSON.parse(JSON.stringify(fullCharData));
                
                // Return a new object with the correct structure, but without merging relations
                return { 
                    ...charCopy, 
                    id: char.id, 
                    isPlaceholder: false,
                    // Keep the global character's relations as is
                    relations: charCopy.relations || {},
                    locationId: temporaryAdventureState.adventureSettings.playerLocationId || null,
                    // Store the placeholder's name as the 'role'
                    roleInStory: char.name, 
                };
            }
        }
        return char;
    }).filter(char => !!char);

    // Save the fully resolved temporary state to localStorage for the adventure page to pick up.
    localStorage.setItem('tempAdventureState', JSON.stringify(temporaryAdventureState));
    localStorage.removeItem('loadStoryIdOnMount'); // Clean up old launch mechanism

    setAssigningSlotsForStory(null);
    window.location.href = '/';
};


  const confirmDeleteStory = () => {
    if (storyToDelete) {
      const updatedStories = savedStories.filter(story => story.id !== storyToDelete.id);
      saveStories(updatedStories);
      toast({
        title: "Histoire Supprimée",
        description: `L'histoire "${storyToDelete.title}" a été supprimée.`,
      });
      setStoryToDelete(null);
    }
  };

  const handleSaveChanges = async () => {
      if (editingStory && editFormRef.current) {
          const formValues = await editFormRef.current.getFormData();
          if (!formValues) return;

          const updatedState: SaveData = {
              ...editingStory.adventureState,
              adventureSettings: {
                  ...editingStory.adventureState.adventureSettings,
                  ...formValues,
                  rpgMode: formValues.rpgMode ?? editingStory.adventureState.adventureSettings.rpgMode,
                  relationsMode: formValues.relationsMode ?? editingStory.adventureState.adventureSettings.relationsMode,
                  strategyMode: formValues.strategyMode ?? editingStory.adventureState.adventureSettings.strategyMode,
                  comicModeActive: formValues.comicModeActive ?? editingStory.adventureState.adventureSettings.comicModeActive,
                  mapPointsOfInterest: (formValues.mapPointsOfInterest as MapPointOfInterest[] || []).map(poi => ({...poi, id: poi.id ?? uid()})),
              },
              characters: (formValues.characters || []).map(c => ({
                  ...editingStory.adventureState.characters.find(ec => ec.id === c.id),
                  ...c, 
                  id: c.id || uid(),
              } as Character))
          };

          const updatedStory: SavedStory = {
              ...editingStory,
              title: getLocalizedText(formValues.world, 'fr') || editingStory.title,
              description: getLocalizedText(formValues.initialSituation, 'fr') || editingStory.description,
              adventureState: updatedState,
              date: new Date().toISOString().split('T')[0],
          };

          const updatedStories = savedStories.map(s => s.id === updatedStory.id ? updatedStory : s);
          saveStories(updatedStories);
          toast({ title: "Histoire Mise à Jour", description: "Les modifications ont été sauvegardées." });
          setEditingStory(null);
      }
  };
  
  const handleCreateNewStory = async () => {
    if (!createFormRef.current) return;
    const formValues = await createFormRef.current.getFormData();
    if (!formValues) {
        // Validation failed, the form component already showed toasts.
        return;
    }

    const newId = uid();
    // Start with a clean slate
    const newAdventureState = createNewAdventureState();

    // Populate the state with values from the form
    newAdventureState.adventureSettings = {
        ...newAdventureState.adventureSettings,
        ...formValues,
        world: formValues.world,
        initialSituation: formValues.initialSituation,
        playerName: formValues.playerName || "Héros",
        rpgMode: formValues.rpgMode ?? true,
        relationsMode: formValues.relationsMode ?? true,
        strategyMode: formValues.strategyMode ?? true,
        comicModeActive: formValues.comicModeActive ?? false,
        mapPointsOfInterest: (formValues.mapPointsOfInterest as MapPointOfInterest[] || []).map(poi => ({ ...poi, id: poi.id ?? uid() })),
    };

    newAdventureState.characters = (formValues.characters || []).filter(c => c.name && (c.details || c.isPlaceholder)).map(c => ({
        ...c,
        id: c.id || uid(),
    } as Character));
    
    // Set the narrative to start with the initial situation in french
    newAdventureState.narrative = [{
        id: `msg-${Date.now()}`,
        type: 'system',
        content: newAdventureState.adventureSettings.initialSituation.fr || newAdventureState.adventureSettings.initialSituation.en || '',
        timestamp: Date.now()
    }];

    const newStory: SavedStory = {
        id: newId,
        title: getLocalizedText(formValues.world, 'fr') || "Nouvelle Histoire",
        description: getLocalizedText(formValues.initialSituation, 'fr') || "...",
        adventureState: newAdventureState,
        date: new Date().toISOString().split('T')[0],
    };

    // Save the new story to the list
    const updatedStories = [...savedStories, newStory];
    saveStories(updatedStories);
    
    toast({ title: "Nouvelle Aventure Créée!", description: "Lancement de l'histoire..." });
    setIsCreateModalOpen(false);

    handleLaunchStory(newId);
  }

  
  const getAdventureFormValues = (story: SavedStory | null): AdventureFormValues => {
      const defaultState = createNewAdventureState();
      if (!story) {
          return {
              world: defaultState.adventureSettings.world,
              initialSituation: defaultState.adventureSettings.initialSituation,
              characters: [],
              rpgMode: true,
              relationsMode: true,
              strategyMode: true,
              comicModeActive: false,
              playerName: 'Héros',
              playerClass: 'Aventurier',
              playerPortraitUrl: null,
              playerDetails: "",
              playerDescription: "",
              playerOrientation: "",
              timeManagement: defaultState.adventureSettings.timeManagement,
          };
      }
      
      const settings = story.adventureState.adventureSettings;
      return {
          world: settings.world,
          initialSituation: settings.initialSituation,
          characters: story.adventureState.characters.map(c => ({ 
              id: c.id, 
              name: c.name, 
              details: c.details,
              isPlaceholder: c.isPlaceholder,
              roleInStory: c.roleInStory,
              portraitUrl: c.portraitUrl || null,
              factionColor: c.factionColor,
              affinity: c.affinity,
              relations: c.relations,
          })),
          rpgMode: settings.rpgMode,
          relationsMode: settings.relationsMode,
          strategyMode: settings.strategyMode,
          comicModeActive: settings.comicModeActive,
          playerName: settings.playerName,
          playerClass: settings.playerClass,
          playerDetails: settings.playerDetails,
          playerDescription: settings.playerDescription,
          playerOrientation: settings.playerOrientation,
          playerPortraitUrl: settings.playerPortraitUrl,
          mapPointsOfInterest: settings.mapPointsOfInterest,
          timeManagement: settings.timeManagement,
      }
  }

  const openEditDialog = (story: SavedStory) => {
    setEditingStory(story);
  }
  
  const openCreateDialog = () => {
    setIsCreateFormValid(false);
    setIsCreateModalOpen(true);
  }
  
  const createForm = React.useMemo(() => (
    <AdventureForm
      key={`create-${isCreateModalOpen}`}
      ref={createFormRef}
      initialValues={getAdventureFormValues(null)}
      rpgMode={true} 
      relationsMode={true}
      strategyMode={true}
      aiConfig={aiConfig}
      onFormValidityChange={setIsCreateFormValid}
      currentLanguage={currentLanguage}
    />
  ), [isCreateModalOpen, aiConfig, currentLanguage]);

  const editForm = React.useMemo(() => {
    if (!editingStory) return null;
    return (
        <AdventureForm
           key={`edit-${editingStory.id}`}
           ref={editFormRef}
           initialValues={getAdventureFormValues(editingStory)}
           rpgMode={editingStory.adventureState.adventureSettings.rpgMode}
           relationsMode={editingStory.adventureState.adventureSettings.relationsMode}
           strategyMode={editingStory.adventureState.adventureSettings.strategyMode}
           aiConfig={aiConfig}
           currentLanguage={currentLanguage}
        />
    )
  }, [editingStory, aiConfig, currentLanguage]);


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{lang.savedStoriesTitle}</h1>
        <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Brush className="mr-2 h-4 w-4"/> {lang.clearDataButton}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{lang.clearDataDialogTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {lang.clearDataDialogDesc}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{lang.cancelButton}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearLocalStorage}>{lang.clearDataConfirmButton}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <input type="file" ref={importFileRef} onChange={handleImportStory} accept=".json" className="hidden" />
            <Button variant="outline" onClick={() => importFileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> {lang.importButton}
            </Button>
            <Dialog open={isAiConfigOpen} onOpenChange={setIsAiConfigOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline"><BrainCircuit className="mr-2 h-4 w-4" /> {lang.aiConfigTitle}</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{lang.aiGlobalConfigTitle}</DialogTitle>
                        <DialogDescription>
                            {lang.aiGlobalConfigDescription}
                        </DialogDescription>
                    </DialogHeader>
                    <ModelManager config={aiConfig} onConfigChange={handleAiConfigChange} currentLanguage={currentLanguage} />
                </DialogContent>
            </Dialog>
            <Link href="/creation-assistee">
              <Button variant="default">
                <Bot className="mr-2 h-4 w-4" /> {lang.assistedCreationButton}
              </Button>
            </Link>
            <Button onClick={openCreateDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> {lang.newAdventureButton}
            </Button>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">{lang.mySavedStories}</h2>
        <ScrollArea className="h-[calc(50vh-120px)] lg:h-[calc(100vh-400px)]">
          {savedStories.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedStories.map((story) => (
                <Card key={story.id}>
                  <CardHeader>
                    <CardTitle>{getLocalizedText(story.adventureState.adventureSettings.world, currentLanguage) || story.title}</CardTitle>
                    <CardDescription>{lang.savedOnDate} {story.date}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{getLocalizedText(story.adventureState.adventureSettings.initialSituation, currentLanguage) || story.description}</p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleLaunchStory(story.id)}>
                      <Play className="mr-2 h-4 w-4" /> {lang.launchButton}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(story)}>
                        <Edit className="mr-2 h-4 w-4" /> {lang.editButton}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => setStoryToDelete(story)}>
                          <Trash2 className="mr-2 h-4 w-4" /> {lang.deleteButton}
                        </Button>
                      </AlertDialogTrigger>
                      {storyToDelete?.id === story.id && (
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center">
                              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                              {lang.confirmDeletion}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {lang.deleteStoryConfirmation.replace('{storyTitle}', storyToDelete.title)}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setStoryToDelete(null)}>{lang.cancelButton}</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDeleteStory}>
                              {lang.deletePermanentlyButton}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      )}
                    </AlertDialog>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadStory(story)}>
                        <Download className="mr-2 h-4 w-4"/> {lang.downloadButton}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-10">
              {lang.noSavedStories}
            </p>
          )}
        </ScrollArea>
      </section>

      <section>
        <div className="flex items-center gap-4 mb-4">
            <h2 className="text-2xl font-semibold">{lang.chatWithCharacterTitle}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsersIcon className="h-4 w-4" />
                <span>{lang.globalCharactersCountTooltip.replace('{count}', String(savedCharacters.length))}</span>
            </div>
        </div>
        <ScrollArea className="h-[calc(50vh-120px)] lg:h-[calc(100vh-400px)]">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-10">{lang.loadingCharacters}</p>
          ) : savedCharacters.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedCharacters.map((character) => (
                <Card key={character.id}>
                  <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-12 w-12">
                      {character.portraitUrl ? (
                        <AvatarImage src={character.portraitUrl} alt={character.name} data-ai-hint={`${character.name} portrait`} />
                      ) : (
                        <AvatarFallback>{character.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle>{character.name}</CardTitle>
                      <CardDescription className="line-clamp-1">{character.details || lang.noDescription}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {lang.affinityVsPlayer}: {character.affinity ?? 'N/A'}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Link href={`/chat/${character.id}`}>
                      <Button variant="default" size="sm">
                        <MessageSquare className="mr-2 h-4 w-4" /> {lang.chatButton}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-10">
              {lang.noGlobalCharactersForChat}
            </p>
          )}
        </ScrollArea>
      </section>

       <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="max-w-[80vw] lg:max-w-3xl h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{lang.createNewAdventureTitle}</DialogTitle>
                    <DialogDescription>
                        {lang.createNewAdventureDesc}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                  {createForm}
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{lang.cancelButton}</Button>
                    <Button onClick={handleCreateNewStory} disabled={!isCreateFormValid}>{lang.createAndLaunchButton}</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={!!editingStory} onOpenChange={(open) => { if(!open) setEditingStory(null) }}>
            <DialogContent className="max-w-[80vw] lg:max-w-3xl h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{lang.editStoryTitle}: {getLocalizedText(editingStory?.adventureState.adventureSettings.world, currentLanguage) || editingStory?.title}</DialogTitle>
                    <DialogDescription>
                        {lang.editStoryDesc}
                    </DialogDescription>
                </DialogHeader>
                 <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    {editForm}
                 </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingStory(null)}>{lang.cancelButton}</Button>
                    <Button onClick={handleSaveChanges}>{lang.saveChangesButton}</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={!!assigningSlotsForStory} onOpenChange={() => setAssigningSlotsForStory(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{lang.assignCharactersTitle}</DialogTitle>
                    <DialogDescription>
                        {lang.assignCharactersDesc}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {(assigningSlotsForStory?.adventureState.characters || []).filter(c => c.isPlaceholder).map(slot => (
                        <div key={slot.id} className="space-y-2">
                             <Label>{lang.suggestedRole}: <span className="font-semibold">{slot.name}</span></Label>
                            <Select onValueChange={(charId) => setSlotAssignments(prev => ({...prev, [slot.id!]: charId}))}>
                                <SelectTrigger>
                                    <SelectValue placeholder={lang.chooseCharacterPlaceholder} />
                                </SelectTrigger>
                                <SelectContent>
                                    {savedCharacters.length > 0 ? (
                                        savedCharacters.map(char => (
                                            <SelectItem key={char.id} value={char.id}>{char.name}</SelectItem>
                                        ))
                                     ) : (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                            {lang.noSavedCharacters}
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setAssigningSlotsForStory(null)}>{lang.cancelButton}</Button>
                    <Button onClick={handleConfirmSlotAssignmentsAndLaunch}>{lang.launchAdventureButton}</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}




    

    