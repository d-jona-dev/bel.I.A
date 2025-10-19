
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
import { i18n } from '@/lib/i18n';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ModelManager } from '@/components/model-manager';

const WARDROBE_STORAGE_KEY = 'wardrobe_items_v1';
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

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

  React.useEffect(() => {
    try {
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
      toast({ title: "Erreur de chargement", description: "Impossible de charger la penderie.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);
  
  const handleAiConfigChange = (newConfig: AiConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('globalAiConfig', JSON.stringify(newConfig));
    toast({ title: "Configuration IA mise à jour."});
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
                 toast({ title: "Importation échouée", description: `Un vêtement avec l'ID "${newItem.id}" existe déjà.`, variant: "destructive" });
                 return;
            }

            saveItems([...items, newItem]);
            toast({ title: "Vêtement Importé", description: `"${newItem.name}" a été ajouté à votre penderie.` });

        } catch (error) {
            console.error("Error loading clothing from JSON:", error);
            toast({ title: "Erreur d'Importation", description: `Impossible de lire le fichier JSON: ${error instanceof Error ? error.message : 'Format invalide'}.`, variant: "destructive" });
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
        // Note: The `describeAppearance` flow is used here. We've updated it to handle clothing.
        const result = await describeAppearance({ portraitUrl: itemData.imageUrl });
        setItemData(prev => ({...prev, description: result.description }));
        toast({ title: "Scan Réussi", description: "La description a été générée par l'IA." });
    } catch (error) {
        toast({ title: "Erreur de Vision", description: `Impossible de scanner l'image. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
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
                {itemData.imageUrl ? (
                    <Image src={itemData.imageUrl} alt={itemData.name || "Vêtement"} width={128} height={128} className="object-cover w-full h-full rounded-md"/>
                ): (
                    <Shirt className="h-16 w-16 text-muted-foreground"/>
                )}
            </div>
            <div className="space-y-2 flex-1">
                <Label>Image du vêtement</Label>
                <div className="flex gap-2">
                    <Input 
                        placeholder="URL de l'image" 
                        value={itemData.imageUrl || ''} 
                        onChange={e => setItemData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    />
                     <input type="file" ref={uploadFileRef} onChange={(e) => handleImageUpload(e, setItemData)} accept="image/*" className="hidden" />
                    <Button variant="outline" size="icon" onClick={() => uploadFileRef.current?.click()}><UploadCloud/></Button>
                </div>
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="item-name">Nom du vêtement</Label>
            <Input id="item-name" value={itemData.name || ''} onChange={e => setItemData(prev => ({...prev, name: e.target.value}))} placeholder="Ex: Tunique en lin, Armure de plaques..."/>
        </div>
        <div className="space-y-2">
            <Label htmlFor="item-description">Description (pour IA)</Label>
            <Textarea id="item-description" value={itemData.description || ''} onChange={e => setItemData(prev => ({...prev, description: e.target.value}))} placeholder="Description objective pour la génération d'images..." rows={5}/>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={() => handleVisionScan(itemData, setItemData)} disabled={isProcessing || !itemData.imageUrl || !visionConsent} className="w-full">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Eye className="mr-2 h-4 w-4" />}
                Scanner avec Vision IA
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
                            <p>{i18n.fr.visionConsent}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    </div>
  );


  if (isLoading) {
    return <div className="text-center p-10">Chargement de la penderie...</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ma Penderie</h1>
        <div className="flex gap-2">
            <input type="file" ref={importFileRef} onChange={handleImportItem} accept=".json" className="hidden" />
            <Button variant="outline" onClick={() => importFileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Importer
            </Button>
            <Dialog open={isAiConfigOpen} onOpenChange={setIsAiConfigOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline"><BrainCircuit className="mr-2 h-4 w-4" /> Config IA</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configuration Globale de l'IA</DialogTitle>
                        <DialogDescription>
                            Configurez les modèles d'IA utilisés pour la génération de texte et d'images. Ces paramètres s'appliquent à toute l'application.
                        </DialogDescription>
                    </DialogHeader>
                    <ModelManager config={aiConfig} onConfigChange={handleAiConfigChange} />
                </DialogContent>
            </Dialog>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Shirt className="mr-2 h-4 w-4" /> Créer un vêtement
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Créer un nouveau vêtement</DialogTitle>
                    </DialogHeader>
                    {commonEditorFields(newItemData, setNewItemData)}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Annuler</Button>
                        <Button onClick={handleCreateItem}><Save className="mr-2 h-4 w-4"/> Créer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">
        Gérez votre collection de vêtements. Vous pourrez les assigner à vos personnages pour influencer la génération d'images.
      </p>

      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.length > 0 ? (
            items.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader className="p-0">
                    <div className="w-full aspect-square relative bg-muted rounded-t-lg">
                        {item.imageUrl ? (
                             <Image src={item.imageUrl} alt={item.name} layout="fill" objectFit="cover" className="rounded-t-lg"/>
                        ) : (
                            <div className="flex items-center justify-center h-full"><Shirt className="h-16 w-16 text-muted-foreground"/></div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-4 flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-3 mt-1">{item.description || "Aucune description."}</CardDescription>
                </CardContent>
                <CardFooter className="flex flex-wrap justify-end gap-2 p-4 pt-0">
                    <Dialog open={editingItem?.id === item.id} onOpenChange={(open) => !open && setEditingItem(null)}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setEditingItem(JSON.parse(JSON.stringify(item)))}>
                                <Edit className="mr-2 h-4 w-4" /> Modifier
                            </Button>
                        </DialogTrigger>
                        {editingItem?.id === item.id && (
                           <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Modifier: {editingItem.name}</DialogTitle>
                                </DialogHeader>
                                {commonEditorFields(editingItem, setEditingItem)}
                               <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingItem(null)}>Annuler</Button>
                                  <Button onClick={handleUpdateItem}><Save className="mr-2 h-4 w-4"/> Enregistrer</Button>
                               </DialogFooter>
                           </DialogContent>
                        )}
                    </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" onClick={() => setItemToDelete(item)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    {itemToDelete?.id === item.id && (
                       <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la Suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer "{itemToDelete.name}" ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                    )}
                  </AlertDialog>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadItem(item)}>
                    <Download className="mr-2 h-4 w-4" /> Télécharger
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-10 border-2 border-dashed rounded-lg">
                <h2 className="text-xl font-semibold">Penderie vide</h2>
                <p className="text-muted-foreground mt-2">Créez votre premier vêtement pour commencer !</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
