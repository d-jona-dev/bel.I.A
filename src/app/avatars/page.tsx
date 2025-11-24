
"use client"; // Required for useState, useEffect, and event handlers

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Edit, UserPlus, CheckCircle, UploadCloud, Wand2, Save, Loader2, Download, Palette, Link as LinkIcon, Eye, AlertTriangle, BrainCircuit } from 'lucide-react';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { describeAppearance } from '@/ai/flows/describe-appearance';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { AiConfig } from '@/types';
import { ModelManager } from '@/components/model-manager';
import { Checkbox } from '@/components/ui/checkbox';
import { i18n, type Language } from '@/lib/i18n';
import { generateSceneImage } from '@/ai/flows/generate-scene-image';
import { defaultImageStyles, type ImageStyle } from '@/lib/image-styles';


// Define a type for your avatar data
interface PlayerAvatar {
  id: string;
  name: string;
  portraitUrl: string | null;
  details: string; // physique, age
  description: string; // background
  orientation: string;
}

interface CustomImageStyle {
  name: string;
  prompt: string;
}

const AVATARS_STORAGE_KEY = 'playerAvatars_v2'; // increment version
const CURRENT_AVATAR_ID_KEY = 'currentAvatarId';
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;


export default function AvatarsPage() {
  const { toast } = useToast();
  const [avatars, setAvatars] = React.useState<PlayerAvatar[]>([]);
  const [currentAvatarId, setCurrentAvatarId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // State for modals
  const [avatarToDelete, setAvatarToDelete] = React.useState<PlayerAvatar | null>(null);
  const [editingAvatar, setEditingAvatar] = React.useState<PlayerAvatar | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [newAvatarData, setNewAvatarData] = React.useState<Partial<PlayerAvatar>>({ name: '', details: '', description: '', orientation: '', portraitUrl: null });
  const [isGeneratingPortrait, setIsGeneratingPortrait] = React.useState(false);
  const [isUrlDialogOpen, setIsUrlDialogOpen] = React.useState(false);
  const [portraitUrlInput, setPortraitUrlInput] = React.useState("");

  const [imageStyle, setImageStyle] = React.useState<string>('default');
  const [customStyles, setCustomStyles] = React.useState<CustomImageStyle[]>([]);
  const importFileRef = React.useRef<HTMLInputElement>(null);

  const [aiConfig, setAiConfig] = React.useState<AiConfig>({
    llm: { source: 'gemini' },
    image: { source: 'gemini' }
  });
  const [isAiConfigOpen, setIsAiConfigOpen] = React.useState(false);
  const [isProcessingVision, setIsProcessingVision] = React.useState(false);
  const [visionConsent, setVisionConsent] = React.useState(false);
  const [currentLanguage, setCurrentLanguage] = React.useState<Language>('fr');
  const lang = i18n[currentLanguage];


  React.useEffect(() => {
    try {
      const savedAvatars = localStorage.getItem(AVATARS_STORAGE_KEY);
      const savedCurrentId = localStorage.getItem(CURRENT_AVATAR_ID_KEY);
      if (savedAvatars) {
        setAvatars(JSON.parse(savedAvatars));
      }
      if (savedCurrentId) {
        setCurrentAvatarId(JSON.parse(savedCurrentId));
      } else if (avatars.length > 0) {
        setCurrentAvatarId(avatars[0].id);
      }
      
      const savedStyles = localStorage.getItem("customImageStyles_v1");
      if (savedStyles) {
          setCustomStyles(JSON.parse(savedStyles));
      }
       const savedAiConfig = localStorage.getItem('globalAiConfig');
      if (savedAiConfig) {
        setAiConfig(JSON.parse(savedAiConfig));
      }
       const savedLanguage = localStorage.getItem('adventure_language') as Language;
      if (savedLanguage && i18n[savedLanguage]) {
          setCurrentLanguage(savedLanguage);
      }

    } catch (error) {
      console.error("Failed to load avatars from localStorage:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger les avatars.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);
  
  const handleAiConfigChange = (newConfig: AiConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('globalAiConfig', JSON.stringify(newConfig));
    toast({ title: "Configuration IA mise à jour."});
  };

  const saveAvatars = (updatedAvatars: PlayerAvatar[]) => {
    setAvatars(updatedAvatars);
    localStorage.setItem(AVATARS_STORAGE_KEY, JSON.stringify(updatedAvatars));
  };
  
  const handleDownloadAvatar = (avatar: PlayerAvatar) => {
    const jsonString = JSON.stringify(avatar, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${avatar.name.toLowerCase().replace(/\s/g, '_')}_avatar.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonString = e.target?.result as string;
            const newAvatar = JSON.parse(jsonString) as PlayerAvatar;

            if (!newAvatar.id || !newAvatar.name) {
                throw new Error("Fichier JSON invalide ou manquant de champs obligatoires.");
            }
            
            const isDuplicate = avatars.some(c => c.id === newAvatar.id || c.name.toLowerCase() === newAvatar.name.toLowerCase());
            if (isDuplicate) {
                 toast({ title: "Importation échouée", description: `Un avatar avec le nom ou l'ID "${newAvatar.name}" existe déjà.`, variant: "destructive" });
                 return;
            }

            const updatedAvatars = [...avatars, newAvatar];
            saveAvatars(updatedAvatars);
            toast({ title: "Avatar Importé", description: `"${newAvatar.name}" a été ajouté à votre liste.` });

        } catch (error) {
            console.error("Error loading avatar from JSON:", error);
            toast({ title: "Erreur d'Importation", description: `Impossible de lire le fichier JSON: ${error instanceof Error ? error.message : 'Format invalide'}.`, variant: "destructive" });
        }
    };
    reader.readAsText(file);
    if(event.target) event.target.value = '';
  }


  const handleSelectCurrentAvatar = (avatarId: string) => {
    setCurrentAvatarId(avatarId);
    localStorage.setItem(CURRENT_AVATAR_ID_KEY, JSON.stringify(avatarId));
    toast({title: "Avatar Actif Changé", description: `L'avatar "${avatars.find(a => a.id === avatarId)?.name}" est maintenant l'avatar par défaut.`});
  }

  const confirmDelete = () => {
    if (avatarToDelete) {
      const updatedAvatars = avatars.filter(a => a.id !== avatarToDelete.id);
      saveAvatars(updatedAvatars);
      if(currentAvatarId === avatarToDelete.id) {
        const newCurrent = updatedAvatars.length > 0 ? updatedAvatars[0].id : null;
        setCurrentAvatarId(newCurrent);
        if (newCurrent) {
           localStorage.setItem(CURRENT_AVATAR_ID_KEY, JSON.stringify(newCurrent));
        } else {
           localStorage.removeItem(CURRENT_AVATAR_ID_KEY);
        }
      }
      toast({ title: "Avatar Supprimé", description: `L'avatar "${avatarToDelete.name}" a été supprimé.` });
      setAvatarToDelete(null);
    }
  };
  
  const handleCreateAvatar = () => {
    if (!newAvatarData.name?.trim() || !newAvatarData.details?.trim()) {
        toast({ title: "Champs requis manquants", description: "Le nom et les détails sont obligatoires.", variant: "destructive" });
        return;
    }
    const newAvatar: PlayerAvatar = {
        id: uid(),
        portraitUrl: newAvatarData.portraitUrl || null,
        name: newAvatarData.name,
        details: newAvatarData.details,
        description: newAvatarData.description || '',
        orientation: newAvatarData.orientation || '',
    };
    const updatedAvatars = [...avatars, newAvatar];
    saveAvatars(updatedAvatars);
    if (!currentAvatarId) {
        handleSelectCurrentAvatar(newAvatar.id);
    }
    toast({ title: "Avatar Créé!", description: `Bienvenue à ${newAvatar.name}.` });
    setIsCreateModalOpen(false);
    setNewAvatarData({ name: '', details: '', description: '', orientation: '', portraitUrl: null });
  };

  const handleUpdateAvatar = () => {
      if (!editingAvatar) return;
      const updatedAvatars = avatars.map(a => a.id === editingAvatar.id ? editingAvatar : a);
      saveAvatars(updatedAvatars);
      toast({ title: "Avatar Mis à Jour", description: `Les informations de "${editingAvatar.name}" ont été sauvegardées.` });
      setEditingAvatar(null);
  };

  const handleSaveUrl = () => {
    const targetStateSetter = editingAvatar ? setEditingAvatar : setNewAvatarData;
    targetStateSetter(prev => prev ? { ...prev, portraitUrl: portraitUrlInput } : null);
    setIsUrlDialogOpen(false);
    setPortraitUrlInput("");
    toast({ title: "Portrait mis à jour", description: "L'URL du portrait a été enregistrée." });
  };
  
  const handleGeneratePortrait = async () => {
      const targetAvatar = editingAvatar || newAvatarData;
      if (!targetAvatar) return;
      
      setIsGeneratingPortrait(true);
      const prompt = `portrait of a hero named ${targetAvatar.name}. Description: ${targetAvatar.details}.`;
      try {
          const result = await generateSceneImage({ sceneDescription: {action: prompt, charactersInScene: []}, style: imageStyle }, aiConfig);
          if (result.imageUrl) {
              const targetStateSetter = editingAvatar ? setEditingAvatar : setNewAvatarData;
              targetStateSetter(prev => prev ? { ...prev, portraitUrl: result.imageUrl } : null);
              toast({ title: "Portrait Généré!", description: "Le nouveau portrait est affiché." });
          } else {
              throw new Error(result.error || "La génération d'image a échoué.");
          }
      } catch (error) {
           toast({ title: "Erreur de Génération", description: `Impossible de générer le portrait : ${error instanceof Error ? error.message : 'Erreur inconnue'}.`, variant: "destructive" });
      } finally {
          setIsGeneratingPortrait(false);
      }
  };

  const handleVisionScan = async (
      avatarData: Partial<PlayerAvatar>,
      setter: React.Dispatch<React.SetStateAction<any>>
  ) => {
      const imageUrl = avatarData.portraitUrl;
      if (!imageUrl) {
          toast({ title: "Image requise", description: "Veuillez fournir une image (URL ou téléversée) avant d'utiliser Vision.", variant: "destructive" });
          return;
      }
      setIsProcessingVision(true);
      try {
          const result = await describeAppearance({ portraitUrl: imageUrl, aiConfig });
          setter((prev: any) => ({ ...prev, details: result.description }));
          toast({ title: "Scan Réussi", description: "La description a été générée par l'IA." });
      } catch (error) {
          toast({ title: "Erreur de Vision", description: `Impossible de scanner l'image. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
      } finally {
          setIsProcessingVision(false);
      }
  };


  if (isLoading) {
    return <div className="text-center p-10">Chargement des avatars...</div>;
  }
  
  const renderAvatarEditor = (avatarData: Partial<PlayerAvatar>, setData: React.Dispatch<React.SetStateAction<any>>, isEditing: boolean) => (
    <div className="max-h-[70vh] overflow-y-auto p-1 space-y-4">
        <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24">
                {isGeneratingPortrait ? <div className="flex items-center justify-center h-full w-full"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div> :
                avatarData.portraitUrl ? <AvatarImage src={avatarData.portraitUrl} /> : <AvatarFallback className="text-3xl">{avatarData.name?.substring(0,2)}</AvatarFallback>}
            </Avatar>
            <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Palette className="h-4 w-4"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {defaultImageStyles.map(style => (
                                <DropdownMenuItem key={style.key} onSelect={() => setImageStyle(style.key)}>{lang[style.langKey as keyof typeof lang] || style.key}</DropdownMenuItem>
                            ))}
                            {customStyles.length > 0 && <DropdownMenuSeparator />}
                            {customStyles.map(style => (
                                    <DropdownMenuItem key={style.name} onSelect={() => setImageStyle(style.prompt)}>{style.name}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={handleGeneratePortrait} disabled={isGeneratingPortrait} className="w-full">
                        <Wand2 className="mr-2 h-4 w-4" /> {lang.generateButton}
                    </Button>
                </div>
                    <input type="file" accept="image/*" id={`upload-portrait-${isEditing ? 'edit' : 'create'}`} className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setData((p: any) => p ? {...p, portraitUrl: reader.result as string} : null);
                        reader.readAsDataURL(file);
                    }
                    }}/>
                    <div className="flex gap-2">
                    <Button variant="outline" className="w-full" onClick={() => document.getElementById(`upload-portrait-${isEditing ? 'edit' : 'create'}`)?.click()}>
                        <UploadCloud className="mr-2 h-4 w-4"/> {lang.uploadImage}
                    </Button>
                        <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon"><LinkIcon className="h-4 w-4"/></Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>{lang.setPortraitFromURLDialogTitle}</DialogTitle></DialogHeader>
                            <Input value={portraitUrlInput} onChange={e => setPortraitUrlInput(e.target.value)} placeholder="https://example.com/image.png"/>
                            <DialogFooter>
                                <Button variant="outline" onClick={()=>setIsUrlDialogOpen(false)}>{lang.cancelButton}</Button>
                                <Button onClick={handleSaveUrl}>{lang.saveURLButton}</Button>
                            </DialogFooter>
                        </DialogContent>
                        </Dialog>
                    </div>
            </div>
        </div>
        <div className="space-y-2">
            <Label>{lang.nameLabel}</Label>
            <Input value={avatarData.name || ''} onChange={e => setData((p: any) => ({...p, name: e.target.value}))} />
        </div>
        <div className="space-y-2">
            <Label>{lang.npcDetailsLabel} (Physique, Âge)</Label>
            <Textarea value={avatarData.details || ''} onChange={e => setData((p: any) => ({...p, details: e.target.value}))} rows={2}/>
            <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={() => handleVisionScan(avatarData, setData)} disabled={isProcessingVision || !avatarData.portraitUrl || !visionConsent} className="w-full">
                    {isProcessingVision ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Eye className="mr-2 h-4 w-4" />}
                    {lang.describeAppearanceTooltip}
                </Button>
                <Checkbox id={`vision-consent-${isEditing ? 'edit' : 'create'}`} checked={visionConsent} onCheckedChange={(checked) => setVisionConsent(!!checked)} />
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Label htmlFor={`vision-consent-${isEditing ? 'edit' : 'create'}`} className="cursor-pointer">
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
        <div className="space-y-2">
            <Label>{lang.publicDescriptionLabel} (Background)</Label>
            <Textarea value={avatarData.description || ''} onChange={e => setData((p: any) => ({...p, description: e.target.value}))} rows={3}/>
        </div>
            <div className="space-y-2">
            <Label>{lang.playerOrientation}</Label>
            <Input value={avatarData.orientation || ''} onChange={e => setData((p: any) => ({...p, orientation: e.target.value}))}/>
        </div>
    </div>
);


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{lang.playerAvatarsPageTitle}</h1>
        <div className="flex gap-2">
            <input type="file" ref={importFileRef} onChange={handleImportAvatar} accept=".json" className="hidden" />
           <Button variant="outline" onClick={() => importFileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> {lang.importAvatarButton}
          </Button>
            <Dialog open={isAiConfigOpen} onOpenChange={setIsAiConfigOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline"><BrainCircuit className="mr-2 h-4 w-4" /> {lang.aiConfigTitle}</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{lang.aiConfigTitle}</DialogTitle>
                        <DialogDescription>
                            Configurez les modèles d'IA utilisés pour la génération de texte et d'images.
                        </DialogDescription>
                    </DialogHeader>
                    <ModelManager config={aiConfig} onConfigChange={handleAiConfigChange} currentLanguage={currentLanguage} />
                </DialogContent>
            </Dialog>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" /> {lang.createAvatarButton}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Créer un nouvel Avatar</DialogTitle>
                </DialogHeader>
                 {renderAvatarEditor(newAvatarData, setNewAvatarData, false)}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{lang.cancelButton}</Button>
                    <Button onClick={handleCreateAvatar}>Créer l'Avatar</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">
        {lang.playerAvatarsPageDescription}
      </p>

      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {avatars.length > 0 ? (
            avatars.map((avatar) => (
              <Card key={avatar.id} className={avatar.id === currentAvatarId ? 'border-primary' : ''}>
                <CardHeader className="flex flex-row items-start gap-4">
                   <Avatar className="h-20 w-20">
                      {avatar.portraitUrl ? (
                        <AvatarImage src={avatar.portraitUrl} alt={avatar.name} data-ai-hint={`hero portrait`} />
                      ) : (
                        <AvatarFallback>{avatar.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                   <div className="flex-1">
                    <CardTitle>{avatar.name}</CardTitle>
                     <CardDescription>
                       {avatar.details}
                     </CardDescription>
                  </div>
                   {avatar.id === currentAvatarId && (
                     <TooltipProvider>
                       <Tooltip>
                         <TooltipTrigger>
                           <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                         </TooltipTrigger>
                         <TooltipContent>Avatar Actif</TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                   )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{avatar.description}</p>
                </CardContent>
                <CardFooter className="flex flex-wrap justify-end gap-2">
                    <Dialog open={editingAvatar?.id === avatar.id} onOpenChange={(open) => !open && setEditingAvatar(null)}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setEditingAvatar(JSON.parse(JSON.stringify(avatar)))}>
                                <Edit className="mr-2 h-4 w-4" /> {lang.editButton}
                            </Button>
                        </DialogTrigger>
                        {editingAvatar?.id === avatar.id && (
                           <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Modifier {editingAvatar.name}</DialogTitle>
                                </DialogHeader>
                                {renderAvatarEditor(editingAvatar, setEditingAvatar, true)}
                               <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingAvatar(null)}>{lang.cancelButton}</Button>
                                  <Button onClick={handleUpdateAvatar}><Save className="mr-2 h-4 w-4"/> {lang.saveButton}</Button>
                               </DialogFooter>
                           </DialogContent>
                        )}
                    </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" onClick={() => setAvatarToDelete(avatar)}>
                        <Trash2 className="mr-2 h-4 w-4" /> {lang.deleteButton}
                      </Button>
                    </AlertDialogTrigger>
                    {avatarToDelete?.id === avatar.id && (
                       <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la Suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer l'avatar "{avatarToDelete.name}" ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setAvatarToDelete(null)}>{lang.cancelButton}</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete}>{lang.deleteButton}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                    )}
                  </AlertDialog>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadAvatar(avatar)}>
                    <Download className="mr-2 h-4 w-4" /> {lang.downloadButton}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={avatar.id === currentAvatarId}
                    onClick={() => handleSelectCurrentAvatar(avatar.id)}
                  >
                    {lang.setDefaultButton}
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-10">
              Aucun avatar sauvegardé. Créez votre premier personnage !
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
