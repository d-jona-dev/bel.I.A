
"use client"; // Required for useState, useEffect, and event handlers

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Edit, UserPlus, CheckCircle, UploadCloud } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Import useToast
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

export default function AvatarsPage() {
  const { toast } = useToast();
  const [avatars, setAvatars] = React.useState<PlayerAvatar[]>([]);
  const [currentAvatarId, setCurrentAvatarId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [avatarToDelete, setAvatarToDelete] = React.useState<PlayerAvatar | null>(null);

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
    if(event.target) event.target.value = ''; // Reset file input to allow re-uploading the same file
  };
  
  const handleSelectAvatar = (avatarId: string) => {
    setCurrentAvatarId(avatarId);
    localStorage.setItem(CURRENT_AVATAR_ID_KEY, JSON.stringify(avatarId));
    toast({title: "Avatar Sélectionné", description: `Vous jouerez maintenant en tant que ${avatars.find(a => a.id === avatarId)?.name}.`});
  }

  const confirmDelete = () => {
    if (avatarToDelete) {
      const updatedAvatars = avatars.filter(a => a.id !== avatarToDelete.id);
      saveAvatars(updatedAvatars);
      if(currentAvatarId === avatarToDelete.id) {
        const newCurrent = updatedAvatars.length > 0 ? updatedAvatars[0].id : null;
        setCurrentAvatarId(newCurrent);
        localStorage.setItem(CURRENT_AVATAR_ID_KEY, JSON.stringify(newCurrent));
      }
      toast({ title: "Avatar Supprimé", description: `L'avatar "${avatarToDelete.name}" a été supprimé.` });
      setAvatarToDelete(null);
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
          <Button disabled>
            <UserPlus className="mr-2 h-4 w-4" /> Créer un Avatar
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">
        Sélectionnez l'avatar que vous souhaitez incarner dans vos aventures.
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
                   {avatar.id === currentAvatarId && <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{avatar.details}</p>
                  <input
                        type="file"
                        accept="image/*"
                        id={`upload-avatar-portrait-${avatar.id}`}
                        className="hidden"
                        onChange={(e) => handleUploadAvatarPortrait(avatar.id, e)}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => document.getElementById(`upload-avatar-portrait-${avatar.id}`)?.click()}
                    >
                        <UploadCloud className="mr-2 h-4 w-4" /> Télécharger Portrait
                    </Button>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" disabled>
                    <Edit className="mr-2 h-4 w-4" /> Modifier
                  </Button>
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
                   {avatar.id !== currentAvatarId && (
                    <Button variant="outline" size="sm" onClick={() => handleSelectAvatar(avatar.id)}>
                        Sélectionner
                    </Button>
                   )}
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
