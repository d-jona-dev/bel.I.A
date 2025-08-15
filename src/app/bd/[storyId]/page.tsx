
"use client";
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import ComicPageEditor from '@/components/ComicPageEditor';
import type { ComicPage } from '@/types';

interface SavedComic {
    id: string;
    title: string;
    coverUrl: string | null;
    comicDraft: ComicPage[];
    createdAt: string;
}

export default function StoryComicEditorPage({ params }: { params: { storyId: string } }) {
  const { toast } = useToast();
  const [comic, setComic] = useState<SavedComic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedComics = localStorage.getItem('savedComics_v1');
      if (storedComics) {
        const allComics: SavedComic[] = JSON.parse(storedComics);
        const foundComic = allComics.find(c => c.id === params.storyId);
        if (foundComic) {
          setComic(foundComic);
        } else {
          toast({ title: "BD non trouvée", variant: "destructive" });
        }
      }
    } catch (e) {
      console.error("Failed to load comic from storage", e);
      toast({ title: "Erreur de chargement", variant: "destructive" });
    }
    setIsLoading(false);
  }, [params.storyId, toast]);

  const handlePagesChange = (updatedPages: ComicPage[]) => {
    if (!comic) return;
    
    const updatedComic = { ...comic, comicDraft: updatedPages };
    setComic(updatedComic);

    // Also update localStorage so changes are not lost on reload
    try {
        const storedComics = localStorage.getItem('savedComics_v1');
        const allComics: SavedComic[] = storedComics ? JSON.parse(storedComics) : [];
        const updatedAllComics = allComics.map(c => c.id === comic.id ? updatedComic : c);
        localStorage.setItem('savedComics_v1', JSON.stringify(updatedAllComics));
    } catch(e) {
        console.error("Failed to save updated comic to storage", e);
    }
  }

  if (isLoading) {
    return <div className="text-center p-10">Chargement de la BD...</div>;
  }

  if (!comic) {
    return (
      <div className="text-center p-10">
        <h2 className="text-xl font-semibold">Bande Dessinée Introuvable</h2>
        <p className="text-muted-foreground mt-2">Cette BD n'existe pas ou n'a pas pu être chargée.</p>
        <Button asChild className="mt-4"><Link href="/bd">Retour à la bibliothèque</Link></Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-screen flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/bd"><ArrowLeft className="h-4 w-4"/></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{comic.title}</h1>
          <p className="text-muted-foreground">Éditeur de planches</p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
         <ComicPageEditor
            pages={comic.comicDraft}
            onPagesChange={handlePagesChange}
        />
      </div>
    </div>
  );
}
