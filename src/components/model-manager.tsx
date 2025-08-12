
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
import { PlusCircle, Trash2, Edit2, Check, X, Loader2, Server, Folder, AlertTriangle, BrainCircuit, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AiConfig, ModelDefinition, ImageModelDefinition } from "@/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";


const DEFAULT_LLM_MODELS: ModelDefinition[] = [
    { id: 'gemini-default', name: 'Gemini (Google)', source: 'gemini' },
    { id: 'openrouter-mistral-7b', name: 'Mistral 7B (OpenRouter)', source: 'openrouter', modelName: 'mistralai/mistral-7b-instruct:free' },
    { id: 'openrouter-llama3-8b', name: 'Llama3 8B (OpenRouter)', source: 'openrouter', modelName: 'meta-llama/llama-3-8b-instruct:free' },
    { id: 'openrouter-command-r', name: 'Command R (OpenRouter)', source: 'openrouter', modelName: 'cohere/command-r' },
];

const DEFAULT_IMAGE_MODELS: ImageModelDefinition[] = [
    { id: 'gemini-image-default', name: 'Gemini (Google)', source: 'gemini'},
    { id: 'openrouter-sdxl', name: 'Stable Diffusion XL (OpenRouter)', source: 'openrouter', modelName: 'stabilityai/stable-diffusion-xl' },
    { id: 'openrouter-sd3', name: 'Stable Diffusion 3 (OpenRouter)', source: 'openrouter', modelName: 'stabilityai/stable-diffusion-3' },
];


interface ModelManagerProps {
  config: AiConfig;
  onConfigChange: (newConfig: AiConfig) => void;
}

