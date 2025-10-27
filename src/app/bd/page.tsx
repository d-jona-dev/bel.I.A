
"use client";
import React from 'react';
import type { ComicPage } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Trash2 } from 'lucide-react';
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
import { i18n, type Language } from '@/lib/i18n';

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
  const [comicToDelete, setComicToDelete] = React.useState<SavedComic | null>(null);
  const { toast } = useToast();
  const [currentLanguage, setCurrentLanguage] = React.useState<Language>('fr');
  const lang = i18n[currentLanguage];

  const loadComics = React.useCallback(() => {
    setIsLoading(true);
    try {
        const savedLanguage = localStorage.getItem('adventure_language') as Language;
        if (savedLanguage && i18n[savedLanguage]) {
            setCurrentLanguage(savedLanguage);
        }
        const storedComics = localStorage.getItem('savedComics_v1');
        if (storedComics) {
            setSavedComics(JSON.parse(storedComics));
        } else {
            setSavedComics([]);
        }
    } catch (e) {
        console.error("Failed to load comics from storage", e);
        toast({title: lang.loadingErrorTitle, variant: "destructive"})
    }
    setIsLoading(false);
  }, [toast, lang]);

  React.useEffect(() => {
    loadComics();
  }, [loadComics]);

  const handleDeleteComic = () => {
    if (!comicToDelete) return;
    try {
        const updatedComics = savedComics.filter(c => c.id !== comicToDelete.id);
        localStorage.setItem('savedComics_v1', JSON.stringify(updatedComics));
        setSavedComics(updatedComics);
        toast({ title: "BD Supprimée", description: `"${comicToDelete.title}" a été retiré de votre bibliothèque.`});
    } catch (e) {
        console.error("Failed to delete comic", e);
        toast({ title: lang.errorTitle, description: "Impossible de supprimer la BD.", variant: "destructive"});
    }
    setComicToDelete(null);
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-2">{lang.comicLibraryPageTitle}</h1>
      <p className="text-muted-foreground mb-6">
        {lang.comicLibraryDescription}
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
                    <Card key={comic.id} className="overflow-hidden flex flex-col">
                        <CardHeader className="p-0">
                            <div className="relative aspect-[2/3] w-full bg-muted">
                                {comic.coverUrl ? (
                                    <Image src={comic.coverUrl} alt={`Couverture de ${comic.title}`} layout="fill" objectFit="cover"/>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">{lang.noCover}</div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 flex-1">
                            <CardTitle className="text-lg truncate">{comic.title}</CardTitle>
                        </CardContent>
                        <CardFooter className="p-4 pt-0 flex gap-2">
                             <Button asChild className="flex-1">
                                <Link href={`/bd/${comic.id}`}>
                                    <BookOpen className="mr-2 h-4 w-4"/> {lang.readButton}
                                </Link>
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" onClick={() => setComicToDelete(comic)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </AlertDialogTrigger>
                                {comicToDelete?.id === comic.id && (
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Supprimer "{comicToDelete.title}" ?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Cette action est irréversible et supprimera la bande dessinée de votre bibliothèque.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel onClick={() => setComicToDelete(null)}>{lang.cancelButton}</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteComic}>{lang.deleteBubble}</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                )}
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </ScrollArea>
      )}
    </div>
  );
}
