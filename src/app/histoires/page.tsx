
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Play, PlusCircle, MessageSquare, AlertTriangle, Download, Edit, Brush, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import type { Character, AdventureSettings, SaveData, MapPointOfInterest, PlayerAvatar, TimeManagementSettings, AiConfig } from '@/types';
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
        world: "",
        initialSituation: "",
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
        playerFaceSwapEnabled: false,
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

  const [aiConfig, setAiConfig] = React.useState<AiConfig>({
      llm: { source: 'gemini' },
      image: { source: 'gemini' }
  });
  const [isAiConfigOpen, setIsAiConfigOpen] = React.useState(false);

  const loadData = React.useCallback(() => {
    try {
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
        title: "Erreur de chargement",
        description: "Impossible de charger les données sauvegardées.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  },[toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleAiConfigChange = (newConfig: AiConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('globalAiConfig', JSON.stringify(newConfig));
    toast({ title: "Configuration IA mise à jour."});
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
    if (storyToLoad) {
        // Save the specific story state to be loaded by the main page
        localStorage.setItem('currentAdventureState', JSON.stringify(storyToLoad.adventureState));
        // Use a flag to indicate that a story should be loaded
        localStorage.setItem('loadStoryOnMount', 'true');
        window.location.href = '/';
    } else {
        toast({
          title: "Erreur",
          description: `Impossible de charger l'histoire.`,
          variant: 'destructive'
        });
    }
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

  const handleDownloadStory = (story: SavedStory) => {
    const jsonString = JSON.stringify(story.adventureState, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title.toLowerCase().replace(/\s/g, '_')}_story.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              title: formValues.world?.substring(0, 30) || editingStory.title,
              description: formValues.initialSituation?.substring(0, 100) || editingStory.description,
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
    const newAdventureState = createNewAdventureState();

    newAdventureState.adventureSettings = {
        ...newAdventureState.adventureSettings,
        ...formValues,
        world: formValues.world || "",
        initialSituation: formValues.initialSituation || "",
        playerName: formValues.playerName || "Héros",
        rpgMode: formValues.rpgMode ?? true,
        relationsMode: formValues.relationsMode ?? true,
        strategyMode: formValues.strategyMode ?? true,
        comicModeActive: formValues.comicModeActive ?? false,
        mapPointsOfInterest: (formValues.mapPointsOfInterest as MapPointOfInterest[] || []).map(poi => ({ ...poi, id: poi.id ?? uid() })),
    };

    newAdventureState.characters = (formValues.characters || []).filter(c => c.name && c.details).map(c => ({
        ...c,
        id: c.id || uid(),
    } as Character));

    const newStory: SavedStory = {
        id: newId,
        title: formValues.world?.substring(0, 40) || "Nouvelle Histoire",
        description: formValues.initialSituation?.substring(0, 100) || "...",
        date: new Date().toISOString().split('T')[0],
        adventureState: newAdventureState,
    };

    saveStories([...savedStories, newStory]);
    toast({ title: "Nouvelle Aventure Créée!", description: "Lancement de l'histoire..." });
    setIsCreateModalOpen(false);

    // Launch the newly created story
    localStorage.setItem('currentAdventureState', JSON.stringify(newAdventureState));
    localStorage.setItem('loadStoryOnMount', 'true');
    window.location.href = '/';
  }

  
  const handleImportStory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonString = e.target?.result as string;
            const importedState = JSON.parse(jsonString) as SaveData;
            
            if (!importedState.adventureSettings || !importedState.characters || !importedState.narrative) {
                throw new Error("Fichier de sauvegarde invalide.");
            }

            const newId = uid();
            const newStory: SavedStory = {
                id: newId,
                title: importedState.adventureSettings.world.substring(0, 40) || "Histoire Importée",
                description: importedState.adventureSettings.initialSituation.substring(0, 100) || "...",
                date: new Date().toISOString().split('T')[0],
                adventureState: importedState,
            };

            saveStories([...savedStories, newStory]);
            toast({ title: "Histoire Importée", description: "L'aventure a été ajoutée à votre liste." });

        } catch (error) {
            console.error("Error importing story:", error);
            toast({ title: "Erreur d'Importation", description: `Impossible de lire le fichier JSON: ${error instanceof Error ? error.message : 'Format invalide'}.`, variant: "destructive" });
        }
    };
    reader.readAsText(file);
    if(event.target) event.target.value = ''; // Reset for next upload
  }

  const getAdventureFormValues = (story: SavedStory | null): AdventureFormValues => {
      if (!story) {
          const defaultState = createNewAdventureState();
          return {
              world: '',
              initialSituation: '',
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
              portraitUrl: c.portraitUrl || null,
              faceSwapEnabled: c.faceSwapEnabled,
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
          playerFaceSwapEnabled: settings.playerFaceSwapEnabled,
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
      key={`create-${isCreateModalOpen}`} // Re-mount when modal opens to ensure clean state
      ref={createFormRef}
      initialValues={getAdventureFormValues(null)}
      rpgMode={true} 
      relationsMode={true}
      strategyMode={true}
      aiConfig={aiConfig}
      onFormValidityChange={setIsCreateFormValid}
    />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [isCreateModalOpen]);


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Histoires & Personnages</h1>
        <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Brush className="mr-2 h-4 w-4"/> Nettoyer</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Nettoyer toutes les données locales ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Elle supprimera toutes les histoires, personnages et bandes dessinées sauvegardés dans ce navigateur. Êtes-vous sûr de vouloir continuer ?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearLocalStorage}>Oui, tout nettoyer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <input type="file" ref={importFileRef} onChange={handleImportStory} accept=".json" className="hidden" />
            <Button variant="outline" onClick={() => importFileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Importer
            </Button>
            <Dialog open={isAiConfigOpen} onOpenChange={setIsAiConfigOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline"><BrainCircuit className="mr-2 h-4 w-4" /> Config IA</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configuration Globale de l'IA</DialogTitle>
                        <DialogDescription>
                            Configurez les modèles d'IA utilisés pour les outils d'assistance à la création sur cette page.
                        </DialogDescription>
                    </DialogHeader>
                    <ModelManager config={aiConfig} onConfigChange={handleAiConfigChange} />
                </DialogContent>
            </Dialog>
            <Button onClick={openCreateDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Aventure
            </Button>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Mes Histoires Sauvegardées</h2>
        <ScrollArea className="h-[calc(50vh-120px)] lg:h-[calc(100vh-400px)]">
          {savedStories.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedStories.map((story) => (
                <Card key={story.id}>
                  <CardHeader>
                    <CardTitle>{story.title}</CardTitle>
                    <CardDescription>Sauvegardée le {story.date}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{story.description}</p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleLaunchStory(story.id)}>
                      <Play className="mr-2 h-4 w-4" /> Lancer
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(story)}>
                        <Edit className="mr-2 h-4 w-4" /> Modifier
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => setStoryToDelete(story)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      {storyToDelete?.id === story.id && (
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center">
                              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                              Confirmer la Suppression
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer l'histoire "{storyToDelete.title}" ? Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setStoryToDelete(null)}>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDeleteStory}>
                              Supprimer Définitivement
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      )}
                    </AlertDialog>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadStory(story)}>
                        <Download className="mr-2 h-4 w-4"/> Télécharger
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-10">
              Aucune histoire sauvegardée pour le moment. Commencez une nouvelle aventure !
            </p>
          )}
        </ScrollArea>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Chatter avec un Personnage</h2>
        <ScrollArea className="h-[calc(50vh-120px)] lg:h-[calc(100vh-400px)]">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-10">Chargement des personnages...</p>
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
                      <CardDescription className="line-clamp-1">{character.details || "Aucune description."}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      Affinité (vs Joueur): {character.affinity ?? 'N/A'}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Link href={`/chat/${character.id}`}>
                      <Button variant="default" size="sm">
                        <MessageSquare className="mr-2 h-4 w-4" /> Chatter
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-10">
              Aucun personnage sauvegardé globalement. Sauvegardez des personnages depuis vos aventures pour chatter avec eux.
            </p>
          )}
        </ScrollArea>
      </section>

       <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="max-w-[80vw] lg:max-w-3xl h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Créer une Nouvelle Aventure</DialogTitle>
                    <DialogDescription>
                        Configurez tous les aspects de votre nouvelle histoire.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                  {createForm}
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Annuler</Button>
                    <Button onClick={handleCreateNewStory} disabled={!isCreateFormValid}>Créer et Lancer</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={!!editingStory} onOpenChange={(open) => { if(!open) setEditingStory(null) }}>
            <DialogContent className="max-w-[80vw] lg:max-w-3xl h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Modifier l'Histoire : {editingStory?.title}</DialogTitle>
                    <DialogDescription>
                        Ajustez les détails de votre aventure.
                    </DialogDescription>
                </DialogHeader>
                 <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    {editingStory && (
                        <AdventureForm
                           key={`edit-${editingStory.id}`}
                           ref={editFormRef}
                           initialValues={getAdventureFormValues(editingStory)}
                           rpgMode={editingStory.adventureState.adventureSettings.rpgMode}
                           relationsMode={editingStory.adventureState.adventureSettings.relationsMode}
                           strategyMode={editingStory.adventureState.adventureSettings.strategyMode}
                           aiConfig={aiConfig}
                        />
                    )}
                 </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingStory(null)}>Annuler</Button>
                    <Button onClick={handleSaveChanges}>Enregistrer les Modifications</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

    

    
