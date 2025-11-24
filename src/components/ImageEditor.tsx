
"use client";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Message, Character, Bubble } from "@/types";
import { MessageSquarePlus, PlusCircle, Trash2, Mic, Settings, User, UploadCloud } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { i18n, type Language } from "@/lib/i18n";


const bubbleStyles = {
  // Speech
  'parole-s': { label: 'Parole (S)', border: '2px solid black', lineDash: [], w: 200, h: 80, fontSize: 28 },
  'parole-m': { label: 'Parole (M)', border: '2px solid black', lineDash: [], w: 300, h: 120, fontSize: 32 },
  'parole-l': { label: 'Parole (L)', border: '2px solid black', lineDash: [], w: 450, h: 150, fontSize: 34 },
  // Thought
  'pensée-s': { label: 'Pensée (S)', border: '2px dashed gray', lineDash: [6, 3], w: 180, h: 70, fontSize: 26 },
  'pensée-m': { label: 'Pensée (M)', border: '2px dashed gray', lineDash: [6, 3], w: 280, h: 100, fontSize: 30 },
  'pensée-l': { label: 'Pensée (L)', border: '2px dashed gray', lineDash: [6, 3], w: 400, h: 130, fontSize: 32 },
  // Shout
  'cri-s': { label: 'Cri (S)', border: '3px solid red', lineDash: [], w: 220, h: 90, fontSize: 32 },
  'cri-m': { label: 'Cri (M)', border: '3px solid red', lineDash: [], w: 320, h: 130, fontSize: 36 },
  'cri-l': { label: 'Cri (L)', border: '3px solid red', lineDash: [], w: 480, h: 160, fontSize: 40 },
  // Whisper
  'chuchotement-s': { label: 'Chuchotement (S)', border: '2px dotted blue', lineDash: [2, 2], w: 180, h: 60, fontSize: 24 },
  'chuchotement-m': { label: 'Chuchotement (M)', border: '2px dotted blue', lineDash: [2, 2], w: 260, h: 90, fontSize: 28 },
  'chuchotement-l': { label: 'Chuchotement (L)', border: '2px dotted blue', lineDash: [2, 2], w: 380, h: 120, fontSize: 30 },
};

type BubbleStyleKey = keyof typeof bubbleStyles;

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
});

export const compressImage = async (dataUrl: string, quality = 0.85): Promise<string> => {
    const img = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg', quality);
};

const drawBubble = (ctx: CanvasRenderingContext2D, bubble: Bubble, characters: Character[]) => {
    const style = bubbleStyles[bubble.style as BubbleStyleKey];
    if (!style) return;

    const character = characters.find(c => c.id === bubble.characterId);
    const color = character?.factionColor || style.border.split(' ')[2];
    
    ctx.fillStyle = "white";
    ctx.strokeStyle = color;
    ctx.lineWidth = parseInt(style.border.split(' ')[0], 10);
    ctx.setLineDash(style.lineDash);
    
    ctx.beginPath();
    ctx.roundRect(bubble.x, bubble.y, style.w, style.h, [15]);
    ctx.fill();
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.fillStyle = "black";
    
    const fontSize = bubble.fontSize || style.fontSize;
    ctx.font = `${fontSize}px 'Comic Sans MS', sans-serif`;
    ctx.textBaseline = "top";

    const words = bubble.text.split(' ');
    let line = '';
    let textY = bubble.y + 15;
    const lineHeight = fontSize * 1.1; 
    const padding = 15;

    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > style.w - padding * 2 && n > 0) {
            ctx.fillText(line, bubble.x + padding, textY);
            line = words[n] + ' ';
            textY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, bubble.x + padding, textY);
};

const FontSizeSlider = ({ bubble, onUpdate, lang }: { bubble: Bubble; onUpdate: (updates: Partial<Bubble>) => void; lang: any; }) => {
    const currentSize = bubble.fontSize || 16;
    return (
        <div className="space-y-2 p-3 bg-muted/20 rounded-lg border">
            <Label htmlFor={`font-size-${bubble.id}`} className="flex items-center gap-2 text-sm font-medium">
                <span>📐</span>
                {lang.textSize || "Taille du texte"}
            </Label>
            <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground" style={{ fontSize: "10px" }}>A</span>
                <input
                    id={`font-size-${bubble.id}`}
                    type="range"
                    min="8"
                    max="48"
                    value={currentSize}
                    onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
                    className="flex-1 h-2 bg-gradient-to-r from-blue-200 to-blue-500 rounded-lg slider"
                />
                <span className="text-sm font-mono w-10 text-center bg-background px-2 py-1 rounded border">
                    {currentSize}px
                </span>
            </div>
        </div>
    );
};


