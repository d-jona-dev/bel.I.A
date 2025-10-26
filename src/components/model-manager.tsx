
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
import { PlusCircle, Trash2, Edit2, Check, X, Loader2, Server, Folder, AlertTriangle, BrainCircuit, ImageIcon, Download, Upload } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { i18n, type Language } from "@/lib/i18n";


const DEFAULT_LLM_MODELS: ModelDefinition[] = [
    { id: 'gemini-default', name: 'Gemini (Google)', source: 'gemini' },
    { id: 'openrouter-mistral-7b', name: 'Mistral 7B (OpenRouter)', source: 'openrouter', modelName: 'mistralai/mistral-7b-instruct:free' },
    { id: 'openrouter-llama3-8b', name: 'Llama3 8B (OpenRouter)', source: 'openrouter', modelName: 'meta-llama/llama-3-8b-instruct:free' },
    { id: 'openrouter-command-r', name: 'Command R (OpenRouter)', source: 'openrouter', modelName: 'cohere/command-r' },
];

const DEFAULT_IMAGE_MODELS: ImageModelDefinition[] = [
    { id: 'gemini-image-default', name: 'Gemini (Google)', source: 'gemini'},
    { id: 'huggingface-sd3', name: 'Stable Diffusion 3 (HF)', source: 'huggingface', modelName: 'stabilityai/stable-diffusion-3-medium-diffusers' },
];


interface ModelManagerProps {
  config: AiConfig;
  onConfigChange: (newConfig: AiConfig) => void;
  currentLanguage: Language; // NEW
}

