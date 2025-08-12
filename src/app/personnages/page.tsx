
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


// Helper to generate a unique ID
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

interface CustomImageStyle {
  name: string;
  prompt: string;
}

const defaultImageStyles: Array<{ name: string; isDefault: true }> = [
    { name: "Par Défaut", isDefault: true },
    { name: "Réaliste", isDefault: true },
    { name: "Manga / Anime", isDefault: true },
    { name: "Fantaisie Epique", isDefault: true },
    { name: "Peinture à l'huile", isDefault: true },
    { name: "Comics", isDefault: true },
];


export default function PersonnagesPage() {
  const { toast } = useToast();
  
  const [savedNPCs, setSavedNPCs] = React.useState<Character[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [characterToDelete, setCharacterToDelete] = React.useState<Character | null>(null);

  // State for modals
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [editingCharacter, setEditingCharacter] = React.useState<Character | null>(null);
  const [newCharacterData, setNewCharacterData] = React.useState({ name: '', details: '', history: '', affinity: 50 });
  const [isGeneratingPortrait, setIsGeneratingPortrait] = React.useState(false);
  const importFileRef = React.useRef<HTMLInputElement>(null);

  const [isUrlDialogOpen, setIsUrlDialogOpen] = React.useState(false);
  const [portraitUrlInput, setPortraitUrlInput] = React.useState("");

  const [imageStyle, setImageStyle] = React.useState<string>("");
  const [customStyles, setCustomStyles] = React.useState<CustomImageStyle[]>([]);


  const loadCharactersFromStorage = () => {
     try {
      const charactersFromStorage = localStorage.getItem('globalCharacters');
      if (charactersFromStorage) {
        setSavedNPCs(JSON.parse(charactersFromStorage));
      }
      const savedStyles = localStorage.getItem("customImageStyles_v1");
      if (savedStyles) {
          setCustomStyles(JSON.parse(savedStyles));
      }
    } catch (error) {
      console.error("Failed to load characters from localStorage:", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les personnages sauvegardés.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }

  React.useEffect(() => {
    loadCharactersFromStorage();
  }, []);

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
                throw new Error("Fichier JSON invalide ou manquant de champs obligatoires.");
            }
            
            const isDuplicate = savedNPCs.some(c => c.id === newChar.id || c.name.toLowerCase() === newChar.name.toLowerCase());
            if (isDuplicate) {
                 toast({ title: "Importation échouée", description: `Un personnage avec le nom ou l'ID "${newChar.name}" existe déjà.`, variant: "destructive" });
                 return;
            }

            const updatedChars = [...savedNPCs, { ...newChar, _lastSaved: Date.now() }];
            saveCharactersToStorage(updatedChars);
            toast({ title: "Personnage Importé", description: `"${newChar.name}" a été ajouté à votre liste.` });

        } catch (error) {
            console.error("Error loading character from JSON:", error);
            toast({ title: "Erreur d'Importation", description: `Impossible de lire le fichier JSON: ${error instanceof Error ? error.message : 'Format invalide'}.`, variant: "destructive" });
        }
    };
    reader.readAsText(file);
    if(event.target) event.target.value = ''; // Reset for next upload
  }


  const handleCreateCharacter = () => {
    if (!newCharacterData.name.trim() || !newCharacterData.details.trim()) {
        toast({ title: "Champs requis manquants", description: "Le nom et les détails du personnage sont obligatoires.", variant: "destructive" });
        return;
    }

    const newChar: Character = {
        id: uid(),
        name: newCharacterData.name,
        details: newCharacterData.details,
        history: newCharacterData.history ? [newCharacterData.history] : [],
        affinity: newCharacterData.affinity,
        portraitUrl: null,
        relations: {},
        isAlly: false,
    };
    
    const updatedChars = [...savedNPCs, newChar];
    saveCharactersToStorage(updatedChars);
    toast({ title: "Personnage Créé", description: `"${newChar.name}" est maintenant prêt !` });
    setIsCreateModalOpen(false);
    setNewCharacterData({ name: '', details: '', history: '', affinity: 50 }); // Reset form
  }

  const handleUpdateCharacter = () => {
      if (!editingCharacter) return;
      const updatedChars = savedNPCs.map(c => c.id === editingCharacter.id ? editingCharacter : c);
      saveCharactersToStorage(updatedChars);
      toast({ title: "Personnage Mis à Jour", description: `Les informations de "${editingCharacter.name}" ont été sauvegardées.` });
      setEditingCharacter(null); // This will close the dialog
  }

  const handleGeneratePortraitForEditor = async () => {
    if (!editingCharacter) return;
    setIsGeneratingPortrait(true);
    
    const prompt = `portrait of ${editingCharacter.name}. Description: ${editingCharacter.details}. ${editingCharacter.characterClass ? `Class: ${editingCharacter.characterClass}.` : ''}`;

    try {
        const result = await generateSceneImage({ sceneDescription: prompt, style: imageStyle });
        if (result.imageUrl) {
            setEditingCharacter(prev => prev ? { ...prev, portraitUrl: result.imageUrl } : null);
            toast({ title: "Portrait Généré!", description: "Le nouveau portrait est affiché." });
        } else {
            throw new Error(result.error || "La génération d'image a échoué.");
        }
    } catch (error) {
         toast({ title: "Erreur de Génération", description: `Impossible de générer le portrait : ${error instanceof Error ? error.message : 'Erreur inconnue'}.`, variant: "destructive" });
    } finally {
        setIsGeneratingPortrait(false);
    }
  }

  const handleSaveUrl = () => {
    if (!editingCharacter) return;
    setEditingCharacter(prev => prev ? { ...prev, portraitUrl: portraitUrlInput } : null);
    setIsUrlDialogOpen(false);
    setPortraitUrlInput("");
    toast({ title: "Portrait mis à jour", description: "L'URL du portrait a été enregistrée." });
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Personnages Secondaires</h1>
        <div className="flex gap-2">
          <input type="file" ref={importFileRef} onChange={handleImportCharacter} accept=".json" className="hidden" />
          <Button variant="outline" onClick={() => importFileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importer un Personnage
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> Créer un Personnage
              </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Créer un Nouveau Personnage</DialogTitle>
                    <DialogDescription>
                        Remplissez les informations de base de votre personnage.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-char-name">Nom</Label>
                        <Input id="new-char-name" value={newCharacterData.name} onChange={e => setNewCharacterData({...newCharacterData, name: e.target.value})} placeholder="Ex: Rina, Kentaro..."/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-char-details">Détails (Description)</Label>
                        <Textarea id="new-char-details" value={newCharacterData.details} onChange={e => setNewCharacterData({...newCharacterData, details: e.target.value})} placeholder="Description physique, personnalité, rôle..."/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-char-history">Historique Initial (Optionnel)</Label>
                        <Textarea id="new-char-history" value={newCharacterData.history} onChange={e => setNewCharacterData({...newCharacterData, history: e.target.value})} placeholder="Comment le joueur l'a-t-il rencontré ?"/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="new-char-affinity">Affinité (avec le joueur)</Label>
                        <div className="flex items-center gap-4">
                            <Slider id="new-char-affinity" min={0} max={100} step={1} value={[newCharacterData.affinity]} onValueChange={value => setNewCharacterData({...newCharacterData, affinity: value[0]})}/>
                            <span className="text-sm font-medium w-8 text-center">{newCharacterData.affinity}</span>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Annuler</Button>
                    <Button onClick={handleCreateCharacter}>Créer le Personnage</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">
        Gérez les personnages secondaires que vous avez rencontrés ou créés. Vous pourrez les réutiliser dans d'autres aventures ou discuter avec eux.
      </p>

      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p className="text-muted-foreground col-span-full text-center py-10">Chargement des personnages...</p>
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
                        {npc.details || "Aucune description."}
                     </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Affinité&nbsp;: {npc.affinity ?? 'N/A'}
                  </p>
                </CardContent>
                <CardFooter className="flex flex-wrap justify-end gap-2">
                  <Dialog open={editingCharacter?.id === npc.id} onOpenChange={(open) => !open && setEditingCharacter(null)}>
                    <DialogTrigger asChild>
                       <Button variant="ghost" size="sm" onClick={() => setEditingCharacter(JSON.parse(JSON.stringify(npc)))}>
                        <Edit className="mr-2 h-4 w-4" /> Modifier
                      </Button>
                    </DialogTrigger>
                    {editingCharacter?.id === npc.id && (
                       <DialogContent className="max-w-3xl">
                          <DialogHeader>
                              <DialogTitle>Modifier {editingCharacter.name}</DialogTitle>
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
                                                    <DropdownMenuItem key={style.name} onSelect={() => setImageStyle(style.name === "Par Défaut" ? "" : style.name)}>{style.name}</DropdownMenuItem>
                                                ))}
                                                {customStyles.length > 0 && <DropdownMenuSeparator />}
                                                {customStyles.map(style => (
                                                        <DropdownMenuItem key={style.name} onSelect={() => setImageStyle(style.prompt)}>{style.name}</DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button onClick={handleGeneratePortraitForEditor} disabled={isGeneratingPortrait} className="w-full">
                                            <Wand2 className="mr-2 h-4 w-4" /> Générer
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
                                            <UploadCloud className="mr-2 h-4 w-4"/> Télécharger
                                        </Button>
                                        <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="icon"><LinkIcon className="h-4 w-4"/></Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>Définir le portrait depuis une URL</DialogTitle></DialogHeader>
                                                <Input value={portraitUrlInput} onChange={e => setPortraitUrlInput(e.target.value)} placeholder="https://example.com/image.png"/>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={()=>setIsUrlDialogOpen(false)}>Annuler</Button>
                                                    <Button onClick={handleSaveUrl}>Enregistrer</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                             </div>
                             <div className="space-y-2">
                                <Label>Nom</Label>
                                <Input value={editingCharacter.name} onChange={e => setEditingCharacter({...editingCharacter!, name: e.target.value})} />
                             </div>
                             <div className="space-y-2">
                                <Label>Détails</Label>
                                <Textarea value={editingCharacter.details} onChange={e => setEditingCharacter({...editingCharacter!, details: e.target.value})} rows={4}/>
                             </div>
                              <div className="space-y-2">
                                <Label>Historique</Label>
                                 <ScrollArea className="h-24 border rounded-md p-2">
                                 {editingCharacter.history && editingCharacter.history.map((entry, index) => (
                                      <Textarea key={index} value={entry} className="mb-2" onChange={e => {
                                          const newHistory = [...(editingCharacter!.history || [])];
                                          newHistory[index] = e.target.value;
                                          setEditingCharacter({...editingCharacter!, history: newHistory});
                                      }}/>
                                  ))}
                                  </ScrollArea>
                                   <Button variant="outline" size="sm" onClick={() => setEditingCharacter({...editingCharacter!, history: [...(editingCharacter!.history || []), ""]})}>Ajouter entrée</Button>
                             </div>
                              <div className="space-y-2">
                                <Label>Affinité (avec le joueur) : {editingCharacter.affinity}</Label>
                                <Slider min={0} max={100} step={1} value={[editingCharacter.affinity || 50]} onValueChange={value => setEditingCharacter({...editingCharacter!, affinity: value[0]})}/>
                             </div>
                          </div>
                           <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingCharacter(null)}>Annuler</Button>
                              <Button onClick={handleUpdateCharacter}><Save className="mr-2 h-4 w-4"/> Enregistrer</Button>
                           </DialogFooter>
                       </DialogContent>
                    )}
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" onClick={() => setCharacterToDelete(npc)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    {characterToDelete?.id === npc.id && (
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmer la Suppression</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer définitivement "{characterToDelete.name}" de vos sauvegardes globales ? Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setCharacterToDelete(null)}>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmDelete}>
                            Supprimer Définitivement
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
                        <MessageSquare className="mr-2 h-4 w-4" /> Chatter
                      </Button>
                    </Link>
                </CardFooter>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-10">
              Aucun personnage secondaire sauvegardé pour le moment.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
