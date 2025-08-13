
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SaveData } from '@/types';
import { BookOpen } from 'lucide-react';

interface SavedStory {
  id: string;
  title: string;
  date: string;
  description: string;
  adventureState: SaveData;
}

export default function ComicLibraryPage() {
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storiesFromStorage = localStorage.getItem('adventureStories');
      if (storiesFromStorage) {
        setSavedStories(JSON.parse(storiesFromStorage));
      }
    } catch (error) {
      console.error("Failed to load stories from localStorage:", error);
    }
    setIsLoading(false);
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-2">Bibliothèque de Bandes Dessinées</h1>
      <p className="text-muted-foreground mb-6">
        Chaque histoire que vous avez sauvegardée possède son propre album de BD. Sélectionnez une histoire pour voir ou modifier ses planches.
      </p>

      {isLoading ? (
        <p>Chargement de la bibliothèque...</p>
      ) : savedStories.length > 0 ? (
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {savedStories.map(story => (
              <Link key={story.id} href={`/bd/${story.id}`} legacyBehavior>
                <a className="block">
                  <Card className="h-full hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {story.title}
                      </CardTitle>
                      <CardDescription>
                        Sauvegardée le {new Date(story.date).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold">Votre bibliothèque est vide</h2>
            <p className="text-muted-foreground mt-2">Commencez par jouer et sauvegarder une aventure depuis la page "Histoires" pour créer votre premier album.</p>
        </div>
      )}
    </div>
  );
}
