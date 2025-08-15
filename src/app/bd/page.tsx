
"use client";
import React from 'react';
import type { ComicPage } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen } from 'lucide-react';

interface SavedComic {
    id: string;
    title: string;
    coverUrl: string | null;
    comicDraft: ComicPage[];
    createdAt: string;
}

export default function ComicLibraryPage() {
  const [savedComics, setSavedComics] = React.useState<SavedComic[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    try {
        const storedComics = localStorage.getItem('savedComics_v1');
        if (storedComics) {
            setSavedComics(JSON.parse(storedComics));
        }
    } catch (e) {
        console.error("Failed to load comics from storage", e);
    }
    setIsLoading(false);
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-2">Bibliothèque de Bandes Dessinées</h1>
      <p className="text-muted-foreground mb-6">
        Retrouvez ici toutes les bandes dessinées que vous avez sauvegardées.
      </p>
      
      {isLoading ? (
        <p>Chargement...</p>
      ) : savedComics.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold">Bibliothèque Vide</h2>
            <p className="text-muted-foreground mt-2">Sauvegardez une BD depuis la page d'aventure pour la voir ici.</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pr-4">
                {savedComics.map(comic => (
                    <Card key={comic.id} className="overflow-hidden">
                        <CardHeader className="p-0">
                            <div className="relative aspect-[2/3] w-full bg-muted">
                                {comic.coverUrl ? (
                                    <Image src={comic.coverUrl} alt={`Couverture de ${comic.title}`} layout="fill" objectFit="cover"/>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">Pas de couverture</div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <CardTitle className="text-lg truncate">{comic.title}</CardTitle>
                        </CardContent>
                        <CardFooter className="p-4 pt-0">
                             <Button asChild className="w-full">
                                <Link href={`/bd/${comic.id}`}>
                                    <BookOpen className="mr-2 h-4 w-4"/> Lire
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </ScrollArea>
      )}
    </div>
  );
}
