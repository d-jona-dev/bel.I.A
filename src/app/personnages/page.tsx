
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Edit, UserPlus, MessageSquare } from 'lucide-react';
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
import Link from 'next/link';

export default function PersonnagesPage() {
  const { toast } = useToast();
  
  const [savedNPCs, setSavedNPCs] = React.useState<Character[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [characterToDelete, setCharacterToDelete] = React.useState<Character | null>(null);

  React.useEffect(() => {
    try {
      const charactersFromStorage = localStorage.getItem('globalCharacters');
      if (charactersFromStorage) {
        setSavedNPCs(JSON.parse(charactersFromStorage));
      }
    } catch (error) {
      console.error("Failed to load characters from localStorage:", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les personnages sauvegardés.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }, [toast]);

  const confirmDelete = () => {
    if (characterToDelete) {
      const updatedCharacters = savedNPCs.filter(c => c.id !== characterToDelete.id);
      setSavedNPCs(updatedCharacters);
      localStorage.setItem('globalCharacters', JSON.stringify(updatedCharacters));
      toast({
        title: "Personnage Supprimé",
        description: `Le personnage "${characterToDelete.name}" a été supprimé de la sauvegarde globale.`,
      });
      setCharacterToDelete(null);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Personnages Secondaires</h1>
        <div className="flex gap-2">
           <Button variant="outline" disabled>
            <Upload className="mr-2 h-4 w-4" /> Importer un Personnage
          </Button>
          <Button disabled>
            <UserPlus className="mr-2 h-4 w-4" /> Créer un Personnage
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">
        Gérez les personnages secondaires que vous avez rencontrés ou créés. Vous pourrez les réutiliser dans d'autres aventures ou discuter avec eux.
      </p>

      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p className="text-muted-foreground col-span-full text-center py-10">Chargement des personnages...</p>
          ) : savedNPCs.length > 0 ? (
            savedNPCs.map((npc) => (
              <Card key={npc.id}>
                <CardHeader className="flex flex-row items-center gap-4">
                   <Avatar className="h-12 w-12">
                      {npc.portraitUrl ? (
                        <AvatarImage src={npc.portraitUrl} alt={npc.name} data-ai-hint={`${npc.name} npc portrait`} />
                      ) : (
                        <AvatarFallback>{npc.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                   <div className="flex-1">
                    <CardTitle>{npc.name}</CardTitle>
                     <CardDescription className="line-clamp-1">
                        {npc.details || "Aucune description."}
                     </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Affinité&nbsp;: {npc.affinity ?? 'N/A'}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" disabled>
                    <Edit className="mr-2 h-4 w-4" /> Modifier
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" onClick={() => setCharacterToDelete(npc)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    {characterToDelete && characterToDelete.id === npc.id && (
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmer la Suppression</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer définitivement "{characterToDelete.name}" de vos sauvegardes globales ? Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setCharacterToDelete(null)}>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmDelete}>
                            Supprimer Définitivement
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    )}
                  </AlertDialog>
                  <Link href={`/chat/${npc.id}`}>
                      <Button variant="default" size="sm">
                        <MessageSquare className="mr-2 h-4 w-4" /> Chatter
                      </Button>
                    </Link>
                </CardFooter>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-10">
              Aucun personnage secondaire sauvegardé pour le moment.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
