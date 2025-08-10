
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Play, PlusCircle, MessageSquare, AlertTriangle, Download, Edit } from 'lucide-react';
import Link from 'next/link';
import type { Character } from '@/types';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface SavedStory {
  id: string;
  title: string;
  date: string;
  description: string;
}

export default function HistoiresPage() {
  const { toast } = useToast();
  
  const initialStories: SavedStory[] = [
    { id: 'story1', title: 'Aventure à Hight School of Future', date: '2024-05-01', description: 'Le début de l\'intrigue avec Rina et Kentaro...' },
    { id: 'story2', title: 'Exploration de la Forêt Interdite', date: '2024-04-25', description: 'Une quête parallèle dans un monde fantastique...' },
  ];

  const [savedStories, setSavedStories] = React.useState<SavedStory[]>(initialStories);
  const [savedCharacters, setSavedCharacters] = React.useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = React.useState(true);
  const [storyToDelete, setStoryToDelete] = React.useState<SavedStory | null>(null);
  const [editingStory, setEditingStory] = React.useState<SavedStory | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const charactersFromStorage = localStorage.getItem('globalCharacters');
      if (charactersFromStorage) {
        setSavedCharacters(JSON.parse(charactersFromStorage));
      }
    } catch (error) {
      console.error("Failed to load characters from localStorage:", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les personnages sauvegardés.",
        variant: "destructive",
      });
    }
    setIsLoadingCharacters(false);
  }, [toast]);

  const handleContinueStory = (storyId: string) => {
    toast({
      title: "Fonctionnalité en cours",
      description: `Continuer l'histoire "${savedStories.find(s => s.id === storyId)?.title}" n'est pas encore implémenté.`,
    });
  };

  const confirmDeleteStory = () => {
    if (storyToDelete) {
      setSavedStories(prevStories => prevStories.filter(story => story.id !== storyToDelete.id));
      toast({
        title: "Histoire Supprimée",
        description: `L'histoire "${storyToDelete.title}" a été supprimée. (Actualisez pour réinitialiser)`,
      });
      setStoryToDelete(null);
    }
  };

  const handleDownloadStory = (story: SavedStory) => {
    const jsonString = JSON.stringify(story, null, 2);
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
  
  const handleUpdateStory = () => {
      if (!editingStory) return;
      const updatedStories = savedStories.map(s => s.id === editingStory.id ? editingStory : s);
      setSavedStories(updatedStories);
      toast({ title: "Histoire Mise à Jour", description: "Les informations de l'histoire ont été sauvegardées." });
      setEditingStory(null);
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Histoires & Personnages</h1>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Upload className="mr-2 h-4 w-4" /> Importer
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Aventure
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[80vw] lg:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Créer une Nouvelle Aventure</DialogTitle>
                    <DialogDescription>
                        Configurez tous les aspects de votre nouvelle histoire.
                    </DialogDescription>
                </DialogHeader>
                {/* Future: Add AdventureForm for creation here */}
                <p className="py-8 text-center text-muted-foreground">Le formulaire de création d'aventure sera bientôt disponible ici.</p>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Annuler</Button>
                    <Button disabled>Créer l'Histoire</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
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
                     <Dialog open={editingStory?.id === story.id} onOpenChange={(open) => !open && setEditingStory(null)}>
                        <DialogTrigger asChild>
                           <Button variant="ghost" size="sm" onClick={() => setEditingStory(story)}>
                                <Edit className="mr-2 h-4 w-4" /> Modifier
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[80vw] lg:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Modifier l'Histoire</DialogTitle>
                                <DialogDescription>
                                    Ajustez les détails de votre aventure.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 max-h-[60vh] overflow-y-auto">
                            {editingStory?.id === story.id && (
                                <div className="space-y-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="edit-story-title">Titre</Label>
                                        <Input id="edit-story-title" value={editingStory.title} onChange={e => setEditingStory({...editingStory!, title: e.target.value})} />
                                     </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="edit-story-desc">Description</Label>
                                        <Textarea id="edit-story-desc" value={editingStory.description} onChange={e => setEditingStory({...editingStory!, description: e.target.value})} rows={4}/>
                                     </div>
                                      <p className="text-center text-muted-foreground py-4">Le formulaire complet d'édition d'aventure sera ici.</p>
                                </div>
                            )}
                            </div>
                           <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingStory(null)}>Annuler</Button>
                              <Button onClick={handleUpdateStory}>Enregistrer</Button>
                           </DialogFooter>
                        </DialogContent>
                    </Dialog>
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
                              Êtes-vous sûr de vouloir supprimer l'histoire "{storyToDelete.title}" ? Cette action est irréversible (pour cette session).
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
          {isLoadingCharacters ? (
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
    </div>
  );
}
