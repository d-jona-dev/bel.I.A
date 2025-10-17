
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Message, ComicPage } from "@/types";
import { createNewPage as createNewComicPageUtil, exportPageAsJpeg } from "@/components/ComicPageEditor";
import { compressImage } from "@/components/ImageEditor";

const uid = (n = 6) => Math.random().toString(36).slice(2, 2 + n);

interface UseComicProps {
    narrativeMessages: Message[];
    generateSceneImageAction: (input: { sceneDescription: string; style?: string }) => Promise<{ imageUrl: string; error?: string }>;
}

export function useComic({ narrativeMessages, generateSceneImageAction }: UseComicProps) {
    const { toast } = useToast();
    const [comicDraft, setComicDraft] = React.useState<ComicPage[]>([]);
    const [currentComicPageIndex, setCurrentComicPageIndex] = React.useState(0);
    const [isSaveComicDialogOpen, setIsSaveComicDialogOpen] = React.useState(false);
    const [comicTitle, setComicTitle] = React.useState("");
    const [comicCoverUrl, setComicCoverUrl] = React.useState<string | null>(null);
    const [isGeneratingCover, setIsGeneratingCover] = React.useState(false);

    const handleDownloadComicDraft = React.useCallback(() => {
        if (comicDraft.length === 0 || !comicDraft[currentComicPageIndex]) {
            toast({
                title: "Rien à télécharger",
                description: "Il n'y a pas de planche de BD active à télécharger.",
                variant: "destructive"
            });
            return;
        }
        const currentPage = comicDraft[currentComicPageIndex];
        exportPageAsJpeg(currentPage, currentComicPageIndex, toast);
    }, [comicDraft, currentComicPageIndex, toast]);

    const handleAddComicPage = React.useCallback(() => {
        const newPage = createNewComicPageUtil();
        setComicDraft(prev => [...prev, newPage]);
        setCurrentComicPageIndex(prev => prev.length);
    }, []);

    const handleAddComicPanel = React.useCallback(() => {
        if (comicDraft.length === 0) {
            handleAddComicPage();
        } else {
            setComicDraft(prev => prev.map((page, index) =>
                index === currentComicPageIndex ? { ...page, panels: [...page.panels, { id: uid(), imageUrl: null, bubbles: [] }] } : page
            ));
        }
    }, [comicDraft, currentComicPageIndex, handleAddComicPage]);

    const handleRemoveLastComicPanel = React.useCallback(() => {
        if (comicDraft[currentComicPageIndex]?.panels.length > 0) {
            setComicDraft(prev => prev.map((page, index) =>
                index === currentComicPageIndex ? { ...page, panels: page.panels.slice(0, -1) } : page
            ));
        }
    }, [comicDraft, currentComicPageIndex]);

    const handleUploadToComicPanel = React.useCallback((pageIndex: number, panelIndex: number, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const url = e.target?.result as string;
            setComicDraft(prev => prev.map((p, i) =>
                i === pageIndex
                    ? { ...p, panels: p.panels.map((pa, pi) => pi === panelIndex ? { ...pa, imageUrl: url } : pa) }
                    : p
            ));
        };
        reader.readAsDataURL(file);
    }, []);
    
    const handleComicPageChange = (index: number) => {
        setCurrentComicPageIndex(index);
    };

    const handleAddToComicPage = React.useCallback((dataUrl: string) => {
        setComicDraft(prev => {
            const draft = prev.length > 0 ? [...prev] : [createNewComicPageUtil()];
            let pageUpdated = false;
            let targetPageIndex = currentComicPageIndex;

            for (let i = targetPageIndex; i < draft.length; i++) {
                const page = draft[i];
                const firstEmptyPanelIndex = page.panels.findIndex(p => !p.imageUrl);
                if (firstEmptyPanelIndex !== -1) {
                    const newPanels = [...page.panels];
                    newPanels[firstEmptyPanelIndex].imageUrl = dataUrl;
                    draft[i] = { ...page, panels: newPanels };
                    pageUpdated = true;
                    toast({ title: "Image Ajoutée", description: `L'image a été ajoutée à la case ${firstEmptyPanelIndex + 1} de la page ${i + 1}.` });
                    break;
                }
            }

            if (!pageUpdated) {
                const newPage = createNewComicPageUtil();
                newPage.panels[0].imageUrl = dataUrl;
                draft.push(newPage);
                setCurrentComicPageIndex(draft.length - 1);
                toast({ title: "Nouvelle Page Créée", description: "L'image a été ajoutée à une nouvelle page." });
            }

            return draft;
        });
    }, [currentComicPageIndex, toast]);

    const handleSetIsSaveComicDialogOpen = (isOpen: boolean) => {
        setIsSaveComicDialogOpen(isOpen);
    };

    const handleGenerateCover = React.useCallback(async () => {
        setIsGeneratingCover(true);
        toast({ title: "Génération de la couverture..." });

        const textContent = comicDraft.map(p => p.panels.map(panel => panel.bubbles.map(b => b.text).join(' ')).join(' ')).join('\n');
        const sceneContent = narrativeMessages.filter(m => m.sceneDescription).map(m => m.sceneDescription).join('. ');
        const prompt = `Comic book cover for a story titled "${comicTitle || 'Untitled'}". The story involves: ${sceneContent}. Style: epic, detailed, vibrant colors.`;

        try {
            const result = await generateSceneImageAction({ sceneDescription: prompt, style: "Fantaisie Epique" });
            if (result.imageUrl) {
                setComicCoverUrl(result.imageUrl);
                toast({ title: "Couverture Générée!", description: "La couverture de votre BD est prête." });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                title: "Erreur de Génération",
                description: `Impossible de générer la couverture. ${error instanceof Error ? error.message : String(error)}`,
                variant: "destructive"
            });
        } finally {
            setIsGeneratingCover(false);
        }
    }, [comicDraft, comicTitle, narrativeMessages, toast, generateSceneImageAction]);
    
    const handleSaveToLibrary = React.useCallback(async () => {
        if (!comicTitle.trim()) {
            toast({ title: "Titre requis", description: "Veuillez donner un titre à votre BD.", variant: "destructive" });
            return;
        }

        try {
            const compressedDraft: ComicPage[] = await Promise.all(
                comicDraft.map(async (page) => ({
                    ...page,
                    panels: await Promise.all(page.panels.map(async (panel) => ({
                        ...panel,
                        imageUrl: panel.imageUrl ? await compressImage(panel.imageUrl) : null,
                    }))),
                }))
            );

            const newComic = {
                id: uid(),
                title: comicTitle,
                coverUrl: comicCoverUrl,
                comicDraft: compressedDraft,
                createdAt: new Date().toISOString(),
            };

            const existingComicsStr = localStorage.getItem('savedComics_v1');
            const existingComics: any[] = existingComicsStr ? JSON.parse(existingComicsStr) : [];
            existingComics.push(newComic);
            localStorage.setItem('savedComics_v1', JSON.stringify(existingComics));

            toast({ title: "BD Sauvegardée!", description: `"${comicTitle}" a été ajouté à votre bibliothèque.` });
            setIsSaveComicDialogOpen(false);
            setComicTitle("");
            setComicCoverUrl(null);
        } catch (e) {
            console.error("Failed to save comic to library:", e);
            toast({
                title: "Erreur de Sauvegarde",
                description: `Impossible de sauvegarder dans la bibliothèque. Le stockage est peut-être plein. Erreur: ${e instanceof Error ? e.message : String(e)}`,
                variant: "destructive"
            });
        }
    }, [comicDraft, comicTitle, comicCoverUrl, toast]);


    return {
        comicDraft,
        currentComicPageIndex,
        isSaveComicDialogOpen,
        comicTitle,
        comicCoverUrl,
        isGeneratingCover,
        handleDownloadComicDraft,
        handleAddComicPage,
        handleAddComicPanel,
        handleRemoveLastComicPanel,
        handleUploadToComicPanel,
        handleComicPageChange,
        handleAddToComicPage,
        setIsSaveComicDialogOpen: handleSetIsSaveComicDialogOpen,
        setComicTitle,
        onGenerateCover: handleGenerateCover,
        onSaveToLibrary: handleSaveToLibrary,
    };
}
