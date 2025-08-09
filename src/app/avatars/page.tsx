
"use client"; // Required for useState, useEffect, and event handlers

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Edit, UserPlus, CheckCircle, UploadCloud, Wand2, Save, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { generateSceneImage } from '@/ai/flows/generate-scene-image';


// Define a type for your avatar data
interface PlayerAvatar {
  id: string;
  name: string;
  details: string;
  portraitUrl: string | null;
  class: string;
  level: number;
}

const AVATARS_STORAGE_KEY = 'playerAvatars';
const CURRENT_AVATAR_ID_KEY = 'currentAvatarId';
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;


export default function AvatarsPage() {
  const { toast } = useToast();
  const [avatars, setAvatars] = React.useState<PlayerAvatar[]>([]);
  const [currentAvatarId, setCurrentAvatarId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // State for modals
  const [avatarToDelete, setAvatarToDelete] = React.useState<PlayerAvatar | null>(null);
  const [editingAvatar, setEditingAvatar] = React.useState<PlayerAvatar | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [newAvatarData, setNewAvatarData] = React.useState({ name: '', details: '', class: 'Aventurier', level: 1 });
  const [isGeneratingPortrait, setIsGeneratingPortrait] = React.useState(false);


  React.useEffect(() => {
    try {
      const savedAvatars = localStorage.getItem(AVATARS_STORAGE_KEY);
      const savedCurrentId = localStorage.getItem(CURRENT_AVATAR_ID_KEY);
      if (savedAvatars) {
        setAvatars(JSON.parse(savedAvatars));
      } else {
        // Set default avatars if none are saved
        const defaultAvatars = [
          { id: 'avatar1', name: 'Alexandre le Brave', details: 'Guerrier expérimenté, loyal et juste.', portraitUrl: null, class: 'Guerrier', level: 5 },
          { id: 'avatar2', name: 'Elara l\'Érudite', details: 'Mage curieuse, spécialisée dans les arcanes.', portraitUrl: null, class: 'Mage', level: 3 },
        ];
        setAvatars(defaultAvatars);
        localStorage.setItem(AVATARS_STORAGE_KEY, JSON.stringify(defaultAvatars));
      }
      if (savedCurrentId) {
        setCurrentAvatarId(JSON.parse(savedCurrentId));
      } else if (avatars.length > 0) {
        setCurrentAvatarId(avatars[0].id);
      }
    } catch (error) {
      console.error("Failed to load avatars from localStorage:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger les avatars.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  const saveAvatars = (updatedAvatars: PlayerAvatar[]) => {
    setAvatars(updatedAvatars);
    localStorage.setItem(AVATARS_STORAGE_KEY, JSON.stringify(updatedAvatars));
  };

  const handleUploadAvatarPortrait = (avatarId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedAvatars = avatars.map(avatar =>
        avatar.id === avatarId ? { ...avatar, portraitUrl: reader.result as string } : avatar
      );
      saveAvatars(updatedAvatars);
      toast({ title: "Portrait Téléchargé", description: "Le portrait de l'avatar a été mis à jour." });
    };
    reader.readAsDataURL(file);
    if(event.target) event.target.value = '';
  };
  
  const handleSelectCurrentAvatar = (avatarId: string) => {
    setCurrentAvatarId(avatarId);
    localStorage.setItem(CURRENT_AVATAR_ID_KEY, JSON.stringify(avatarId));
    toast({title: "Avatar Actif Changé", description: `L'avatar "${avatars.find(a => a.id === avatarId)?.name}" est maintenant l'avatar par défaut.`});
  }

  const confirmDelete = () => {
    if (avatarToDelete) {
      const updatedAvatars = avatars.filter(a => a.id !== avatarToDelete.id);
      saveAvatars(updatedAvatars);
      if(currentAvatarId === avatarToDelete.id) {
        const newCurrent = updatedAvatars.length > 0 ? updatedAvatars[0].id : null;
        setCurrentAvatarId(newCurrent);
        if (newCurrent) {
           localStorage.setItem(CURRENT_AVATAR_ID_KEY, JSON.stringify(newCurrent));
        } else {
           localStorage.removeItem(CURRENT_AVATAR_ID_KEY);
        }
      }
      toast({ title: "Avatar Supprimé", description: `L'avatar "${avatarToDelete.name}" a été supprimé.` });
      setAvatarToDelete(null);
    }
  };
  
  const handleCreateAvatar = () => {
    if (!newAvatarData.name.trim() || !newAvatarData.details.trim() || !newAvatarData.class.trim()) {
        toast({ title: "Champs requis manquants", variant: "destructive" });
        return;
    }
    const newAvatar: PlayerAvatar = {
        id: uid(),
        portraitUrl: null,
        name: newAvatarData.name,
        details: newAvatarData.details,
        class: newAvatarData.class,
        level: newAvatarData.level,
    };
    const updatedAvatars = [...avatars, newAvatar];
    saveAvatars(updatedAvatars);
    if (!currentAvatarId) {
        handleSelectCurrentAvatar(newAvatar.id);
    }
    toast({ title: "Avatar Créé!", description: `Bienvenue à ${newAvatar.name}.` });
    setIsCreateModalOpen(false);
    setNewAvatarData({ name: '', details: '', class: 'Aventurier', level: 1 });
  };

  const handleUpdateAvatar = () => {
      if (!editingAvatar) return;
      const updatedAvatars = avatars.map(a => a.id === editingAvatar.id ? editingAvatar : a);
      saveAvatars(updatedAvatars);
      toast({ title: "Avatar Mis à Jour", description: `Les informations de "${editingAvatar.name}" ont été sauvegardées.` });
      setEditingAvatar(null);
  };
  
  const handleGeneratePortraitForEditor = async () => {
      if (!editingAvatar) return;
      setIsGeneratingPortrait(true);
      const prompt = `Generate a portrait of a hero named ${editingAvatar.name}. Description: ${editingAvatar.details}. Class: ${editingAvatar.class}.`;
      try {
          const result = await generateSceneImage({ sceneDescription: prompt });
          if (result.imageUrl) {
              setEditingAvatar(prev => prev ? { ...prev, portraitUrl: result.imageUrl } : null);
              toast({ title: "Portrait Généré!", description: "Le nouveau portrait est affiché." });
          } else {
              throw new Error(result.error || "La génération d'image a échoué.");
          }
      } catch (error) {
           toast({ title: "Erreur de Génération", description: `Impossible de générer le portrait : ${error instanceof Error ? error.message : 'Erreur inconnue'}.`, variant: "destructive" });
      } finally {
          setIsGeneratingPortrait(false);
      }
  };


  if (isLoading) {
    return <div className="text-center p-10">Chargement des avatars...</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Avatars Joueur</h1>
        <div className="flex gap-2">
           <Button variant="outline" disabled>
            <Upload className="mr-2 h-4 w-4" /> Importer un Avatar
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" /> Créer un Avatar
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Créer un nouvel Avatar</DialogTitle>
                </DialogHeader>
                 <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-avatar-name">Nom</Label>
                        <Input id="new-avatar-name" value={newAvatarData.name} onChange={e => setNewAvatarData({...newAvatarData, name: e.target.value})} placeholder="Nom de votre héros"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-avatar-details">Détails (Description)</Label>
                        <Textarea id="new-avatar-details" value={newAvatarData.details} onChange={e => setNewAvatarData({...newAvatarData, details: e.target.value})} placeholder="Décrivez votre personnage..."/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-avatar-class">Classe</Label>
                            <Input id="new-avatar-class" value={newAvatarData.class} onChange={e => setNewAvatarData({...newAvatarData, class: e.target.value})} placeholder="Ex: Guerrier, Mage..."/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-avatar-level">Niveau</Label>
                            <Input id="new-avatar-level" type="number" value={newAvatarData.level} onChange={e => setNewAvatarData({...newAvatarData, level: Number(e.target.value) || 1})} />
                        </div>
                    </div>
                 </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Annuler</Button>
                    <Button onClick={handleCreateAvatar}>Créer l'Avatar</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">
        Gérez vos profils de joueur. L'avatar avec la coche verte est celui qui sera utilisé par défaut dans les nouvelles aventures.
      </p>

      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {avatars.length > 0 ? (
            avatars.map((avatar) => (
              <Card key={avatar.id} className={avatar.id === currentAvatarId ? 'border-primary' : ''}>
                <CardHeader className="flex flex-row items-start gap-4">
                   <Avatar className="h-20 w-20">
                      {avatar.portraitUrl ? (
                        <AvatarImage src={avatar.portraitUrl} alt={avatar.name} data-ai-hint={`${avatar.class} portrait`} />
                      ) : (
                        <AvatarFallback>{avatar.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                   <div className="flex-1">
                    <CardTitle>{avatar.name}</CardTitle>
                     <CardDescription>
                       {avatar.class} - Niveau {avatar.level}
                     </CardDescription>
                  </div>
                   {avatar.id === currentAvatarId && (
                     <TooltipProvider>
                       <Tooltip>
                         <TooltipTrigger>
                           <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                         </TooltipTrigger>
                         <TooltipContent>Avatar Actif</TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                   )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{avatar.details}</p>
                </CardContent>
                <CardFooter className="flex flex-wrap justify-end gap-2">
                    <Dialog open={editingAvatar?.id === avatar.id} onOpenChange={(open) => !open && setEditingAvatar(null)}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setEditingAvatar(JSON.parse(JSON.stringify(avatar)))}>
                                <Edit className="mr-2 h-4 w-4" /> Modifier
                            </Button>
                        </DialogTrigger>
                        {editingAvatar?.id === avatar.id && (
                           <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Modifier {editingAvatar.name}</DialogTitle>
                                </DialogHeader>
                                <div className="max-h-[70vh] overflow-y-auto p-1 space-y-4">
                                     <div className="flex items-center gap-4">
                                        <Avatar className="h-24 w-24">
                                            {isGeneratingPortrait ? <div className="flex items-center justify-center h-full w-full"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div> :
                                            editingAvatar.portraitUrl ? <AvatarImage src={editingAvatar.portraitUrl} /> : <AvatarFallback className="text-3xl">{editingAvatar.name.substring(0,2)}</AvatarFallback>}
                                        </Avatar>
                                        <div className="flex-1 space-y-2">
                                            <Button onClick={handleGeneratePortraitForEditor} disabled={isGeneratingPortrait} className="w-full">
                                                <Wand2 className="mr-2 h-4 w-4" /> Générer un Portrait IA
                                            </Button>
                                             <input type="file" accept="image/*" id={`upload-edit-portrait-${avatar.id}`} className="hidden" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setEditingAvatar(p => p ? {...p, portraitUrl: reader.result as string} : null);
                                                    reader.readAsDataURL(file);
                                                }
                                             }}/>
                                             <Button variant="outline" className="w-full" onClick={() => document.getElementById(`upload-edit-portrait-${avatar.id}`)?.click()}>
                                                <UploadCloud className="mr-2 h-4 w-4"/> Télécharger
                                             </Button>
                                        </div>
                                     </div>
                                     <div className="space-y-2">
                                        <Label>Nom</Label>
                                        <Input value={editingAvatar.name} onChange={e => setEditingAvatar({...editingAvatar!, name: e.target.value})} />
                                     </div>
                                     <div className="space-y-2">
                                        <Label>Détails</Label>
                                        <Textarea value={editingAvatar.details} onChange={e => setEditingAvatar({...editingAvatar!, details: e.target.value})} rows={3}/>
                                     </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Classe</Label>
                                            <Input value={editingAvatar.class} onChange={e => setEditingAvatar({...editingAvatar!, class: e.target.value})} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Niveau</Label>
                                            <Input type="number" value={editingAvatar.level} onChange={e => setEditingAvatar({...editingAvatar!, level: Number(e.target.value) || 1})} />
                                        </div>
                                     </div>
                                </div>
                               <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingAvatar(null)}>Annuler</Button>
                                  <Button onClick={handleUpdateAvatar}><Save className="mr-2 h-4 w-4"/> Enregistrer</Button>
                               </DialogFooter>
                           </DialogContent>
                        )}
                    </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" onClick={() => setAvatarToDelete(avatar)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    {avatarToDelete?.id === avatar.id && (
                       <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la Suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer l'avatar "{avatarToDelete.name}" ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setAvatarToDelete(null)}>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                    )}
                  </AlertDialog>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={avatar.id === currentAvatarId}
                    onClick={() => handleSelectCurrentAvatar(avatar.id)}
                  >
                    Définir par défaut
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-10">
              Aucun avatar sauvegardé. Créez votre premier personnage !
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

    