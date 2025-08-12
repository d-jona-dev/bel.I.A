
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, PawPrint, Download } from 'lucide-react';
import type { Familiar } from '@/types';
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

export default function FamiliersPage() {
  const { toast } = useToast();
  
  const [savedFamiliars, setSavedFamiliars] = React.useState<Familiar[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [familiarToDelete, setFamiliarToDelete] = React.useState<Familiar | null>(null);
  const importFileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    try {
      const familiarsFromStorage = localStorage.getItem('globalFamiliars');
      if (familiarsFromStorage) {
        setSavedFamiliars(JSON.parse(familiarsFromStorage));
      }
    } catch (error) {
      console.error("Failed to load familiars from localStorage:", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les familiers sauvegardés.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }, [toast]);

  const saveFamiliars = (updatedFamiliars: Familiar[]) => {
    setSavedFamiliars(updatedFamiliars);
    localStorage.setItem('globalFamiliars', JSON.stringify(updatedFamiliars));
  };

  const confirmDelete = () => {
    if (familiarToDelete) {
      const updatedFamiliars = savedFamiliars.filter(f => f.id !== familiarToDelete.id);
      saveFamiliars(updatedFamiliars);
      toast({
        title: "Familier Supprimé",
        description: `Le familier "${familiarToDelete.name}" a été supprimé de la sauvegarde globale.`,
      });
      setFamiliarToDelete(null);
    }
  };

  const handleDownloadFamiliar = (familiar: Familiar) => {
    const jsonString = JSON.stringify(familiar, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${familiar.name.toLowerCase().replace(/\s/g, '_')}_familiar.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFamiliar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonString = e.target?.result as string;
            const newFamiliar = JSON.parse(jsonString) as Familiar;

            if (!newFamiliar.id || !newFamiliar.name || !newFamiliar.rarity || !newFamiliar.passiveBonus) {
                throw new Error("Fichier JSON invalide ou manquant de champs obligatoires (id, name, rarity, passiveBonus).");
            }
            
            const isDuplicate = savedFamiliars.some(f => f.id === newFamiliar.id || f.name.toLowerCase() === newFamiliar.name.toLowerCase());
            if (isDuplicate) {
                 toast({ title: "Importation échouée", description: `Un familier avec le nom ou l'ID "${newFamiliar.name}" existe déjà.`, variant: "destructive" });
                 return;
            }

            const updatedFamiliars = [...savedFamiliars, newFamiliar];
            saveFamiliars(updatedFamiliars);
            toast({ title: "Familier Importé", description: `"${newFamiliar.name}" a été ajouté à votre collection.` });

        } catch (error) {
            console.error("Error loading familiar from JSON:", error);
            toast({ title: "Erreur d'Importation", description: `Impossible de lire le fichier JSON: ${error instanceof Error ? error.message : 'Format invalide'}.`, variant: "destructive" });
        }
    };
    reader.readAsText(file);
    if(event.target) event.target.value = '';
  }


  const rarityColorClass = (rarity: Familiar['rarity']) => {
    switch (rarity) {
      case 'common': return 'text-gray-500';
      case 'uncommon': return 'text-green-500';
      case 'rare': return 'text-blue-500';
      case 'epic': return 'text-purple-500';
      case 'legendary': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Familiers Sauvegardés</h1>
        <div>
          <input type="file" ref={importFileRef} onChange={handleImportFamiliar} accept=".json" className="hidden" />
          <Button variant="outline" onClick={() => importFileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importer
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">
        Gérez les familiers que vous avez sauvegardés. Vous pourrez les charger dans de nouvelles aventures.
      </p>

      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p className="text-muted-foreground col-span-full text-center py-10">Chargement des familiers...</p>
          ) : savedFamiliars.length > 0 ? (
            savedFamiliars.map((familiar) => (
              <Card key={familiar.id}>
                <CardHeader className="flex flex-row items-center gap-4">
                   <Avatar className="h-12 w-12">
                      {familiar.portraitUrl ? (
                        <AvatarImage src={familiar.portraitUrl} alt={familiar.name} data-ai-hint={`${familiar.name} portrait`} />
                      ) : (
                        <AvatarFallback><PawPrint /></AvatarFallback>
                      )}
                    </Avatar>
                   <div className="flex-1">
                    <CardTitle>{familiar.name}</CardTitle>
                    <CardDescription className={`capitalize font-semibold ${rarityColorClass(familiar.rarity)}`}>
                        {familiar.rarity}
                     </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{familiar.description}</p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownloadFamiliar(familiar)}>
                    <Download className="mr-2 h-4 w-4" /> Télécharger
                  </Button>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => setFamiliarToDelete(familiar)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      {familiarToDelete && familiarToDelete.id === familiar.id && (
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la Suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer définitivement "{familiarToDelete.name}" de vos sauvegardes globales ? Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setFamiliarToDelete(null)}>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete}>
                              Supprimer Définitivement
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      )}
                    </AlertDialog>
                </CardFooter>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-10">
              Aucun familier sauvegardé pour le moment.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
