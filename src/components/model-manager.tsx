
"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Trash2, Edit2, Check, X, Loader2, Server, Folder, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AiConfig, ModelDefinition } from "@/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";


const DEFAULT_MODELS: ModelDefinition[] = [
    { id: 'gemini-default', name: 'Gemini (Google)', source: 'gemini' },
    { id: 'openrouter-mistral-7b', name: 'Mistral 7B (OpenRouter)', source: 'openrouter', modelName: 'mistralai/mistral-7b-instruct:free' },
    { id: 'openrouter-llama3-8b', name: 'Llama3 8B (OpenRouter)', source: 'openrouter', modelName: 'meta-llama/llama-3-8b-instruct:free' },
    { id: 'openrouter-command-r', name: 'Command R (OpenRouter)', source: 'openrouter', modelName: 'cohere/command-r' },
];

interface ModelManagerProps {
  config: AiConfig;
  onConfigChange: (newConfig: AiConfig) => void;
}

export function ModelManager({ config, onConfigChange }: ModelManagerProps) {
  const { toast } = useToast();
  const [models, setModels] = React.useState<ModelDefinition[]>([]);
  const [editingModel, setEditingModel] = React.useState<ModelDefinition | null>(null);
  const [localModels, setLocalModels] = React.useState<string[]>([]);
  const [isLocalServerLoading, setIsLocalServerLoading] = React.useState(true);
  const [localServerError, setLocalServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const storedModels = localStorage.getItem('llm_models');
      if (storedModels) {
        setModels(JSON.parse(storedModels));
      } else {
        setModels(DEFAULT_MODELS);
      }
    } catch (error) {
        console.error("Failed to load models from localStorage", error);
        setModels(DEFAULT_MODELS);
    }

    // Fetch local models
    const fetchLocalModels = async () => {
        try {
            const response = await fetch('http://localhost:9000/api/local-llm/models');
            if (!response.ok) {
                throw new Error("Le serveur LLM local ne répond pas. Veuillez le démarrer.");
            }
            const data = await response.json();
            setLocalModels(data.models || []);
            setLocalServerError(null);
        } catch (error) {
            console.warn("Could not fetch local models:", error);
            setLocalServerError(error instanceof Error ? error.message : "Erreur inconnue");
        } finally {
            setIsLocalServerLoading(false);
        }
    };
    fetchLocalModels();

  }, []);

  const saveModels = (updatedModels: ModelDefinition[]) => {
    setModels(updatedModels);
    localStorage.setItem('llm_models', JSON.stringify(updatedModels));
  };

  const handleOpenRouterConfigChange = (field: keyof NonNullable<AiConfig['openRouter']>, value: string | boolean) => {
    const newConfig: AiConfig = {
      ...config,
      openRouter: {
        ...(config.openRouter || { model: '', apiKey: '', enforceStructuredResponse: false, compatibilityMode: false }),
        [field]: value
      }
    };
    onConfigChange(newConfig);

    const selectedModel = models.find(m => m.source === 'openrouter' && m.modelName === config.openRouter?.model);
    if (selectedModel) {
        const updatedModels = models.map(m => {
            if (m.id === selectedModel.id) {
                return { ...m, [field]: value };
            }
            return m;
        });
        saveModels(updatedModels);
    }
  };


  const handleSelectModelSource = (source: 'gemini' | 'openrouter' | 'local') => {
    let newConfig: AiConfig = { ...config, source };

    if (source === 'gemini') {
        onConfigChange(newConfig);
    } else if (source === 'openrouter') {
        const firstOpenRouterModel = models.find(m => m.source === 'openrouter');
        newConfig.openRouter = {
            apiKey: firstOpenRouterModel?.apiKey || config.openRouter?.apiKey || '',
            model: firstOpenRouterModel?.modelName || '',
            enforceStructuredResponse: firstOpenRouterModel?.enforceStructuredResponse ?? false,
            compatibilityMode: firstOpenRouterModel?.compatibilityMode ?? false,
        };
        onConfigChange(newConfig);
    } else if (source === 'local') {
        newConfig.local = {
            model: localModels[0] || ''
        };
        onConfigChange(newConfig);
    }
  };
  
  const handleSelectLocalModel = (modelName: string) => {
      onConfigChange({
          ...config,
          source: 'local',
          local: { model: modelName }
      });
  }


  const handleAddNewModel = () => {
    setEditingModel({ id: `new-${Date.now()}`, name: '', source: 'openrouter', modelName: '' });
  };

  const handleSaveModel = () => {
    if (!editingModel || !editingModel.name || !editingModel.modelName) {
        toast({ title: "Erreur", description: "Le nom et l'identifiant du modèle sont requis.", variant: 'destructive' });
        return;
    }
    const isNew = editingModel.id.startsWith('new-');
    let updatedModels: ModelDefinition[];

    if (isNew) {
        const newModel = { ...editingModel, id: `${editingModel.source}-${editingModel.modelName}-${Date.now()}` };
        updatedModels = [...models, newModel];
    } else {
        updatedModels = models.map(m => m.id === editingModel.id ? editingModel : m);
    }
    saveModels(updatedModels);
    setEditingModel(null);
  };
  
  const handleDeleteModel = (modelId: string) => {
    const updatedModels = models.filter(m => m.id !== modelId);
    saveModels(updatedModels);
  };
  
  const selectedModelId = config.source === 'gemini' 
    ? models.find(m => m.source === 'gemini')?.id
    : models.find(m => m.source === 'openrouter' && m.modelName === config.openRouter?.model)?.id;

  return (
    <Card className="bg-muted/20 border-dashed">
        <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="model-source-select">Source du Modèle</Label>
              <Select value={config.source} onValueChange={(value) => handleSelectModelSource(value as any)}>
                  <SelectTrigger id="model-source-select">
                      <SelectValue placeholder="Choisir une source..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="gemini">Gemini (Google)</SelectItem>
                      <SelectItem value="openrouter">OpenRouter (API Externe)</SelectItem>
                      <SelectItem value="local">Local (llama.cpp)</SelectItem>
                  </SelectContent>
              </Select>
            </div>

            {config.source === 'openrouter' && (
                <div className="space-y-3 p-3 border bg-background rounded-md">
                    <Label>Configuration OpenRouter</Label>
                     <Select value={selectedModelId} onValueChange={(modelId) => {
                        const selected = models.find(m => m.id === modelId);
                        if (selected && selected.source === 'openrouter') {
                            onConfigChange({
                                source: 'openrouter',
                                openRouter: {
                                    apiKey: selected.apiKey || config.openRouter?.apiKey || '',
                                    model: selected.modelName || '',
                                    enforceStructuredResponse: selected.enforceStructuredResponse ?? false,
                                    compatibilityMode: selected.compatibilityMode ?? false,
                                }
                            });
                        }
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choisir un modèle OpenRouter..."/>
                        </SelectTrigger>
                        <SelectContent>
                            {models.filter(m => m.source === 'openrouter').map(model => (
                                <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="password"
                        placeholder="Clé API OpenRouter"
                        value={config.openRouter?.apiKey || ''}
                        onChange={(e) => handleOpenRouterConfigChange('apiKey', e.target.value)}
                    />
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="structured-response-switch"
                            checked={config.openRouter?.enforceStructuredResponse || false}
                            onCheckedChange={(checked) => handleOpenRouterConfigChange('enforceStructuredResponse', checked)}
                        />
                        <Label htmlFor="structured-response-switch">Forcer la réponse structurée (JSON)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="compatibility-mode-switch"
                            checked={config.openRouter?.compatibilityMode || false}
                            onCheckedChange={(checked) => handleOpenRouterConfigChange('compatibilityMode', checked)}
                        />
                        <Label htmlFor="compatibility-mode-switch">Mode de compatibilité (pour Mistral, etc.)</Label>
                    </div>
                </div>
            )}
            
            {config.source === 'local' && (
                 <div className="space-y-3 p-3 border bg-background rounded-md">
                     <Label>Configuration Locale (llama.cpp)</Label>
                      {isLocalServerLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Recherche de modèles locaux...</div>
                      ) : localServerError ? (
                          <div className="p-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 mt-0.5"/>
                              <div>
                                 <p className="font-semibold">Erreur du serveur local</p>
                                 <p>{localServerError}</p>
                                 <p className="text-xs mt-1">Assurez-vous que le serveur est lancé via `npm run local-llm`.</p>
                              </div>
                          </div>
                      ) : localModels.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground bg-muted/50 border rounded-md flex items-start gap-2">
                                <Folder className="h-4 w-4 mt-0.5"/>
                                <div>
                                    <p className="font-semibold">Aucun modèle local trouvé.</p>
                                    <p>Veuillez placer vos modèles `.gguf` dans le dossier <code className="font-mono text-xs bg-muted p-0.5 rounded-sm">models</code> à la racine du projet.</p>
                                </div>
                            </div>
                      ) : (
                        <Select value={config.local?.model || ''} onValueChange={handleSelectLocalModel}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choisir un modèle local..."/>
                            </SelectTrigger>
                            <SelectContent>
                                {localModels.map(modelName => (
                                    <SelectItem key={modelName} value={modelName}>{modelName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      )}
                 </div>
            )}

            <Accordion type="single" collapsible>
                <AccordionItem value="manage-models">
                    <AccordionTrigger className="text-sm">Gérer la liste des modèles OpenRouter</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                        {models.filter(m => m.source === 'openrouter').map(model => (
                            <div key={model.id} className={cn("flex items-center gap-2 p-2 border rounded-md", editingModel?.id === model.id ? "bg-muted/50" : "bg-background")}>
                                {editingModel?.id === model.id ? (
                                    <>
                                        <Input value={editingModel.name} onChange={e => setEditingModel({...editingModel, name: e.target.value})} placeholder="Nom affiché" className="h-8"/>
                                        <Input value={editingModel.modelName} onChange={e => setEditingModel({...editingModel, modelName: e.target.value})} placeholder="Identifiant modèle" className="h-8"/>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveModel}><Check className="h-4 w-4"/></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingModel(null)}><X className="h-4 w-4"/></Button>
                                    </>
                                ) : (
                                    <>
                                        <p className="flex-1 text-sm truncate">{model.name}</p>
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingModel(model)}><Edit2 className="h-4 w-4"/></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteModel(model.id)}><Trash2 className="h-4 w-4"/></Button>
                                    </>
                                )}
                            </div>
                        ))}
                         {editingModel && editingModel.id.startsWith('new-') && (
                                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                    <Input value={editingModel.name} onChange={e => setEditingModel({...editingModel, name: e.target.value})} placeholder="Nom affiché" className="h-8"/>
                                    <Input value={editingModel.modelName} onChange={e => setEditingModel({...editingModel, modelName: e.target.value})} placeholder="Identifiant modèle" className="h-8"/>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveModel}><Check className="h-4 w-4"/></Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingModel(null)}><X className="h-4 w-4"/></Button>
                                </div>
                        )}
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleAddNewModel}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Ajouter un modèle OpenRouter
                        </Button>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
    </Card>
  );
}

    