export function ModelManager({ config, onConfigChange }: ModelManagerProps) {
  const { toast } = useToast();
  const [llmModels, setLlmModels] = React.useState<ModelDefinition[]>([]);
  const [imageModels, setImageModels] = React.useState<ImageModelDefinition[]>([]);
  
  const [editingLlmModel, setEditingLlmModel] = React.useState<ModelDefinition | null>(null);

  const [localModels, setLocalModels] = React.useState<string[]>([]);
  const [isLocalServerLoading, setIsLocalServerLoading] = React.useState(true);
  const [localServerError, setLocalServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const storedLlmModels = localStorage.getItem('llm_models');
      setLlmModels(storedLlmModels ? JSON.parse(storedLlmModels) : DEFAULT_LLM_MODELS);
      
      const storedImageModels = localStorage.getItem('image_models');
      setImageModels(storedImageModels ? JSON.parse(storedImageModels) : DEFAULT_IMAGE_MODELS);

    } catch (error) {
        console.error("Failed to load models from localStorage", error);
        setLlmModels(DEFAULT_LLM_MODELS);
        setImageModels(DEFAULT_IMAGE_MODELS);
    }

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

  const saveLlmModels = (updatedModels: ModelDefinition[]) => {
    setLlmModels(updatedModels);
    localStorage.setItem('llm_models', JSON.stringify(updatedModels));
  };

  const handleOpenRouterConfigChange = (field: keyof NonNullable<AiConfig['llm']['openRouter']>, value: string | boolean) => {
    onConfigChange({
      ...config,
      llm: {
        ...config.llm,
        openRouter: {
            ...(config.llm.openRouter || { model: '', apiKey: '', enforceStructuredResponse: false, compatibilityMode: false }),
            [field]: value
        }
      }
    });
  };

 const handleSelectLlmSource = (source: 'gemini' | 'openrouter' | 'local') => {
    let newLlmConfig = { ...config.llm, source };

    if (source === 'openrouter') {
        const firstOpenRouterModel = llmModels.find(m => m.source === 'openrouter');
        newLlmConfig.openRouter = {
            apiKey: firstOpenRouterModel?.apiKey || config.llm.openRouter?.apiKey || '',
            model: firstOpenRouterModel?.modelName || '',
            enforceStructuredResponse: firstOpenRouterModel?.enforceStructuredResponse ?? false,
            compatibilityMode: firstOpenRouterModel?.compatibilityMode ?? false,
        };
    } else if (source === 'local') {
        newLlmConfig.local = {
            model: localModels[0] || ''
        };
    }
    onConfigChange({ ...config, llm: newLlmConfig });
  };
  
  const handleSelectLocalModel = (modelName: string) => {
      onConfigChange({
          ...config,
          llm: { ...config.llm, source: 'local', local: { model: modelName } }
      });
  }

  const handleAddNewLlmModel = () => {
    setEditingLlmModel({ id: `new-${Date.now()}`, name: '', source: 'openrouter', modelName: '' });
  };

  const handleSaveLlmModel = () => {
    if (!editingLlmModel || !editingLlmModel.name || !editingLlmModel.modelName) {
        toast({ title: "Erreur", description: "Le nom et l'identifiant du modèle sont requis.", variant: 'destructive' });
        return;
    }
    const isNew = editingLlmModel.id.startsWith('new-');
    let updatedModels: ModelDefinition[];

    if (isNew) {
        const newModel = { ...editingLlmModel, id: `${editingLlmModel.source}-${editingLlmModel.modelName}-${Date.now()}` };
        updatedModels = [...llmModels, newModel];
    } else {
        updatedModels = llmModels.map(m => m.id === editingLlmModel.id ? editingLlmModel : m);
    }
    saveLlmModels(updatedModels);
    setEditingLlmModel(null);
  };
  
  const handleDeleteLlmModel = (modelId: string) => {
    const updatedModels = llmModels.filter(m => m.id !== modelId);
    saveLlmModels(updatedModels);
  };
  
  const handleSelectImageSource = (source: 'gemini' | 'openrouter') => {
      let newImageConfig = { ...config.image, source };
      if (source === 'openrouter') {
          const firstOpenRouterModel = imageModels.find(m => m.source === 'openrouter');
          newImageConfig.openRouter = {
              apiKey: config.image.openRouter?.apiKey || '',
              model: firstOpenRouterModel?.modelName || '',
          };
      }
      onConfigChange({ ...config, image: newImageConfig });
  };

  const handleImageOpenRouterConfigChange = (field: 'model' | 'apiKey', value: string) => {
      onConfigChange({
          ...config,
          image: {
              ...config.image,
              source: 'openrouter',
              openRouter: {
                  ...(config.image.openRouter || { model: '', apiKey: ''}),
                  [field]: value
              }
          }
      });
  };

  const selectedLlmModelId = config.llm.source === 'gemini' 
    ? llmModels.find(m => m.source === 'gemini')?.id
    : llmModels.find(m => m.source === 'openrouter' && m.modelName === config.llm.openRouter?.model)?.id;

   const selectedImageModelId = config.image.source === 'gemini'
    ? imageModels.find(m => m.source === 'gemini')?.id
    : imageModels.find(m => m.source === 'openrouter' && m.modelName === config.image.openRouter?.model)?.id;

  return (
    <Card className="bg-muted/20 border-dashed">
        <CardContent className="p-4 space-y-4">
            {/* LLM Config Section */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><BrainCircuit className="h-4 w-4"/> Modèle de Langage (LLM)</Label>
                <Select value={config.llm.source} onValueChange={(value) => handleSelectLlmSource(value as any)}>
                    <SelectTrigger id="llm-source-select"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="gemini">Gemini (Google)</SelectItem>
                        <SelectItem value="openrouter">OpenRouter (API Externe)</SelectItem>
                        <SelectItem value="local">Local (llama.cpp)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            {config.llm.source === 'openrouter' && (
                 <div className="space-y-3 p-3 border bg-background rounded-md">
                    <Label>Configuration OpenRouter (LLM)</Label>
                     <Select value={selectedLlmModelId} onValueChange={(modelId) => {
                        const selected = llmModels.find(m => m.id === modelId);
                        if (selected && selected.source === 'openrouter') {
                            onConfigChange({
                                ...config,
                                llm: {
                                    source: 'openrouter',
                                    openRouter: {
                                        apiKey: selected.apiKey || config.llm.openRouter?.apiKey || '',
                                        model: selected.modelName || '',
                                        enforceStructuredResponse: selected.enforceStructuredResponse ?? false,
                                        compatibilityMode: selected.compatibilityMode ?? false,
                                    }
                                }
                            });
                        }
                    }}>
                        <SelectTrigger><SelectValue placeholder="Choisir un modèle..."/></SelectTrigger>
                        <SelectContent>
                            {llmModels.filter(m => m.source === 'openrouter').map(model => (
                                <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="password"
                        placeholder="Clé API OpenRouter"
                        value={config.llm.openRouter?.apiKey || ''}
                        onChange={(e) => handleOpenRouterConfigChange('apiKey', e.target.value)}
                    />
                    <div className="flex items-center space-x-2">
                        <Switch id="structured-response-switch" checked={config.llm.openRouter?.enforceStructuredResponse || false} onCheckedChange={(checked) => handleOpenRouterConfigChange('enforceStructuredResponse', checked)}/>
                        <Label htmlFor="structured-response-switch" className="text-xs">Forcer la réponse structurée (JSON)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="compatibility-mode-switch" checked={config.llm.openRouter?.compatibilityMode || false} onCheckedChange={(checked) => handleOpenRouterConfigChange('compatibilityMode', checked)}/>
                        <Label htmlFor="compatibility-mode-switch" className="text-xs">Mode de compatibilité (Mistral, etc.)</Label>
                    </div>
                     <Accordion type="single" collapsible>
                        <AccordionItem value="manage-llm-models" className="border-b-0">
                            <AccordionTrigger className="text-xs p-2 hover:no-underline">Gérer la liste des modèles</AccordionTrigger>
                            <AccordionContent className="space-y-2">
                                {llmModels.filter(m => m.source === 'openrouter').map(model => (
                                    <div key={model.id} className={cn("flex items-center gap-2 p-2 border rounded-md", editingLlmModel?.id === model.id ? "bg-muted/50" : "bg-background")}>
                                        {editingLlmModel?.id === model.id ? (
                                            <>
                                                <Input value={editingLlmModel.name} onChange={e => setEditingLlmModel({...editingLlmModel, name: e.target.value})} placeholder="Nom affiché" className="h-8"/>
                                                <Input value={editingLlmModel.modelName} onChange={e => setEditingLlmModel({...editingLlmModel, modelName: e.target.value})} placeholder="Identifiant modèle" className="h-8"/>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveLlmModel}><Check className="h-4 w-4"/></Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingLlmModel(null)}><X className="h-4 w-4"/></Button>
                                            </>
                                        ) : (
                                            <>
                                                <p className="flex-1 text-sm truncate">{model.name}</p>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingLlmModel(model)}><Edit2 className="h-4 w-4"/></Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteLlmModel(model.id)}><Trash2 className="h-4 w-4"/></Button>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {editingLlmModel && editingLlmModel.id.startsWith('new-') && (
                                        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                            <Input value={editingLlmModel.name} onChange={e => setEditingLlmModel({...editingLlmModel, name: e.target.value})} placeholder="Nom affiché" className="h-8"/>
                                            <Input value={editingLlmModel.modelName} onChange={e => setEditingLlmModel({...editingLlmModel, modelName: e.target.value})} placeholder="Identifiant modèle" className="h-8"/>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveLlmModel}><Check className="h-4 w-4"/></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingLlmModel(null)}><X className="h-4 w-4"/></Button>
                                        </div>
                                )}
                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleAddNewLlmModel}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> Ajouter un modèle
                                </Button>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )}
            
            {config.llm.source === 'local' && (
                 <div className="space-y-3 p-3 border bg-background rounded-md">
                     <Label>Configuration Locale (llama.cpp)</Label>
                      {isLocalServerLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Recherche...</div>
                      ) : localServerError ? (
                          <div className="p-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 mt-0.5"/>
                              <div><p className="font-semibold">Erreur du serveur local</p><p>{localServerError}</p></div>
                          </div>
                      ) : localModels.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground bg-muted/50 border rounded-md flex items-start gap-2">
                                <Folder className="h-4 w-4 mt-0.5"/>
                                <div><p className="font-semibold">Aucun modèle local trouvé.</p><p>Placez vos modèles `.gguf` dans le dossier `models`.</p></div>
                            </div>
                      ) : (
                        <Select value={config.llm.local?.model || ''} onValueChange={handleSelectLocalModel}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {localModels.map(modelName => (<SelectItem key={modelName} value={modelName}>{modelName}</SelectItem>))}
                            </SelectContent>
                        </Select>
                      )}
                 </div>
            )}

            <Separator/>
            
            {/* Image Gen Config Section */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><ImageIcon className="h-4 w-4"/> Modèle de Génération d'Image</Label>
                <Select value={config.image.source} onValueChange={value => handleSelectImageSource(value as any)}>
                    <SelectTrigger id="image-source-select"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="gemini">Gemini (Google)</SelectItem>
                        <SelectItem value="openrouter">OpenRouter (Divers modèles)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            {config.image.source === 'openrouter' && (
                <div className="space-y-3 p-3 border bg-background rounded-md">
                    <Label>Configuration OpenRouter (Image)</Label>
                    <Select value={selectedImageModelId} onValueChange={(modelId) => {
                        const selected = imageModels.find(m => m.id === modelId);
                        if(selected) handleImageOpenRouterConfigChange('model', selected.modelName || '');
                    }}>
                        <SelectTrigger><SelectValue placeholder="Choisir un modèle d'image..."/></SelectTrigger>
                        <SelectContent>
                             {imageModels.filter(m => m.source === 'openrouter').map(model => (
                                <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="password"
                        placeholder="Clé API OpenRouter"
                        value={config.image.openRouter?.apiKey || ''}
                        onChange={(e) => handleImageOpenRouterConfigChange('apiKey', e.target.value)}
                    />
                </div>
            )}
        </CardContent>
    </Card>
  );
}
