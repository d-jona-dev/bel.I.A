"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Loader2, Send, Wand2, Clipboard, BrainCircuit, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AiConfig } from '@/types';
import { ModelManager } from '@/components/model-manager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { creativeAssistant } from '@/ai/flows/creative-assistant';
import { Separator } from './ui/separator';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    suggestions?: Array<{ field: keyof any; value: string }>;
}

interface AssistantChatProps {
    aiConfig: AiConfig;
    onConfigChange: (newConfig: AiConfig) => void;
    onApplySuggestion: (suggestion: { field: any; value: string }) => void;
}

export default function AssistantChat({ aiConfig, onConfigChange, onApplySuggestion }: AssistantChatProps) {
    const { toast } = useToast();
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [input, setInput] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);
    const [isAiConfigOpen, setIsAiConfigOpen] = React.useState(false);
    const [copiedStates, setCopiedStates] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                setTimeout(() => {
                    viewport.scrollTop = viewport.scrollHeight;
                }, 100);
            }
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const newUserMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: input };
        setMessages(prev => [...prev, newUserMessage]);
        setIsLoading(true);
        setInput('');

        try {
            const assistantHistory = messages.map(m => ({
                role: m.role,
                content: m.content
            }));
            
            const result = await creativeAssistant({
                userRequest: input,
                history: assistantHistory,
                aiConfig: aiConfig
            });

            if (result.error) {
                throw new Error(result.error);
            }

            const newAssistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: result.response,
                suggestions: result.suggestions
            };
            setMessages(prev => [...prev, newAssistantMessage]);

        } catch (error) {
            console.error("Error calling creative assistant:", error);
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: `Désolé, une erreur est survenue: ${error instanceof Error ? error.message : String(error)}`
            };
            setMessages(prev => [...prev, errorMessage]);
            toast({ title: "Erreur de l'Assistant", description: error instanceof Error ? error.message : "Une erreur inconnue est survenue.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopySuggestion = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedStates(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setCopiedStates(prev => ({ ...prev, [id]: false })), 2000);
        toast({ title: "Copié!", description: "La suggestion a été copiée dans le presse-papiers." });
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-muted-foreground p-8">
                                <Bot className="mx-auto h-12 w-12 mb-4" />
                                <p>Je suis votre assistant créatif. Demandez-moi de l'aide pour créer un monde, une intrigue ou des personnages !</p>
                            </div>
                        )}
                        {messages.map((message) => (
                            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-3 rounded-lg max-w-lg ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                    {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-muted-foreground/20 space-y-2">
                                            <p className="text-xs font-semibold">Suggestions :</p>
                                            {message.suggestions.map((suggestion, index) => (
                                                <div key={index} className="p-2 bg-background/50 rounded-md">
                                                    <p className="text-xs text-muted-foreground">Pour le champ : <span className="font-bold">{suggestion.field}</span></p>
                                                    <p className="text-sm my-1 italic">"{suggestion.value}"</p>
                                                    <div className="flex gap-2">
                                                        <Button size="xs" variant="outline" onClick={() => onApplySuggestion(suggestion)}>
                                                            <Wand2 className="mr-2 h-3 w-3"/>Appliquer
                                                        </Button>
                                                         <Button
                                                            size="xs"
                                                            variant="ghost"
                                                            onClick={() => handleCopySuggestion(suggestion.value, `${message.id}-${index}`)}
                                                        >
                                                            {copiedStates[`${message.id}-${index}`] ? <Check className="mr-2 h-3 w-3 text-green-500"/> : <Clipboard className="mr-2 h-3 w-3"/>}
                                                            Copier
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="p-3 rounded-lg bg-muted flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                    <span className="text-sm text-muted-foreground">Réflexion en cours...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
            <Separator />
            <div className="p-4 border-t flex items-center gap-2">
                <Textarea
                    placeholder="Demandez une idée..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    rows={1}
                    className="min-h-[40px] max-h-[150px] resize-y flex-1"
                    disabled={isLoading}
                />
                <Dialog open={isAiConfigOpen} onOpenChange={setIsAiConfigOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon"><BrainCircuit className="h-4 w-4"/></Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Configuration de l'IA</DialogTitle>
                        </DialogHeader>
                        <ModelManager config={aiConfig} onConfigChange={onConfigChange} />
                    </DialogContent>
                </Dialog>
                <Button size="icon" onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}