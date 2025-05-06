
// src/app/chat/[characterId]/page.tsx
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2, ArrowLeft, User as UserIcon, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Character, Message } from "@/types";
import { simpleChat } from "@/ai/flows/simple-chat"; // Import the simple chat flow
import type { SimpleChatInput, SimpleChatOutput } from "@/ai/flows/simple-chat";

export default function CharacterChatPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.characterId as string;
  const { toast } = useToast();

  const [character, setCharacter] = React.useState<Character | null>(null);
  const [chatHistory, setChatHistory] = React.useState<Message[]>([]);
  const [userInput, setUserInput] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isLoadingCharacter, setIsLoadingCharacter] = React.useState<boolean>(true);

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (characterId) {
      try {
        const charactersFromStorage = localStorage.getItem('globalCharacters');
        if (charactersFromStorage) {
          const allCharacters: Character[] = JSON.parse(charactersFromStorage);
          const foundCharacter = allCharacters.find(c => c.id === characterId);
          if (foundCharacter) {
            setCharacter(foundCharacter);
            // Initialize chat with a system message or character greeting
            setChatHistory([{
              id: `sys-${Date.now()}`,
              type: 'system',
              content: `Vous discutez maintenant avec ${foundCharacter.name}.`,
              timestamp: Date.now()
            }]);
          } else {
            toast({ title: "Personnage non trouvé", description: "Le personnage que vous essayez de contacter n'existe pas.", variant: "destructive" });
            router.push('/histoires'); // Redirect if character not found
          }
        } else {
            toast({ title: "Aucun personnage", description: "Aucun personnage sauvegardé localement.", variant: "destructive" });
            router.push('/histoires');
        }
      } catch (error) {
        console.error("Failed to load character:", error);
        toast({ title: "Erreur", description: "Impossible de charger les détails du personnage.", variant: "destructive" });
        router.push('/histoires');
      } finally {
        setIsLoadingCharacter(false);
      }
    }
  }, [characterId, router, toast]);


  React.useEffect(() => {
    // Scroll to bottom after messages update
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        requestAnimationFrame(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        });
      }
    }
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading || !character) return;

    setIsLoading(true);
    const userMessageContent = userInput.trim();
    setUserInput(""); // Clear input

    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: userMessageContent,
      timestamp: Date.now(),
    };
    setChatHistory(prev => [...prev, newUserMessage]);

    try {
      const input: SimpleChatInput = {
        characterName: character.name,
        characterDetails: character.details,
        chatHistory: [...chatHistory, newUserMessage].map(m => ({ // Send current history + new user message
            role: m.type === 'user' ? 'user' : (m.type === 'ai' ? 'model' : 'user'), // map 'system' to 'user' for Gemini
            parts: [{ text: m.content }]
        })),
        userMessage: userMessageContent,
      };

      const result: SimpleChatOutput = await simpleChat(input);

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: result.response,
        timestamp: Date.now(),
      };
      setChatHistory(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Error in chat:", error);
      toast({
        title: "Erreur de Chat",
        description: `Impossible d'obtenir une réponse: ${error instanceof Error ? error.message : 'Unknown error'}.`,
        variant: "destructive",
      });
       // Re-add user input if AI fails
      // setUserInput(userMessageContent); // No, keep it cleared, user can resend.
      // Optionally add an error message to chat history
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        type: 'system',
        content: `Erreur : Impossible d'obtenir une réponse du personnage. Veuillez réessayer.`,
        timestamp: Date.now(),
      };
      setChatHistory(prev => [...prev, errorMessage]);

    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoadingCharacter || !character) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Chargement du personnage...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen p-4 bg-background">
      <header className="flex items-center mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10 mr-3 border">
          {character.portraitUrl ? (
            <AvatarImage src={character.portraitUrl} alt={character.name} data-ai-hint={`${character.name} portrait`} />
          ) : (
            <AvatarFallback>{character.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          )}
        </Avatar>
        <h1 className="text-xl font-semibold">{character.name}</h1>
      </header>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {chatHistory.map((message) => (
                <div key={message.id} className={`flex items-start gap-3 ${message.type === 'user' ? 'justify-end' : ''}`}>
                  {message.type === 'ai' && (
                    <Avatar className="h-8 w-8 border">
                       {character.portraitUrl ? (
                        <AvatarImage src={character.portraitUrl} alt={character.name} data-ai-hint={`${character.name} portrait`} />
                      ) : (
                        <AvatarFallback><Bot className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg p-3 max-w-[80%] text-sm whitespace-pre-wrap break-words font-sans shadow-md ${
                      message.type === 'user' ? 'bg-primary text-primary-foreground self-end' : 
                      (message.type === 'ai' ? 'bg-card text-card-foreground' : 'bg-transparent border italic text-muted-foreground text-center w-full')
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.type === 'user' && (
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback><UserIcon className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center justify-start gap-3">
                  <Avatar className="h-8 w-8 border">
                     {character.portraitUrl ? (
                        <AvatarImage src={character.portraitUrl} alt={character.name} data-ai-hint={`${character.name} portrait`} />
                      ) : (
                        <AvatarFallback><Bot className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                      )}
                  </Avatar>
                  <span className="flex items-center text-muted-foreground italic p-3">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Écriture en cours...
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t flex items-center gap-2 bg-card">
          <Textarea
            placeholder={`Message à ${character.name}...`}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
            className="min-h-[40px] max-h-[150px] resize-y flex-1 bg-background border-input focus:ring-primary"
            disabled={isLoading}
          />
          <Button type="button" size="icon" onClick={handleSendMessage} disabled={isLoading || !userInput.trim()}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
