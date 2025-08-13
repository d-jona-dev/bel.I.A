
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import ComicPageEditor from "@/components/ComicPageEditor";
import type { ComicPage, SaveData } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StoryComicEditorPage() {
  const params = useParams();
  const storyId = params.storyId as string;
  const { toast } = useToast();
  
  const [pages, setPages] = useState<ComicPage[]>([]);
  const [storyTitle, setStoryTitle] = useState<string>("Chargement...");
  const [isLoading, setIsLoading] = useState(true);

  const getStorageKey = useCallback(() => `comic_book_v1_${storyId}`, [storyId]);

  useEffect(() => {
    if (!storyId) return;

    try {
        // Load the story title from the main stories data
        const allStoriesStr = localStorage.getItem('adventureStories');
        if(allStoriesStr) {
            const allStories = JSON.parse(allStoriesStr);
            const currentStory = allStories.find((s: any) => s.id === storyId);
            if(currentStory) {
                setStoryTitle(currentStory.title);
            } else {
                setStoryTitle("Histoire inconnue");
            }
        }

        // Load the comic pages for this specific story
        const savedPages = localStorage.getItem(getStorageKey());
        if (savedPages) {
            setPages(JSON.parse(savedPages));
        }
    } catch (e) {
      console.error("Could not load comic pages from localStorage", e);
      toast({ title: "Erreur", description: "Impossible de charger les planches de BD pour cette histoire.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [storyId, toast, getStorageKey]);

  const handlePagesChange = useCallback((newPages: ComicPage[]) => {
    setPages(newPages);
    try {
        localStorage.setItem(getStorageKey(), JSON.stringify(newPages));
    } catch(e) {
        toast({ title: "Erreur de sauvegarde", description: "Impossible de sauvegarder les modifications de la BD.", variant: "destructive" });
    }
  }, [getStorageKey, toast]);

  if (isLoading) {
    return <div className="p-8">Chargement de l'éditeur...</div>;
  }

  return (
    <div className="p-4 md:p-6">
        <div className="flex items-center gap-4 mb-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/bd"><ArrowLeft className="h-4 w-4"/></Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold">Album BD : {storyTitle}</h1>
                <p className="text-muted-foreground">Composez les planches pour cette histoire.</p>
            </div>
        </div>
      <ComicPageEditor pages={pages} onPagesChange={handlePagesChange} />
    </div>
  );
}