export default function ImageEditor({
    imageUrl,
    message,
    characters,
    onSave,
    onClose,
    playerName,
    playerId,
    currentLanguage,
 }: {
    imageUrl: string | null; // Can now be null
    message: Message;
    characters: Character[];
    onSave: (dataUrl: string) => void;
    onClose: () => void;
    playerName: string;
    playerId: string;
    currentLanguage: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentBubbleStyle, setCurrentBubbleStyle] = useState<BubbleStyleKey>("parole-m");
  const { toast } = useToast();
  const lang = i18n[currentLanguage as Language] || i18n.en;


  useEffect(() => {
    if (imageUrl) {
        loadImage(imageUrl).then(setImg).catch(() => console.error("Failed to load image"));
    } else {
        setImg(null); // Explicitly set to null if no URL
    }
  }, [imageUrl]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    canvas.width = img?.width || 900;
    canvas.height = img?.height || 1200;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (img) {
      ctx.drawImage(img, 0, 0);
    } else {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#a0a0a0';
      ctx.font = "30px sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(lang.noImageToEdit, canvas.width / 2, canvas.height / 2);
    }

    bubbles.forEach((bubble) => {
      drawBubble(ctx, bubble, characters);
      const style = bubbleStyles[bubble.style as BubbleStyleKey];
      if (bubble.id === selectedBubbleId) {
        ctx.strokeStyle = "rgba(0, 102, 255, 0.7)";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(bubble.x, bubble.y, style.w, style.h);
        ctx.setLineDash([]);
      }
    });
  }, [img, bubbles, selectedBubbleId, characters, lang.noImageToEdit]);

  const addBubble = (characterId: string) => {
    const character = characters.find(c => c.id === characterId) || (characterId === playerId ? { id: playerId, name: playerName } : null);
    if (!character) return;
    
    const newBubble: Bubble = {
      id: `bubble-${Date.now()}`,
      x: 50,
      y: 50,
      text: lang.newBubbleText,
      style: currentBubbleStyle,
      characterId: character.id,
      fontSize: bubbleStyles[currentBubbleStyle].fontSize
    };
    setBubbles([...bubbles, newBubble]);
    setSelectedBubbleId(newBubble.id);
  };

  const handleAutoInsertBubbles = () => {
      const { content, speakingCharacterNames } = message;
      if (!content) return;

      const dialogueRegex = /"([^"]*)"/g;
      const thoughtRegex = /\*([^*]*)\*/g;
      const newBubbles: Bubble[] = [];
      let yOffset = 20;

      const speakers = (speakingCharacterNames || [])
        .map(name => characters.find(c => c.name === name))
        .filter((c): c is Character => !!c);
        
      let speakerIndex = 0;

      let match;
      while ((match = dialogueRegex.exec(content)) !== null) {
          const speaker = speakers[speakerIndex % speakers.length];
          newBubbles.push({
              id: `bubble-${Date.now()}-${newBubbles.length}`,
              x: 20,
              y: yOffset,
              text: match[1],
              style: 'parole-m',
              characterId: speaker?.id,
              fontSize: bubbleStyles['parole-m'].fontSize,
          });
          yOffset += bubbleStyles['parole-m'].h + 10;
          speakerIndex++;
      }

      while ((match = thoughtRegex.exec(content)) !== null) {
          const speaker = speakers[speakerIndex % speakers.length];
          newBubbles.push({
              id: `bubble-${Date.now()}-${newBubbles.length}`,
              x: 20,
              y: yOffset,
              text: match[1],
              style: 'pensée-m',
              characterId: speaker?.id,
              fontSize: bubbleStyles['pensée-m'].fontSize,
          });
          yOffset += bubbleStyles['pensée-m'].h + 10;
      }

      if (newBubbles.length > 0) {
        setBubbles(prev => [...prev, ...newBubbles]);
        toast({ title: `${newBubbles.length} ${lang.bubblesInserted}`});
      } else {
        toast({ title: lang.noDialogueFound, description: lang.noDialogueFoundDesc, variant: "default" });
      }
  };


  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const canvasX = (x / rect.width) * canvasRef.current.width;
    const canvasY = (y / rect.height) * canvasRef.current.height;

    const clickedBubble = bubbles.slice().reverse().find(b => {
      const style = bubbleStyles[b.style as BubbleStyleKey];
      return canvasX >= b.x && canvasX <= b.x + style.w && canvasY >= b.y && canvasY <= b.y + style.h;
    });

    if (clickedBubble) {
      setSelectedBubbleId(clickedBubble.id);
      setDragging(true);
      setDragOffset({ x: canvasX - clickedBubble.x, y: canvasY - clickedBubble.y });
    } else {
      setSelectedBubbleId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || selectedBubbleId === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const canvasX = (x / rect.width) * canvasRef.current.width;
    const canvasY = (y / rect.height) * canvasRef.current.height;
    setBubbles(currentBubbles => currentBubbles.map(b =>
      b.id === selectedBubbleId ? {...b, x: canvasX - dragOffset.x, y: canvasY - dragOffset.y} : b
    ));
  };

  const handleMouseUp = () => setDragging(false);

  const updateBubble = (id: string, updates: Partial<Bubble>) => {
    setBubbles(currentBubbles => currentBubbles.map(b =>
      b.id === id ? { ...b, ...updates } : b
    ));
  };

  const deleteBubble = () => {
    if (selectedBubbleId === null) return;
    setBubbles(bubbles.filter((b) => b.id !== selectedBubbleId));
    setSelectedBubbleId(null);
  };
  
    const handleSave = async () => {
        if (!canvasRef.current || !img) {
            toast({
                title: lang.noImageToSave,
                description: lang.pleaseUploadImage,
                variant: "destructive"
            });
            return;
        }
        
        try {
            const compressedUrl = await compressImage(canvasRef.current.toDataURL('image/png'), 0.85);
            onSave(compressedUrl);
            toast({
                title: lang.imageSaved,
                description: lang.imageAddedToComic
            })
            onClose();
        } catch(error) {
            toast({
                title: lang.compressionError,
                description: lang.couldNotCompress,
                variant: "destructive"
            });
            console.error(error);
        }
    };
    
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          loadImage(e.target.result as string).then(setImg);
        }
      };
      reader.readAsDataURL(file);
    }
  };


  const selectedBubble = selectedBubbleId !== null ? bubbles.find(b => b.id === selectedBubbleId) : null;
  const speakingCharacters = (message.speakingCharacterNames || [])
      .map(name => characters.find(c => c.name === name))
      .filter((c): c is Character => !!c);

  return (
    <div className="flex flex-col gap-4 items-center p-4 bg-muted/50 rounded-lg h-full">
      <div className="flex-1 w-full overflow-auto border rounded-md relative">
        <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
                cursor: dragging ? "grabbing" : (selectedBubbleId !== null ? "move" : "default"),
                width: "100%",
                height: "auto"
            }}
        />
        {!img && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200/50 backdrop-blur-sm">
            <UploadCloud className="h-16 w-16 text-gray-500 mb-4" />
            <p className="text-gray-600 font-semibold mb-2">{lang.noImageSelected}</p>
            <Button onClick={() => uploadInputRef.current?.click()}>
              {lang.uploadImage}
            </Button>
            <input
              type="file"
              ref={uploadInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        )}
      </div>
      <div className="flex flex-col md:flex-row w-full gap-4">
        <div className="flex-1 space-y-3">
             <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{lang.bubbleStyle}:</span>
                    <Select value={currentBubbleStyle} onValueChange={(e) => setCurrentBubbleStyle(e as BubbleStyleKey)}>
                        <SelectTrigger className="w-[180px] bg-background">
                            <SelectValue placeholder="Style" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(bubbleStyles).map(([key, { label }]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4"/> {lang.addBubble}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => addBubble(playerId)}>
                         <User className="mr-2 h-4 w-4"/> {lang.forHero.replace('{playerName}', playerName)}
                      </DropdownMenuItem>
                       {speakingCharacters.length > 0 && <DropdownMenuSeparator />}
                      {speakingCharacters.map(char => (
                          <DropdownMenuItem key={char.id} onSelect={() => addBubble(char.id)}>
                              <Mic className="mr-2 h-4 w-4" style={{color: char.factionColor}}/> {lang.forSpeaker.replace('{charName}', char.name)}
                          </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={handleAutoInsertBubbles} size="sm" variant="outline">
                    <MessageSquarePlus className="mr-2 h-4 w-4" /> {lang.insertBubblesAuto}
                </Button>
            </div>
            {selectedBubble && (
                <Card className="p-3 border rounded-md bg-background space-y-3">
                    <h3 className="font-semibold">{lang.editBubble}</h3>
                    <Textarea
                    value={selectedBubble.text}
                    onChange={(e) => updateBubble(selectedBubbleId!, { text: e.target.value })}
                    placeholder={lang.bubbleTextPlaceholder}
                    rows={3}
                    />
                    <div className="space-y-2">
                        <Label>{lang.style}</Label>
                        <Select
                            value={selectedBubble.style}
                            onValueChange={(value) => updateBubble(selectedBubbleId!, { style: value as BubbleStyleKey })}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(bubbleStyles).map(([key, { label }]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <FontSizeSlider
                        bubble={selectedBubble}
                        onUpdate={(updates) => updateBubble(selectedBubbleId!, updates)}
                        lang={lang}
                    />
                    <Button onClick={deleteBubble} variant="destructive" size="sm" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4"/>{lang.deleteBubble}
                    </Button>
                </Card>
            )}
        </div>
        <div className="flex flex-col gap-2 md:w-40">
             <Button onClick={handleSave} variant="default" size="lg" disabled={!img}>💾 {lang.saveToComic}</Button>
             <Button onClick={onClose} variant="outline" size="lg">{lang.close}</Button>
        </div>
      </div>
    </div>
  );
}