export function ModelManager({ config, onConfigChange, currentLanguage }: ModelManagerProps) {
  const { toast } = useToast();
  const lang = i18n[currentLanguage] || i18n.fr;
  const [llmModels, setLlmModels] = React.useState<ModelDefinition[]>([]);
  const [imageModels, setImageModels] = React.useState<ImageModelDefinition[]>([]);
  
  const [editingLlmModel, setEditingLlmModel] = React.useState<ModelDefinition | null>(null);
  const [editingImageModel, setEditingImageModel] = React.useState<ImageModelDefinition | null>(null);

  const [localModels, setLocalModels] = React.useState<string[]>([]);
  const [isLocalServerLoading, setIsLocalServerLoading] = React.useState(true);
  const [localServerError, setLocalServerError] = React.useState<string | null>(null);
  
  const importFileRef = React.useRef<HTMLInputElement>(null);


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
                throw new Error(lang.localServerError);
            }
            const data = await response.json();
            setLocalModels(data.models || []);
            setLocalServerError(null);
        } catch (error) {
            console.warn("Could not fetch local models:", error);
            setLocalServerError(error instanceof Error ? error.message : lang.unknownError);
        } finally {
            setIsLocalServerLoading(false);
        }
    };
    fetchLocalModels();

  }, [lang.localServerError, lang.unknownError]);

  const saveLlmModels = (updatedModels: ModelDefinition[]) => {
    setLlmModels(updatedModels);
    localStorage.setItem('llm_models', JSON.stringify(updatedModels));
  };

  const saveImageModels = (updatedModels: ImageModelDefinition[]) => {
    setImageModels(updatedModels);
    localStorage.setItem('image_models', JSON.stringify(updatedModels));
  };

  const handleDownloadModels = () => {
    try {
      // SECURITY FIX: Remove apiKey from exported data
      const llmModelsToSave = llmModels.map(({ apiKey, ...rest }) => rest);
      const imageModelsToSave = imageModels.map(({ apiKey, ...rest }) => rest);

      const dataToSave = { llmModels: llmModelsToSave, imageModels: imageModelsToSave };
      const jsonString = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aventurier_textuel_models.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: lang.exportSuccessTitle, description: lang.exportSuccessDesc });
    } catch (error) {
      console.error("Failed to download models:", error);
      toast({ title: lang.exportErrorTitle, variant: "destructive" });
    }
  };

  const handleImportModels = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File is not text");
        const importedData = JSON.parse(text);

        if (Array.isArray(importedData.llmModels) && Array.isArray(importedData.imageModels)) {
          saveLlmModels(importedData.llmModels);
          saveImageModels(importedData.imageModels);
          toast({ title: lang.importSuccessTitle, description: lang.importSuccessDesc });
        } else {
          throw new Error("Invalid JSON structure.");
        }
      } catch (error) {
        console.error("Failed to import models:", error);
        toast({ title: lang.importErrorTitle, description: lang.importErrorDesc, variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = ''; // Reset input
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
        toast({ title: lang.errorTitle, description: lang.modelFieldsRequired, variant: 'destructive' });
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
  
  const handleSelectImageSource = (source: 'gemini' | 'openrouter' | 'huggingface' | 'local-sd') => {
      let newImageConfig = { ...config.image, source };
      if (source === 'openrouter') {
          const firstOpenRouterModel = imageModels.find(m => m.source === 'openrouter');
          newImageConfig.openRouter = {
              apiKey: config.image.openRouter?.apiKey || '',
              model: firstOpenRouterModel?.modelName || '',
          };
      } else if (source === 'huggingface') {
          const firstHuggingFaceModel = imageModels.find(m => m.source === 'huggingface');
          newImageConfig.huggingface = {
              apiKey: config.image.huggingface?.apiKey || '',
              model: firstHuggingFaceModel?.modelName || 'stabilityai/stable-diffusion-xl-base-1.0',
          }
      } else if (source === 'local-sd') {
          newImageConfig.localSd = {
              apiUrl: config.image.localSd?.apiUrl || 'http://127.0.0.1:7860',
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

  const handleImageHuggingFaceConfigChange = (field: 'model' | 'apiKey', value: string) => {
      onConfigChange({
          ...config,
          image: {
              ...config.image,
              source: 'huggingface',
              huggingface: {
                  ...(config.image.huggingface || { model: '', apiKey: ''}),
                  [field]: value
              }
          }
      });
  };

  const handleImageLocalSdConfigChange = (field: 'apiUrl', value: string) => {
      onConfigChange({
          ...config,
          image: {
              ...config.image,
              source: 'local-sd',
              localSd: {
                  ...(config.image.localSd || { apiUrl: ''}),
                  [field]: value
              }
          }
      });
  }

  const handleAddNewImageModel = (source: 'openrouter' | 'huggingface') => {
    setEditingImageModel({ id: `new-img-${Date.now()}`, name: '', source: source, modelName: '' });
  };

  const handleSaveImageModel = () => {
    if (!editingImageModel || !editingImageModel.name || !editingImageModel.modelName) {
        toast({ title: lang.errorTitle, description: lang.modelFieldsRequired, variant: 'destructive' });
        return;
    }
    const isNew = editingImageModel.id.startsWith('new-');
    let updatedModels: ImageModelDefinition[];

    if (isNew) {
        const newModel = { ...editingImageModel, id: `${editingImageModel.source}-img-${editingImageModel.modelName}-${Date.now()}` };
        updatedModels = [...imageModels, newModel];
    } else {
        updatedModels = imageModels.map(m => m.id === editingImageModel.id ? editingImageModel : m);
    }
    saveImageModels(updatedModels);
    setEditingImageModel(null);
  };
  
  const handleDeleteImageModel = (modelId: string) => {
    const updatedModels = imageModels.filter(m => m.id !== modelId);
    saveImageModels(updatedModels);
  };

  const selectedLlmModelId = config.llm.source === 'gemini' 
    ? llmModels.find(m => m.source === 'gemini')?.id
    : llmModels.find(m => m.source === 'openrouter' && m.modelName === config.llm.openRouter?.model)?.id;

   let selectedImageModelId: string | undefined;
    if (config.image.source === 'gemini') {
        selectedImageModelId = imageModels.find(m => m.source === 'gemini')?.id;
    } else if (config.image.source === 'openrouter') {
        selectedImageModelId = imageModels.find(m => m.source === 'openrouter' && m.modelName === config.image.openRouter?.model)?.id;
    } else if (config.image.source === 'huggingface') {
        selectedImageModelId = imageModels.find(m => m.source === 'huggingface' && m.modelName === config.image.huggingface?.model)?.id;
    }


  return (
    <Card className="bg-muted/20 border-dashed">
        <CardHeader className="flex-row items-center justify-between pb-4">
            <div>
                <CardTitle className="text-base flex items-center gap-2">{lang.aiConfigTitle}</CardTitle>
            </div>
            <div className="flex gap-2">
                 <input type="file" ref={importFileRef} accept=".json" onChange={handleImportModels} className="hidden" />
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => importFileRef.current?.click()}>
                                <Upload className="h-4 w-4"/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{lang.importModelsTooltip}</p></TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
                 <TooltipProvider>
                     <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="outline" size="icon" onClick={handleDownloadModels}>
                                 <Download className="h-4 w-4"/>
                             </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{lang.exportModelsTooltip}</p></TooltipContent>
                     </Tooltip>
                 </TooltipProvider>
            </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
            {/* LLM Config Section */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><BrainCircuit className="h-4 w-4"/> {lang.llmTitle}</Label>
                <Select value={config.llm.source} onValueChange={(value) => handleSelectLlmSource(value as any)}>
                    <SelectTrigger id="llm-source-select"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="gemini">Gemini (Google)</SelectItem>
                        <SelectItem value="openrouter">{lang.openRouterTitle}</SelectItem>
                        <SelectItem value="local">{lang.localLlmTitle}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            {config.llm.source === 'openrouter' && (
                 <div className="space-y-3 p-3 border bg-background rounded-md">
                    <Label>{lang.openRouterLlmConfig}</Label>
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
                        <SelectTrigger><SelectValue placeholder={lang.chooseModelPlaceholder}/></SelectTrigger>
                        <SelectContent>
                            {llmModels.filter(m => m.source === 'openrouter').map(model => (
                                <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="password"
                        placeholder={lang.openRouterApiKeyPlaceholder}
                        value={config.llm.openRouter?.apiKey || ''}
                        onChange={(e) => handleOpenRouterConfigChange('apiKey', e.target.value)}
                    />
                    <div className="flex items-center space-x-2">
                        <Switch id="structured-response-switch" checked={config.llm.openRouter?.enforceStructuredResponse || false} onCheckedChange={(checked) => handleOpenRouterConfigChange('enforceStructuredResponse', checked)}/>
                        <Label htmlFor="structured-response-switch" className="text-xs">{lang.enforceJsonResponse}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="compatibility-mode-switch" checked={config.llm.openRouter?.compatibilityMode || false} onCheckedChange={(checked) => handleOpenRouterConfigChange('compatibilityMode', checked)}/>
                        <Label htmlFor="compatibility-mode-switch" className="text-xs">{lang.compatibilityMode}</Label>
                    </div>
                     <Accordion type="single" collapsible>
                        <AccordionItem value="manage-llm-models" className="border-b-0">
                            <AccordionTrigger className="text-xs p-2 hover:no-underline">{lang.manageModels}</AccordionTrigger>
                            <AccordionContent className="space-y-2">
                                {llmModels.filter(m => m.source === 'openrouter').map(model => (
                                    <div key={model.id} className={cn("p-2 border rounded-md", editingLlmModel?.id === model.id ? "bg-muted/50" : "bg-background")}>
                                        {editingLlmModel?.id === model.id ? (
                                             <div className="space-y-2">
                                                <Input value={editingLlmModel.name} onChange={e => setEditingLlmModel({...editingLlmModel, name: e.target.value})} placeholder={lang.displayName} className="h-8"/>
                                                <Input value={editingLlmModel.modelName} onChange={e => setEditingLlmModel({...editingLlmModel, modelName: e.target.value})} placeholder={lang.modelIdentifier} className="h-8"/>
                                                <div className="flex justify-end gap-2">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveLlmModel}><Check className="h-4 w-4"/></Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingLlmModel(null)}><X className="h-4 w-4"/></Button>
                                                </div>
                                             </div>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <p className="text-sm font-medium truncate">{model.name}</p>
                                                <div className="flex justify-end gap-1">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingLlmModel(model)}><Edit2 className="h-4 w-4"/></Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteLlmModel(model.id)}><Trash2 className="h-4 w-4"/></Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {editingLlmModel && editingLlmModel.id.startsWith('new-') && (
                                     <div className="p-2 border rounded-md bg-muted/50 space-y-2">
                                        <Input value={editingLlmModel.name} onChange={e => setEditingLlmModel({...editingLlmModel, name: e.target.value})} placeholder={lang.displayName} className="h-8"/>
                                        <Input value={editingLlmModel.modelName} onChange={e => setEditingLlmModel({...editingLlmModel, modelName: e.target.value})} placeholder={lang.modelIdentifier} className="h-8"/>
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveLlmModel}><Check className="h-4 w-4"/></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingLlmModel(null)}><X className="h-4 w-4"/></Button>
                                        </div>
                                     </div>
                                )}
                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleAddNewLlmModel}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> {lang.addModel}
                                </Button>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )}
            
            {config.llm.source === 'local' && (
                 <div className="space-y-3 p-3 border bg-background rounded-md">
                     <Label>{lang.localLlmConfig}</Label>
                      {isLocalServerLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> {lang.searching}...</div>
                      ) : localServerError ? (
                          <div className="p-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 mt-0.5"/>
                              <div><p className="font-semibold">{lang.localServerErrorTitle}</p><p>{localServerError}</p></div>
                          </div>
                      ) : localModels.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground bg-muted/50 border rounded-md flex items-start gap-2">
                                <Folder className="h-4 w-4 mt-0.5"/>
                                <div><p className="font-semibold">{lang.noLocalModelsTitle}</p><p>{lang.noLocalModelsDesc}</p></div>
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
                <Label className="flex items-center gap-2"><ImageIcon className="h-4 w-4"/> {lang.imageModelTitle}</Label>
                <Select value={config.image.source} onValueChange={value => handleSelectImageSource(value as any)}>
                    <SelectTrigger id="image-source-select"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="gemini">Gemini (Google)</SelectItem>
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                        <SelectItem value="huggingface">Hugging Face</SelectItem>
                        <SelectItem value="local-sd">{lang.localSdTitle}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            {config.image.source === 'openrouter' && (
                <div className="space-y-3 p-3 border bg-background rounded-md">
                    <Label>{lang.openRouterImageConfig}</Label>
                    <Select value={selectedImageModelId} onValueChange={(modelId) => {
                        const selected = imageModels.find(m => m.id === modelId);
                        if(selected) handleImageOpenRouterConfigChange('model', selected.modelName || '');
                    }}>
                        <SelectTrigger><SelectValue placeholder={lang.chooseImageModelPlaceholder}/></SelectTrigger>
                        <SelectContent>
                             {imageModels.filter(m => m.source === 'openrouter').map(model => (
                                <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="password"
                        placeholder={lang.openRouterApiKeyPlaceholder}
                        value={config.image.openRouter?.apiKey || ''}
                        onChange={(e) => handleImageOpenRouterConfigChange('apiKey', e.target.value)}
                    />
                    <Accordion type="single" collapsible>
                        <AccordionItem value="manage-image-models" className="border-b-0">
                            <AccordionTrigger className="text-xs p-2 hover:no-underline">{lang.manageModels}</AccordionTrigger>
                            <AccordionContent className="space-y-2">
                                {imageModels.filter(m => m.source === 'openrouter').map(model => (
                                     <div key={model.id} className={cn("p-2 border rounded-md", editingImageModel?.id === model.id ? "bg-muted/50" : "bg-background")}>
                                        {editingImageModel?.id === model.id ? (
                                             <div className="space-y-2">
                                                <Input value={editingImageModel.name} onChange={e => setEditingImageModel({...editingImageModel, name: e.target.value})} placeholder={lang.displayName} className="h-8"/>
                                                <Input value={editingImageModel.modelName} onChange={e => setEditingImageModel({...editingImageModel, modelName: e.target.value})} placeholder={lang.modelIdentifier} className="h-8"/>
                                                <div className="flex justify-end gap-2">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveImageModel}><Check className="h-4 w-4"/></Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingImageModel(null)}><X className="h-4 w-4"/></Button>
                                                </div>
                                             </div>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <p className="text-sm font-medium truncate">{model.name}</p>
                                                <div className="flex justify-end gap-1">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingImageModel(model)}><Edit2 className="h-4 w-4"/></Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteImageModel(model.id)}><Trash2 className="h-4 w-4"/></Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {editingImageModel && editingImageModel.id.startsWith('new-') && editingImageModel.source === 'openrouter' && (
                                     <div className="p-2 border rounded-md bg-muted/50 space-y-2">
                                        <Input value={editingImageModel.name} onChange={e => setEditingImageModel({...editingImageModel, name: e.target.value})} placeholder={lang.displayName} className="h-8"/>
                                        <Input value={editingImageModel.modelName} onChange={e => setEditingImageModel({...editingImageModel, modelName: e.target.value})} placeholder={lang.modelIdentifier} className="h-8"/>
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveImageModel}><Check className="h-4 w-4"/></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingImageModel(null)}><X className="h-4 w-4"/></Button>
                                        </div>
                                     </div>
                                )}
                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => handleAddNewImageModel('openrouter')}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> {lang.addModel}
                                </Button>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )}
            
            {config.image.source === 'huggingface' && (
                <div className="space-y-3 p-3 border bg-background rounded-md">
                    <Label>{lang.huggingFaceConfig}</Label>
                     <Select value={selectedImageModelId} onValueChange={(modelId) => {
                        const selected = imageModels.find(m => m.id === modelId);
                        if(selected) handleImageHuggingFaceConfigChange('model', selected.modelName || '');
                    }}>
                        <SelectTrigger><SelectValue placeholder={lang.chooseImageModelPlaceholder}/></SelectTrigger>
                        <SelectContent>
                             {imageModels.filter(m => m.source === 'huggingface').map(model => (
                                <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="password"
                        placeholder={lang.huggingFaceApiKeyPlaceholder}
                        value={config.image.huggingface?.apiKey || ''}
                        onChange={(e) => handleImageHuggingFaceConfigChange('apiKey', e.target.value)}
                    />
                     <Accordion type="single" collapsible>
                        <AccordionItem value="manage-hf-image-models" className="border-b-0">
                            <AccordionTrigger className="text-xs p-2 hover:no-underline">{lang.manageModels}</AccordionTrigger>
                            <AccordionContent className="space-y-2">
                                {imageModels.filter(m => m.source === 'huggingface').map(model => (
                                    <div key={model.id} className={cn("p-2 border rounded-md", editingImageModel?.id === model.id ? "bg-muted/50" : "bg-background")}>
                                        {editingImageModel?.id === model.id ? (
                                             <div className="space-y-2">
                                                <Input value={editingImageModel.name} onChange={e => setEditingImageModel({...editingImageModel, name: e.target.value})} placeholder={lang.displayName} className="h-8"/>
                                                <Input value={editingImageModel.modelName} onChange={e => setEditingImageModel({...editingImageModel, modelName: e.target.value})} placeholder={lang.modelIdentifier} className="h-8"/>
                                                <div className="flex justify-end gap-2">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveImageModel}><Check className="h-4 w-4"/></Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingImageModel(null)}><X className="h-4 w-4"/></Button>
                                                </div>
                                             </div>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <p className="text-sm font-medium truncate">{model.name}</p>
                                                <div className="flex justify-end gap-1">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingImageModel(model)}><Edit2 className="h-4 w-4"/></Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteImageModel(model.id)}><Trash2 className="h-4 w-4"/></Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {editingImageModel && editingImageModel.id.startsWith('new-') && editingImageModel.source === 'huggingface' && (
                                     <div className="p-2 border rounded-md bg-muted/50 space-y-2">
                                        <Input value={editingImageModel.name} onChange={e => setEditingImageModel({...editingImageModel, name: e.target.value})} placeholder={lang.displayName} className="h-8"/>
                                        <Input value={editingImageModel.modelName} onChange={e => setEditingImageModel({...editingImageModel, modelName: e.target.value})} placeholder={lang.modelIdentifier} className="h-8"/>
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveImageModel}><Check className="h-4 w-4"/></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingImageModel(null)}><X className="h-4 w-4"/></Button>
                                        </div>
                                     </div>
                                )}
                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => handleAddNewImageModel('huggingface')}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> {lang.addModel}
                                </Button>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )}
             {config.image.source === 'local-sd' && (
                <div className="space-y-3 p-3 border bg-background rounded-md">
                     <Label>{lang.localSdConfig}</Label>
                      <Input
                        type="text"
                        placeholder={lang.localSdApiUrlPlaceholder}
                        value={config.image.localSd?.apiUrl || ''}
                        onChange={(e) => handleImageLocalSdConfigChange('apiUrl', e.target.value)}
                    />
                     <CardDescription className="text-xs">
                        {lang.localSdApiUrlDesc}
                     </CardDescription>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
