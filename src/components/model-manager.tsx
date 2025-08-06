
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
import { PlusCircle, Trash2, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AiConfig, ModelDefinition } from "@/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  }, []);

  const saveModels = (updatedModels: ModelDefinition[]) => {
    setModels(updatedModels);
    localStorage.setItem('llm_models', JSON.stringify(updatedModels));
  };
  
  const handleOpenRouterConfigChange = (field: keyof NonNullable<AiConfig['openRouter']>, value: string | boolean) => {
    onConfigChange({
        ...config,
        openRouter: {
            ...(config.openRouter || { model: '', apiKey: '', enforceStructuredResponse: false, compatibilityMode: false }),
            [field]: value
        }
    });
  };

  const handleSelectModel = (modelId: string) => {
    const selected = models.find(m => m.id === modelId);
    if (!selected) return;

    let newConfig: AiConfig = { ...config, source: selected.source };

    if (selected.source === 'openrouter') {
        newConfig.openRouter = {
            ...(config.openRouter || { apiKey: '', enforceStructuredResponse: false, compatibilityMode: false }),
            model: selected.modelName || '',
        };
    }
    
    onConfigChange(newConfig);
  };


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
              <Label htmlFor="model-select">Modèle de langage (LLM)</Label>
              <Select value={selectedModelId} onValueChange={handleSelectModel}>
                  <SelectTrigger id="model-select">
                      <SelectValue placeholder="Choisir un modèle..." />
                  </SelectTrigger>
                  <SelectContent>
                      {models.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                              {model.name}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>

            {config.source === 'openrouter' && (
                <div className="space-y-3 p-3 border bg-background rounded-md">
                    <Label>Configuration OpenRouter</Label>
                    <Input
                        type="password"
                        placeholder="Clé API OpenRouter"
                        value={config.openRouter?.apiKey || ''}
                        onChange={(e) => handleOpenRouterConfigChange('apiKey', e.target.value)}
                    />
                    <Input
                        placeholder="Nom du modèle (ex: mistralai/mistral-7b-instruct)"
                        value={config.openRouter?.model || ''}
                        onChange={(e) => handleOpenRouterConfigChange('model', e.target.value)}
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

            <Accordion type="single" collapsible>
                <AccordionItem value="manage-models">
                    <AccordionTrigger className="text-sm">Gérer la liste des modèles</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                        {models.filter(m => m.source === 'openrouter').map(model => (
                            <div key={model.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
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
                                <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
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
