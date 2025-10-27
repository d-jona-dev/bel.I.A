
"use client";
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import ComicPageEditor from '@/components/ComicPageEditor';
import type { ComicPage } from '@/types';
import { useParams } from 'next/navigation';
import { i18n, type Language } from "@/lib/i18n";

interface SavedComic {
    id: string;
    title: string;
    coverUrl: string | null;
    comicDraft: ComicPage[];
    createdAt: string;
}

export default function StoryComicEditorPage() {
  const { toast } = useToast();
  const params = useParams();
  const storyId = params.storyId as string;

  const [comic, setComic] = useState<SavedComic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('fr');
  const lang = i18n[currentLanguage];

  useEffect(() => {
    if (!storyId) return;
    try {
      const savedLanguage = localStorage.getItem('adventure_language') as Language;
      if (savedLanguage && i18n[savedLanguage]) {
          setCurrentLanguage(savedLanguage);
      }
      const storedComics = localStorage.getItem('savedComics_v1');
      if (storedComics) {
        const allComics: SavedComic[] = JSON.parse(storedComics);
        const foundComic = allComics.find(c => c.id === storyId);
        if (foundComic) {
          setComic(foundComic);
        } else {
          toast({ title: lang.errorTitle, description: lang.comicNotFound, variant: "destructive" });
        }
      }
    } catch (e) {
      console.error("Failed to load comic from storage", e);
      toast({ title: lang.loadingErrorTitle, variant: "destructive" });
    }
    setIsLoading(false);
  }, [storyId, toast, lang]);

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
    return <div className="text-center p-10">{lang.loadingComic}...</div>;
  }

  if (!comic) {
    return (
      <div className="text-center p-10">
        <h2 className="text-xl font-semibold">{lang.comicNotFoundTitle}</h2>
        <p className="text-muted-foreground mt-2">{lang.comicNotFoundDesc}</p>
        <Button asChild className="mt-4"><Link href="/bd">{lang.backToLibrary}</Link></Button>
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
          <p className="text-muted-foreground">{lang.comicPageEditorTitle}</p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
         <ComicPageEditor
            pages={comic.comicDraft}
            onPagesChange={handlePagesChange}
            currentLanguage={currentLanguage}
        />
      </div>
    </div>
  );
}
