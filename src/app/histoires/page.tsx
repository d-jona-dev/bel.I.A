
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Play, PlusCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { Character } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function HistoiresPage() {
  const { toast } = useToast();
  // Placeholder data for stories - replace with actual logic
  const savedStories = [
    { id: 'story1', title: 'Aventure à Hight School of Future', date: '2024-05-01', description: 'Le début de l\'intrigue avec Rina et Kentaro...' },
    { id: 'story2', title: 'Exploration de la Forêt Interdite', date: '2024-04-25', description: 'Une quête parallèle dans un monde fantastique...' },
  ];

  const [savedCharacters, setSavedCharacters] = React.useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = React.useState(true);

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

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Histoires & Personnages</h1>
        <div className="flex gap-2">
          <Button variant="outline" disabled> {/* TODO: Implement import */}
            <Upload className="mr-2 h-4 w-4" /> Importer
          </Button>
          <Link href="/">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Aventure
            </Button>
          </Link>
        </div>
      </div>

      {/* Saved Stories Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Mes Histoires Sauvegardées</h2>
        <ScrollArea className="h-[calc(50vh-120px)] lg:h-[calc(100vh-400px)]"> {/* Adjust height */}
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
                  <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" disabled>
                      <Play className="mr-2 h-4 w-4" /> Continuer
                    </Button>
                    <Button variant="destructive" size="sm" disabled>
                      <Trash2 className="mr-2 h-4 w-4" /> Supprimer
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

      {/* Saved Characters for Chat Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Chatter avec un Personnage</h2>
        <ScrollArea className="h-[calc(50vh-120px)] lg:h-[calc(100vh-400px)]"> {/* Adjust height */}
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
                      {/* You can add more info here if needed, like class or a snippet of their history */}
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
