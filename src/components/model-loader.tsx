
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, BrainCircuit, KeyRound, Link as LinkIcon } from "lucide-react"; // Added icons
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // Added Input import
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Added RadioGroup import

type ModelSource = "local" | "url" | "api";

export function ModelLoader() {
  const [modelSource, setModelSource] = React.useState<ModelSource>("local");
  const [localModelPath, setLocalModelPath] = React.useState<string | null>(null);
  const [modelUrl, setModelUrl] = React.useState<string>("");
  const [apiKey, setApiKey] = React.useState<string>("");
  const { toast } = useToast();

  const handleLoadLocalModelClick = () => {
    // In a real Electron or Tauri app, this would open a directory picker.
    // For a web app, we simulate this and show a toast.
    toast({
      title: "Chargement de Modèle Local (Simulation)",
      description: "Dans une application de bureau, cela ouvrirait un sélecteur de dossier pour charger un modèle local. Cette fonctionnalité n'est pas directement possible dans un navigateur web standard.",
      variant: "default",
    });
    // Simulate selecting a path for UI feedback
    setLocalModelPath("Simulé : /chemin/vers/votre/modele");
  };

  const handleSaveSettings = () => {
    // TODO: Implement saving logic (e.g., to localStorage or backend)
    console.log("Saving AI settings:", { modelSource, localModelPath, modelUrl, apiKey });
    toast({
      title: "Paramètres IA Sauvegardés",
      description: "Vos préférences pour le modèle d'IA ont été enregistrées.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" /> Configuration IA
        </CardTitle>
        <CardDescription>
          Choisissez la source et configurez le modèle d'IA à utiliser pour la génération.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={modelSource} onValueChange={(value) => setModelSource(value as ModelSource)}>
           <Label className="mb-2 block">Source du Modèle :</Label>
           <div className="flex items-center space-x-2">
                <RadioGroupItem value="local" id="local" />
                <Label htmlFor="local" className="font-normal flex items-center gap-1"><FolderOpen className="h-4 w-4"/> Dossier Local</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="url" id="url" />
                <Label htmlFor="url" className="font-normal flex items-center gap-1"><LinkIcon className="h-4 w-4"/> URL (LM Studio, etc.)</Label>
            </div>
             <div className="flex items-center space-x-2">
                <RadioGroupItem value="api" id="api" />
                <Label htmlFor="api" className="font-normal flex items-center gap-1"><KeyRound className="h-4 w-4"/> Clé API (Google AI, etc.)</Label>
            </div>
        </RadioGroup>

        {modelSource === 'local' && (
            <div className="space-y-2 pt-2">
                 <Label>Modèle Local Actuel :</Label>
                 <div className="text-sm p-2 border rounded bg-muted min-h-[40px] break-words">
                    {localModelPath ? localModelPath : "Aucun modèle local chargé"}
                 </div>
                <Button onClick={handleLoadLocalModelClick} variant="outline" className="w-full">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Charger un Modèle Local
                </Button>
                 <p className="text-xs text-muted-foreground pt-1">
                    Le chargement depuis un dossier local est simulé dans le navigateur web.
                 </p>
            </div>
        )}

        {modelSource === 'url' && (
            <div className="space-y-2 pt-2">
                <Label htmlFor="model-url">URL du Modèle</Label>
                <Input
                    id="model-url"
                    type="url"
                    placeholder="http://localhost:1234/v1"
                    value={modelUrl}
                    onChange={(e) => setModelUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground pt-1">
                    Entrez l'URL de base de votre serveur d'inférence local (ex: LM Studio).
                 </p>
            </div>
        )}

        {modelSource === 'api' && (
            <div className="space-y-2 pt-2">
                <Label htmlFor="api-key">Clé API</Label>
                <Input
                    id="api-key"
                    type="password"
                    placeholder="Entrez votre clé API..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                 />
                 {/* TODO: Add a Select dropdown to choose the API provider (Gemini, OpenAI, etc.) */}
                 <p className="text-xs text-muted-foreground pt-1">
                    Utilisé pour les services d'IA hébergés comme Google AI.
                 </p>
            </div>
        )}

         <Button onClick={handleSaveSettings} className="w-full mt-4">
            Enregistrer Configuration IA
         </Button>

      </CardContent>
    </Card>
  );
}
