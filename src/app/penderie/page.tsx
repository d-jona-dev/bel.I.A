
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Edit, Download, Save, Wand2, Link as LinkIcon, UploadCloud, X, Shirt, Eye, AlertTriangle, BrainCircuit } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import type { ClothingItem, AiConfig } from '@/types';
import { describeAppearance } from '@/ai/flows/describe-appearance';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { i18n, type Language } from '@/lib/i18n';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ModelManager } from '@/components/model-manager';

const WARDROBE_STORAGE_KEY = 'wardrobe_items_v1';
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

const isValidUrl = (url: string | null | undefined): url is string => {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image');
};

export default function PenderiePage() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<ClothingItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [itemToDelete, setItemToDelete] = React.useState<ClothingItem | null>(null);
  const [editingItem, setEditingItem] = React.useState<ClothingItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  const [newItemData, setNewItemData] = React.useState<Partial<ClothingItem>>({ name: '', description: '', imageUrl: null });
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [visionConsent, setVisionConsent] = React.useState(false);
  
  const importFileRef = React.useRef<HTMLInputElement>(null);
  const uploadFileRef = React.useRef<HTMLInputElement>(null);

  const [aiConfig, setAiConfig] = React.useState<AiConfig>({
      llm: { source: 'gemini' },
      image: { source: 'gemini' }
  });
  const [isAiConfigOpen, setIsAiConfigOpen] = React.useState(false);
  const [currentLanguage, setCurrentLanguage] = React.useState<Language>('fr');
  const lang = i18n[currentLanguage] || i18n.fr;

  React.useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem('adventure_language') as Language;
      if (savedLanguage && i18n[savedLanguage]) {
          setCurrentLanguage(savedLanguage);
      }
      const savedItems = localStorage.getItem(WARDROBE_STORAGE_KEY);
      if (savedItems) {
        setItems(JSON.parse(savedItems));
      }
      const aiConfigFromStorage = localStorage.getItem('globalAiConfig');
      if (aiConfigFromStorage) {
        setAiConfig(JSON.parse(aiConfigFromStorage));
      }
    } catch (error) {
      console.error("Failed to load wardrobe items from localStorage:", error);
      toast({ title: lang.loadingErrorTitle, description: "Impossible de charger la penderie.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast, lang]);
  
  const handleAiConfigChange = (newConfig: AiConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('globalAiConfig', JSON.stringify(newConfig));
    toast({ title: lang.aiConfigTitle + " mise à jour."});
  }

  const saveItems = (updatedItems: ClothingItem[]) => {
    setItems(updatedItems);
    localStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(updatedItems));
  };
  
  const handleDownloadItem = (item: ClothingItem) => {
    const jsonString = JSON.stringify(item, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name.toLowerCase().replace(/\s/g, '_')}_clothing.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportItem = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonString = e.target?.result as string;
            const newItem = JSON.parse(jsonString) as ClothingItem;

            if (!newItem.id || !newItem.name) {
                throw new Error("Fichier JSON invalide ou manquant de champs obligatoires.");
            }
            
            if (items.some(c => c.id === newItem.id)) {
                 toast({ title: lang.importErrorTitle, description: `Un vêtement avec l'ID "${newItem.id}" existe déjà.`, variant: "destructive" });
                 return;
            }

            saveItems([...items, newItem]);
            toast({ title: lang.importSuccessTitle, description: `"${newItem.name}" a été ajouté à votre penderie.` });

        } catch (error) {
            console.error("Error loading clothing from JSON:", error);
            toast({ title: lang.importErrorTitle, description: `Impossible de lire le fichier JSON: ${error instanceof Error ? error.message : 'Format invalide'}.`, variant: "destructive" });
        }
    };
    reader.readAsText(file);
    if(event.target) event.target.value = '';
  }

  const confirmDelete = () => {
    if (itemToDelete) {
      saveItems(items.filter(a => a.id !== itemToDelete.id));
      toast({ title: "Vêtement Supprimé", description: `"${itemToDelete.name}" a été supprimé.` });
      setItemToDelete(null);
    }
  };
  
  const handleCreateItem = () => {
    if (!newItemData.name?.trim()) {
        toast({ title: "Nom requis", description: "Le nom du vêtement est obligatoire.", variant: "destructive" });
        return;
    }
    const newItem: ClothingItem = {
        id: uid(),
        name: newItemData.name,
        description: newItemData.description || "",
        imageUrl: newItemData.imageUrl || null,
    };
    saveItems([...items, newItem]);
    toast({ title: "Vêtement Créé!", description: `${newItem.name} a été ajouté à la penderie.` });
    setIsCreateModalOpen(false);
    setNewItemData({ name: '', description: '', imageUrl: null });
  };

  const handleUpdateItem = () => {
      if (!editingItem) return;
      saveItems(items.map(a => a.id === editingItem.id ? editingItem : a));
      toast({ title: "Vêtement Mis à Jour", description: `Les informations de "${editingItem.name}" ont été sauvegardées.` });
      setEditingItem(null);
  };
  
  const handleVisionScan = async (itemData: Partial<ClothingItem>, setItemData: React.Dispatch<React.SetStateAction<Partial<ClothingItem>>>) => {
    if (!itemData.imageUrl) {
        toast({ title: "Image requise", description: "Veuillez fournir une image (URL ou téléversée) avant d'utiliser Vision.", variant: "destructive" });
        return;
    }
    setIsProcessing(true);
    try {
        const result = await describeAppearance({ portraitUrl: itemData.imageUrl, aiConfig, subjectType: 'clothing' });
        setItemData(prev => ({...prev, description: result.description }));
        toast({ title: lang.descriptionSuccessTitle, description: "La description a été générée par l'IA." });
    } catch (error) {
        toast({ title: lang.visionErrorTitle, description: `Impossible de scanner l'image. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, setItemData: React.Dispatch<React.SetStateAction<Partial<ClothingItem>>>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setItemData(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const commonEditorFields = (itemData: Partial<ClothingItem>, setItemData: React.Dispatch<React.SetStateAction<Partial<ClothingItem>>>) => (
    <div className="grid gap-4 py-4">
        <div className="flex gap-4 items-start">
            <div className="w-32 h-32 flex-shrink-0 bg-muted rounded-md flex items-center justify-center border">
                {isValidUrl(itemData.imageUrl) ? (
                    <Image src={itemData.imageUrl} alt={itemData.name || "Vêtement"} width={128} height={128} className="object-cover w-full h-full rounded-md"/>
                ): (
                    <Shirt className="h-16 w-16 text-muted-foreground"/>
                )}
            </div>
            <div className="space-y-2 flex-1">
                <Label>{lang.clothingImageLabel}</Label>
                <div className="flex gap-2">
                    <Input 
                        placeholder={lang.imageURLInputPlaceholder} 
                        value={itemData.imageUrl || ''} 
                        onChange={e => setItemData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    />
                     <input type="file" ref={uploadFileRef} onChange={(e) => handleImageUpload(e, setItemData)} accept="image/*" className="hidden" />
                    <Button variant="outline" size="icon" onClick={() => uploadFileRef.current?.click()}><UploadCloud/></Button>
                </div>
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="item-name">{lang.clothingNameLabel}</Label>
            <Input id="item-name" value={itemData.name || ''} onChange={e => setItemData(prev => ({...prev, name: e.target.value}))} placeholder={lang.clothingNamePlaceholder}/>
        </div>
        <div className="space-y-2">
            <Label htmlFor="item-description">{lang.clothingDescriptionLabelAi}</Label>
            <Textarea id="item-description" value={itemData.description || ''} onChange={e => setItemData(prev => ({...prev, description: e.target.value}))} placeholder={lang.clothingDescriptionPlaceholderAi} rows={5}/>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={() => handleVisionScan(itemData, setItemData)} disabled={isProcessing || !itemData.imageUrl || !visionConsent} className="w-full">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Eye className="mr-2 h-4 w-4" />}
                {lang.scanWithVision}
            </Button>
            <div className="flex items-center space-x-2">
                <Checkbox id="vision-consent" checked={visionConsent} onCheckedChange={(checked) => setVisionConsent(!!checked)} />
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Label htmlFor="vision-consent" className="cursor-pointer">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </Label>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                            <p>{lang.visionConsent}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    </div>
  );


  if (isLoading) {
    return <div className="text-center p-10">{lang.loadingWardrobe}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{lang.wardrobePageTitle}</h1>
        <div className="flex gap-2">
            <input type="file" ref={importFileRef} onChange={handleImportItem} accept=".json" className="hidden" />
            <Button variant="outline" onClick={() => importFileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> {lang.importButton}
            </Button>
            <Dialog open={isAiConfigOpen} onOpenChange={setIsAiConfigOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline"><BrainCircuit className="mr-2 h-4 w-4" /> {lang.aiConfigTitle}</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{lang.aiGlobalConfigTitle}</DialogTitle>
                        <DialogDescription>
                            {lang.aiGlobalConfigDescription}
                        </DialogDescription>
                    </DialogHeader>
                    <ModelManager config={aiConfig} onConfigChange={handleAiConfigChange} currentLanguage={currentLanguage}/>
                </DialogContent>
            </Dialog>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Shirt className="mr-2 h-4 w-4" /> {lang.createClothingButton}
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{lang.createClothingTitle}</DialogTitle>
                    </DialogHeader>
                    {commonEditorFields(newItemData, setNewItemData)}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{lang.cancelButton}</Button>
                        <Button onClick={handleCreateItem}><Save className="mr-2 h-4 w-4"/> {lang.createButton}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">
        {lang.wardrobePageDescription}
      </p>

      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.length > 0 ? (
            items.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader className="p-0">
                    <div className="w-full aspect-square relative bg-muted rounded-t-lg">
                        {isValidUrl(item.imageUrl) ? (
                             <Image src={item.imageUrl} alt={item.name} layout="fill" objectFit="cover" className="rounded-t-lg"/>
                        ) : (
                            <div className="flex items-center justify-center h-full"><Shirt className="h-16 w-16 text-muted-foreground"/></div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-4 flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-3 mt-1">{item.description || lang.noDescription}</CardDescription>
                </CardContent>
                <CardFooter className="flex flex-wrap justify-end gap-2 p-4 pt-0">
                    <Dialog open={editingItem?.id === item.id} onOpenChange={(open) => !open && setEditingItem(null)}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setEditingItem(JSON.parse(JSON.stringify(item)))}>
                                <Edit className="mr-2 h-4 w-4" /> {lang.editButton}
                            </Button>
                        </DialogTrigger>
                        {editingItem?.id === item.id && (
                           <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{lang.editClothingTitle}: {editingItem.name}</DialogTitle>
                                </DialogHeader>
                                {commonEditorFields(editingItem, setEditingItem)}
                               <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingItem(null)}>{lang.cancelButton}</Button>
                                  <Button onClick={handleUpdateItem}><Save className="mr-2 h-4 w-4"/> {lang.saveButton}</Button>
                               </DialogFooter>
                           </DialogContent>
                        )}
                    </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" onClick={() => setItemToDelete(item)}>
                        <Trash2 className="mr-2 h-4 w-4" /> {lang.deleteButton}
                      </Button>
                    </AlertDialogTrigger>
                    {itemToDelete?.id === item.id && (
                       <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{lang.confirmDeletion}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {lang.deleteClothingConfirmation.replace('{itemName}', itemToDelete.name)}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setItemToDelete(null)}>{lang.cancelButton}</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete}>{lang.deleteButton}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                    )}
                  </AlertDialog>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadItem(item)}>
                    <Download className="mr-2 h-4 w-4" /> {lang.downloadButton}
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-10 border-2 border-dashed rounded-lg">
                <h2 className="text-xl font-semibold">{lang.wardrobeEmptyTitle}</h2>
                <p className="text-muted-foreground mt-2">{lang.wardrobeEmptyDesc}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
