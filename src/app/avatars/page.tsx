
"use client"; // Required for useState, useEffect, and event handlers

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Edit, UserPlus, CheckCircle, UploadCloud } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Import useToast

// Define a type for your avatar data
interface PlayerAvatar {
  id: string;
  name: string;
  details: string;
  portraitUrl: string | null;
  class: string;
  level: number;
}

export default function AvatarsPage() {
  const { toast } = useToast(); // Initialize toast
  const [avatars, setAvatars] = React.useState<PlayerAvatar[]>([
    { id: 'avatar1', name: 'Alexandre le Brave', details: 'Guerrier expérimenté, loyal et juste.', portraitUrl: 'https://placehold.co/128x128.png', class: 'Guerrier', level: 5 },
    { id: 'avatar2', name: 'Elara l\'Érudite', details: 'Mage curieuse, spécialisée dans les arcanes.', portraitUrl: null, class: 'Mage', level: 3 },
    { id: 'avatar3', name: 'Kael le Furtif', details: 'Assassin agile et discret.', portraitUrl: 'https://placehold.co/128x128.png', class: 'Voleur', level: 7 },
  ]);

  // Placeholder for the currently selected avatar ID
  // In a real app, this would likely come from global state or localStorage
  const [currentAvatarId, setCurrentAvatarId] = React.useState<string | null>('avatar1');

  const handleUploadAvatarPortrait = (avatarId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatars(prevAvatars =>
        prevAvatars.map(avatar =>
          avatar.id === avatarId ? { ...avatar, portraitUrl: reader.result as string } : avatar
        )
      );
      toast({ title: "Portrait Téléchargé", description: "Le portrait de l'avatar a été mis à jour." });
    };
    reader.readAsDataURL(file);
    if(event.target) event.target.value = ''; // Reset file input to allow re-uploading the same file
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Avatars Joueur</h1>
        <div className="flex gap-2">
           <Button variant="outline" disabled> {/* TODO: Implement JSON import/export for avatars */}
            <Upload className="mr-2 h-4 w-4" /> Importer un Avatar
          </Button>
          <Button disabled> {/* TODO: Implement create avatar functionality */}
            <UserPlus className="mr-2 h-4 w-4" /> Créer un Avatar
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">
        Sélectionnez l'avatar que vous souhaitez incarner dans vos aventures.
      </p>

      <ScrollArea className="h-[calc(100vh-240px)]"> {/* Adjust height as needed */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {avatars.length > 0 ? (
            avatars.map((avatar) => (
              <Card key={avatar.id} className={avatar.id === currentAvatarId ? 'border-primary' : ''}>
                <CardHeader className="flex flex-row items-start gap-4"> {/* Changed to items-start for better alignment with upload button */}
                   <Avatar className="h-20 w-20"> {/* Increased size */}
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
                  <Button variant="ghost" size="sm" disabled> {/* TODO: Implement edit */}
                    <Edit className="mr-2 h-4 w-4" /> Modifier
                  </Button>
                  <Button variant="destructive" size="sm" disabled> {/* TODO: Implement delete */}
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                  </Button>
                   {avatar.id !== currentAvatarId && (
                    <Button variant="outline" size="sm" onClick={() => setCurrentAvatarId(avatar.id)} disabled> {/* TODO: Implement select logic (e.g. save to global state) */}
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
