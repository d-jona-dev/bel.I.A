
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Play, PlusCircle, MessageSquare, AlertTriangle, Download, Edit } from 'lucide-react';
import Link from 'next/link';
import type { Character, AdventureSettings, SaveData } from '@/types';
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
import { AdventureForm, type AdventureFormValues } from '@/components/adventure-form';


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
  const [newStoryFormValues, setNewStoryFormValues] = React.useState<AdventureFormValues>(getAdventureFormValues(null));
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [formPropKey, setFormPropKey] = React.useState(0);
  const importFileRef = React.useRef<HTMLInputElement>(null);


  React.useEffect(() => {
    try {
      const storiesFromStorage = localStorage.getItem('adventureStories');
      if (storiesFromStorage) {
        setSavedStories(JSON.parse(storiesFromStorage));
      }
      const charactersFromStorage = localStorage.getItem('globalCharacters');
      if (charactersFromStorage) {
        setSavedCharacters(JSON.parse(charactersFromStorage));
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
  }, [toast]);

  const saveStories = (stories: SavedStory[]) => {
    setSavedStories(stories);
    localStorage.setItem('adventureStories', JSON.stringify(stories));
  }
  
  const handleContinueStory = (storyId: string) => {
    const storyToLoad = savedStories.find(s => s.id === storyId);
    if (storyToLoad) {
        localStorage.setItem('currentAdventureState', JSON.stringify(storyToLoad.adventureState));
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
  
  const handleSaveChanges = (updatedFormValues: AdventureFormValues) => {
      if (editingStory) {
          const updatedState: SaveData = {
              ...editingStory.adventureState,
              adventureSettings: {
                  ...editingStory.adventureState.adventureSettings,
                  ...updatedFormValues
              },
              characters: updatedFormValues.characters.map(c => ({
                  ...c, 
                  id: c.id || uid(),
              } as Character))
          };

          const updatedStory: SavedStory = {
              ...editingStory,
              title: updatedFormValues.world.substring(0, 30),
              description: updatedFormValues.initialSituation.substring(0, 100),
              adventureState: updatedState,
              date: new Date().toISOString().split('T')[0],
          };

          const updatedStories = savedStories.map(s => s.id === updatedStory.id ? updatedStory : s);
          saveStories(updatedStories);
          toast({ title: "Histoire Mise à Jour", description: "Les modifications ont été sauvegardées." });
          setEditingStory(null);
      }
  };
  
  const handleCreateNewStory = () => {
      const newId = uid();
      const newAdventureState = createNewAdventureState();
      
      newAdventureState.adventureSettings.world = newStoryFormValues.world;
      newAdventureState.adventureSettings.initialSituation = newStoryFormValues.initialSituation;
      newAdventureState.adventureSettings.playerName = newStoryFormValues.playerName;
      newAdventureState.adventureSettings.rpgMode = newStoryFormValues.enableRpgMode;
      newAdventureState.adventureSettings.relationsMode = newStoryFormValues.enableRelationsMode;
      newAdventureState.adventureSettings.strategyMode = newStoryFormValues.enableStrategyMode;
      newAdventureState.characters = (newStoryFormValues.characters || []).map(c => ({
          ...c, id: c.id || uid(),
      } as Character));

      const newStory: SavedStory = {
          id: newId,
          title: newStoryFormValues.world?.substring(0, 40) || "Nouvelle Histoire",
          description: newStoryFormValues.initialSituation?.substring(0, 100) || "...",
          date: new Date().toISOString().split('T')[0],
          adventureState: newAdventureState,
      };
      saveStories([...savedStories, newStory]);
      toast({ title: "Nouvelle Aventure Créée!", description: "Elle a été ajoutée à votre liste." });
      setIsCreateModalOpen(false);
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

  function getAdventureFormValues(story: SavedStory | null): AdventureFormValues {
      if (!story) {
          const defaultState = createNewAdventureState();
          return {
              world: '',
              initialSituation: '',
              characters: [],
              enableRpgMode: true,
              enableRelationsMode: true,
              enableStrategyMode: true,
              playerName: 'Héros',
              playerClass: 'Aventurier',
          };
      }
      
      const settings = story.adventureState.adventureSettings;
      return {
          world: settings.world,
          initialSituation: settings.initialSituation,
          characters: story.adventureState.characters.map(c => ({ id: c.id, name: c.name, details: c.details })),
          enableRpgMode: settings.rpgMode,
          enableRelationsMode: settings.relationsMode,
          enableStrategyMode: settings.strategyMode,
          playerName: settings.playerName,
          playerClass: settings.playerClass,
      }
  }

  const openEditDialog = (story: SavedStory) => {
    setFormPropKey(prev => prev + 1); 
    setEditingStory(story);
  }
  
  const openCreateDialog = () => {
    setFormPropKey(prev => prev + 1); 
    setNewStoryFormValues(getAdventureFormValues(null));
    setIsCreateModalOpen(true);
  }


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Histoires & Personnages</h1>
        <div className="flex gap-2">
            <input type="file" ref={importFileRef} onChange={handleImportStory} accept=".json" className="hidden" />
            <Button variant="outline" onClick={() => importFileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Importer
            </Button>
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
                    <Button variant="outline" size="sm" onClick={() => handleContinueStory(story.id)}>
                      <Play className="mr-2 h-4 w-4" /> Continuer
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
                  <AdventureForm
                      formPropKey={formPropKey}
                      initialValues={newStoryFormValues}
                      onSettingsChange={setNewStoryFormValues}
                  />
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Annuler</Button>
                    <Button onClick={handleCreateNewStory}>Créer l'Histoire</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={!!editingStory} onOpenChange={(open) => !open && setEditingStory(null)}>
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
                           formPropKey={formPropKey}
                           initialValues={getAdventureFormValues(editingStory)}
                           onSettingsChange={handleSaveChanges}
                        />
                    )}
                 </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingStory(null)}>Annuler</Button>
                    <Button onClick={() => { /* The form's onSettingsChange will handle it */ }}>Enregistrer les Modifications</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
