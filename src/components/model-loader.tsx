"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, BrainCircuit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export function ModelLoader() {
  const [selectedModelPath, setSelectedModelPath] = React.useState<string | null>(null);
  const { toast } = useToast();

  const handleLoadModelClick = () => {
    // In a real Electron or Tauri app, this would open a directory picker.
    // For a web app, we simulate this and show a toast.
    // We cannot directly access local file systems from a standard web browser for security reasons.
    toast({
      title: "Chargement de Modèle (Simulation)",
      description: "Dans une application de bureau, cela ouvrirait un sélecteur de dossier pour charger un modèle local. Cette fonctionnalité n'est pas directement possible dans un navigateur web standard.",
      variant: "default",
    });
    // Simulate selecting a path for UI feedback
    setSelectedModelPath("Simulé : /chemin/vers/votre/modele");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" /> Modèle d'IA Local
        </CardTitle>
        <CardDescription>
          Chargez un modèle d'IA compatible depuis votre ordinateur.
          <br/>
          <span className="text-xs text-muted-foreground">(Fonctionnalité limitée dans le navigateur web)</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
         <Label>Modèle Actuel :</Label>
         <div className="text-sm p-2 border rounded bg-muted min-h-[40px] break-words">
            {selectedModelPath ? selectedModelPath : "Aucun modèle chargé"}
         </div>
        <Button onClick={handleLoadModelClick} variant="outline" className="w-full">
          <FolderOpen className="mr-2 h-4 w-4" />
          Charger un Modèle depuis un Dossier
        </Button>
      </CardContent>
    </Card>
  );
}
