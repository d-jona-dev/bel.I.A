
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Edit, UserPlus, MessageSquare, Download, Save, Wand2, Link as LinkIcon, Palette, UploadCloud } from 'lucide-react';
import type { Character } from '@/types';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { generateSceneImage } from '@/ai/flows/generate-scene-image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2 } from 'lucide-react';
import { defaultImageStyles, type ImageStyle } from '@/lib/image-styles';
import { i18n, type Language } from '@/lib/i18n';

// Helper to generate a unique ID
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

interface CustomImageStyle {
  name: string;
  prompt: string;
}


export default function PersonnagesPage() {
  const { toast } = useToast();
  
  const [savedNPCs, setSavedNPCs] = React.useState<Character[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [characterToDelete, setCharacterToDelete] = React.useState<Character | null>(null);

  // State for modals
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [editingCharacter, setEditingCharacter] = React.useState<Character | null>(null);
  const [newCharacterData, setNewCharacterData] = React.useState<Partial<Character>>({ name: '', details: '', affinity: 50, relations: { player: "Inconnu" } });
  const [isGeneratingPortrait, setIsGeneratingPortrait] = React.useState(false);
  const importFileRef = React.useRef<HTMLInputElement>(null);

  const [isUrlDialogOpen, setIsUrlDialogOpen] = React.useState(false);
  const [portraitUrlInput, setPortraitUrlInput] = React.useState("");

  const [imageStyle, setImageStyle] = React.useState<string>('default');
  const [customStyles, setCustomStyles] = React.useState<CustomImageStyle[]>([]);
  const [currentLanguage, setCurrentLanguage] = React.useState<Language>('fr');
  const lang = i18n[currentLanguage] || i18n.fr;

  React.useEffect(() => {
    try {
      const charactersFromStorage = localStorage.getItem('globalCharacters');
      if (charactersFromStorage) {
        setSavedNPCs(JSON.parse(charactersFromStorage));
      }
      const savedStyles = localStorage.getItem("customImageStyles_v1");
      if (savedStyles) {
          setCustomStyles(JSON.parse(savedStyles));
      }
      const savedLanguage = localStorage.getItem('adventure_language') as Language;
      if (savedLanguage && i18n[savedLanguage]) {
          setCurrentLanguage(savedLanguage);
      }
    } catch (error) {
      console.error("Failed to load characters from localStorage:", error);
      toast({
        title: lang.loadingErrorTitle,
        description: lang.loadingErrorDescription,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }, [toast, lang]);


  const saveCharactersToStorage = (characters: Character[]) => {
    localStorage.setItem('globalCharacters', JSON.stringify(characters));
    setSavedNPCs(characters);
  };

  const confirmDelete = () => {
    if (characterToDelete) {
      const updatedCharacters = savedNPCs.filter(c => c.id !== characterToDelete.id);
      saveCharactersToStorage(updatedCharacters);
      toast({
        title: "Personnage Supprimé",
        description: `Le personnage "${characterToDelete.name}" a été supprimé de la sauvegarde globale.`,
      });
      setCharacterToDelete(null);
    }
  };
  
  const handleDownloadCharacter = (character: Character) => {
    const jsonString = JSON.stringify(character, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name.toLowerCase().replace(/\s/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleImportCharacter = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonString = e.target?.result as string;
            const newChar = JSON.parse(jsonString) as Character;

            if (!newChar.id || !newChar.name || !newChar.details) {
                throw new Error(lang.invalidJsonFile);
            }
            
            const isDuplicate = savedNPCs.some(c => c.id === newChar.id || c.name.toLowerCase() === newChar.name.toLowerCase());
            if (isDuplicate) {
                 toast({ title: lang.importErrorTitle, description: lang.importDuplicateError.replace('{charName}', newChar.name), variant: "destructive" });
                 return;
            }

            const updatedChars = [...savedNPCs, { ...newChar, _lastSaved: Date.now() }];
            saveCharactersToStorage(updatedChars);
            toast({ title: lang.characterImportedTitle, description: `"${newChar.name}" ${lang.characterAddedToList}` });

        } catch (error) {
            console.error("Error loading character from JSON:", error);
            toast({ title: lang.importErrorTitle, description: `${lang.jsonReadError}: ${error instanceof Error ? error.message : lang.invalidFormat}`, variant: "destructive" });
        }
    };
    reader.readAsText(file);
    if(event.target) event.target.value = ''; // Reset for next upload
  }


  const handleCreateCharacter = () => {
    if (!newCharacterData.name?.trim() || !newCharacterData.details?.trim()) {
        toast({ title: lang.requiredFieldsMissing, description: lang.nameAndDetailsRequired, variant: "destructive" });
        return;
    }

    const newChar: Character = {
        id: uid(),
        name: newCharacterData.name,
        details: newCharacterData.details,
        history: newCharacterData.history || [],
        affinity: newCharacterData.affinity,
        biographyNotes: newCharacterData.biographyNotes,
        appearanceDescription: newCharacterData.appearanceDescription,
        portraitUrl: null,
        relations: { player: newCharacterData.relations?.player || "Inconnu" },
        isAlly: false,
    };
    
    const updatedChars = [...savedNPCs, newChar];
    saveCharactersToStorage(updatedChars);
    toast({ title: lang.characterCreatedTitle, description: `"${newChar.name}" ${lang.characterCreatedSuccess}` });
    setIsCreateModalOpen(false);
    setNewCharacterData({ name: '', details: '', affinity: 50, relations: { player: "Inconnu" } });
  }

  const handleUpdateCharacter = () => {
      if (!editingCharacter) return;
      const updatedChars = savedNPCs.map(c => c.id === editingCharacter.id ? editingCharacter : c);
      saveCharactersToStorage(updatedChars);
      toast({ title: lang.characterUpdatedTitle, description: lang.characterInfoSaved.replace('{charName}', editingCharacter.name) });
      setEditingCharacter(null); // This will close the dialog
  }

  const handleGeneratePortraitForEditor = async () => {
    if (!editingCharacter) return;
    setIsGeneratingPortrait(true);
    
    const prompt = `portrait of ${editingCharacter.name}. Description: ${editingCharacter.details}. ${editingCharacter.characterClass ? `Class: ${editingCharacter.characterClass}.` : ''}`;

    try {
        const result = await generateSceneImage({ sceneDescription: { action: prompt, charactersInScene: [] }, style: imageStyle });
        if (result.imageUrl) {
            setEditingCharacter(prev => prev ? { ...prev, portraitUrl: result.imageUrl } : null);
            toast({ title: lang.portraitGeneratedTitle, description: lang.newPortraitDisplayed });
        } else {
            throw new Error(result.error || lang.imageGenerationFailed);
        }
    } catch (error) {
         toast({ title: lang.generationErrorTitle, description: `${lang.portraitGenerationError} ${error instanceof Error ? error.message : lang.unknownError}.`, variant: "destructive" });
    } finally {
        setIsGeneratingPortrait(false);
    }
  }

  const handleSaveUrl = () => {
    if (!editingCharacter) return;
    setEditingCharacter(prev => prev ? { ...prev, portraitUrl: portraitUrlInput } : null);
    setIsUrlDialogOpen(false);
    setPortraitUrlInput("");
    toast({ title: lang.portraitUpdatedTitle, description: lang.portraitUrlSaved });
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{lang.secondaryCharactersPageTitle}</h1>
        <div className="flex gap-2">
          <input type="file" ref={importFileRef} onChange={handleImportCharacter} accept=".json" className="hidden" />
          <Button variant="outline" onClick={() => importFileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> {lang.importCharacterButton}
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> {lang.createCharacterButton}
              </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{lang.createNewCharacterTitle}</DialogTitle>
                    <DialogDescription>
                        {lang.fillBasicInfo}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-char-name">{lang.nameLabel}</Label>
                        <Input id="new-char-name" value={newCharacterData.name || ''} onChange={e => setNewCharacterData({...newCharacterData, name: e.target.value})} placeholder={lang.npcNamePlaceholder}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-char-details">{lang.npcDetailsLabel}</Label>
                        <Textarea id="new-char-details" value={newCharacterData.details || ''} onChange={e => setNewCharacterData({...newCharacterData, details: e.target.value})} placeholder={lang.npcDetailsPlaceholder}/>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{lang.cancelButton}</Button>
                    <Button onClick={handleCreateCharacter}>{lang.createCharacterConfirmButton}</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">
        {lang.secondaryCharactersPageDescription}
      </p>

      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p className="text-muted-foreground col-span-full text-center py-10">{lang.loadingCharacters}</p>
          ) : savedNPCs.length > 0 ? (
            savedNPCs.map((npc) => (
              <Card key={npc.id}>
                <CardHeader className="flex flex-row items-center gap-4">
                   <Avatar className="h-12 w-12">
                      {npc.portraitUrl ? (
                        <AvatarImage src={npc.portraitUrl} alt={npc.name} data-ai-hint={`${npc.name} npc portrait`} />
                      ) : (
                        <AvatarFallback>{npc.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                   <div className="flex-1">
                    <CardTitle>{npc.name}</CardTitle>
                     <CardDescription className="line-clamp-1">
                        {npc.details || lang.noDescription}
                     </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {lang.affinityVsPlayer}: {npc.affinity ?? 'N/A'}
                  </p>
                </CardContent>
                <CardFooter className="flex flex-wrap justify-end gap-2">
                  <Dialog open={editingCharacter?.id === npc.id} onOpenChange={(open) => !open && setEditingCharacter(null)}>
                    <DialogTrigger asChild>
                       <Button variant="ghost" size="sm" onClick={() => setEditingCharacter(JSON.parse(JSON.stringify(npc)))}>
                        <Edit className="mr-2 h-4 w-4" /> {lang.editButton}
                      </Button>
                    </DialogTrigger>
                    {editingCharacter?.id === npc.id && (
                       <DialogContent className="max-w-3xl">
                          <DialogHeader>
                              <DialogTitle>{lang.editCharacterTitle} {editingCharacter.name}</DialogTitle>
                          </DialogHeader>
                          <div className="max-h-[70vh] overflow-y-auto p-1 space-y-4">
                             <div className="flex items-center gap-4">
                                <Avatar className="h-24 w-24">
                                    {isGeneratingPortrait ? <div className="flex items-center justify-center h-full w-full"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div> :
                                    editingCharacter.portraitUrl ? <AvatarImage src={editingCharacter.portraitUrl} /> : <AvatarFallback className="text-3xl">{editingCharacter.name.substring(0,2)}</AvatarFallback>}
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
                                        <Button onClick={handleGeneratePortraitForEditor} disabled={isGeneratingPortrait} className="w-full">
                                            <Wand2 className="mr-2 h-4 w-4" /> {lang.generateButton}
                                        </Button>
                                    </div>
                                    <input type="file" accept="image/*" id={`upload-edit-portrait-${npc.id}`} className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => setEditingCharacter(p => p ? {...p, portraitUrl: reader.result as string} : null);
                                            reader.readAsDataURL(file);
                                        }
                                    }}/>
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="w-full" onClick={() => document.getElementById(`upload-edit-portrait-${npc.id}`)?.click()}>
                                            <UploadCloud className="mr-2 h-4 w-4"/> {lang.uploadImage}
                                        </Button>
                                        <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="icon"><LinkIcon className="h-4 w-4"/></Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>{lang.setPortraitFromURLDialogTitle}</DialogTitle></DialogHeader>
                                                <Input value={portraitUrlInput} onChange={e => setPortraitUrlInput(e.target.value)} placeholder={lang.imageURLInputPlaceholder}/>
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
                                <Input value={editingCharacter.name} onChange={e => setEditingCharacter({...editingCharacter!, name: e.target.value})} />
                             </div>
                             <div className="space-y-2">
                                <Label>{lang.npcDetailsLabel}</Label>
                                <Textarea value={editingCharacter.details} onChange={e => setEditingCharacter({...editingCharacter!, details: e.target.value})} rows={4}/>
                             </div>
                             <div className="space-y-2">
                                <Label>{lang.biographyLabel}</Label>
                                <Textarea value={editingCharacter.biographyNotes || ''} onChange={e => setEditingCharacter({...editingCharacter!, biographyNotes: e.target.value})} rows={3} placeholder={lang.biographyPlaceholder}/>
                              </div>
                               <div className="space-y-2">
                                <Label>{lang.appearanceDescriptionLabel}</Label>
                                <Textarea value={editingCharacter.appearanceDescription || ''} onChange={e => setEditingCharacter({...editingCharacter!, appearanceDescription: e.target.value})} rows={4} placeholder={lang.appearanceDescriptionPlaceholder}/>
                              </div>
                              <div className="space-y-2">
                                <Label>{lang.defaultRelationLabel}</Label>
                                <Input value={editingCharacter.relations?.player || 'Inconnu'} onChange={e => setEditingCharacter({...editingCharacter!, relations: {...editingCharacter!.relations, player: e.target.value}})} placeholder={lang.relationPlaceholder}/>
                             </div>
                              <div className="space-y-2">
                                <Label>{lang.defaultAffinityLabel} {editingCharacter.affinity}</Label>
                                <Slider min={0} max={100} step={1} value={[editingCharacter.affinity || 50]} onValueChange={value => setEditingCharacter({...editingCharacter!, affinity: value[0]})}/>
                             </div>
                          </div>
                           <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingCharacter(null)}>{lang.cancelButton}</Button>
                              <Button onClick={handleUpdateCharacter}><Save className="mr-2 h-4 w-4"/> {lang.saveButton}</Button>
                           </DialogFooter>
                       </DialogContent>
                    )}
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" onClick={() => setCharacterToDelete(npc)}>
                        <Trash2 className="mr-2 h-4 w-4" /> {lang.deleteButton}
                      </Button>
                    </AlertDialogTrigger>
                    {characterToDelete?.id === npc.id && (
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{lang.confirmDeletion}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {lang.deleteCharacterConfirmation.replace('{charName}', characterToDelete.name)}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setCharacterToDelete(null)}>{lang.cancelButton}</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmDelete}>
                            {lang.deletePermanentlyButton}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    )}
                  </AlertDialog>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadCharacter(npc)}>
                    <Download className="mr-2 h-4 w-4" />
                  </Button>
                  <Link href={`/chat/${npc.id}`}>
                      <Button variant="default" size="sm">
                        <MessageSquare className="mr-2 h-4 w-4" /> {lang.chatButton}
                      </Button>
                    </Link>
                </CardFooter>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-10">
              {lang.noGlobalCharacters}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
