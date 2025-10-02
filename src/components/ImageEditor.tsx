
"use client";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Message, Character } from "@/types";
import { MessageSquarePlus } from "lucide-react";


const bubbleTypes = {
  parole: { label: "Parole", border: "2px solid black", lineDash: [] },
  pensée: { label: "Pensée", border: "2px dashed gray", lineDash: [6, 3] },
  cri: { label: "Cri", border: "3px solid red", lineDash: [] },
  chuchotement: { label: "Chuchotement", border: "2px dotted blue", lineDash: [2, 2] },
};
type BubbleType = keyof typeof bubbleTypes;
interface Bubble {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  type: BubbleType;
  color?: string; // NEW: Optional color for the bubble border
}

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

const drawBubble = (ctx: CanvasRenderingContext2D, bubble: Bubble) => {
    const style = bubbleTypes[bubble.type];
    ctx.fillStyle = "white";
    ctx.strokeStyle = bubble.color || style.border.split(' ')[2]; // Use faction color if available
    ctx.lineWidth = parseInt(style.border.split(' ')[0], 10);
    ctx.setLineDash(style.lineDash);
    
    ctx.beginPath();
    ctx.roundRect(bubble.x, bubble.y, bubble.width, bubble.height, [15]);
    ctx.fill();
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.fillStyle = "black";
    ctx.font = "32px 'Comic Sans MS', sans-serif";
    ctx.textBaseline = "top";

    const words = bubble.text.split(' ');
    let line = '';
    let textY = bubble.y + 15;
    const lineHeight = 35;
    const padding = 15;

    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > bubble.width - padding * 2 && n > 0) {
            ctx.fillText(line, bubble.x + padding, textY);
            line = words[n] + ' ';
            textY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, bubble.x + padding, textY);
};


export default function ImageEditor({
    imageUrl,
    message, // NEW: Pass the full message object
    characters, // NEW: Pass all characters to find faction colors
    onSave,
    onClose,
 }: {
    imageUrl: string;
    message: Message; // The message associated with this image
    characters: Character[]; // All current characters
    onSave: (dataUrl: string) => void;
    onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentBubbleType, setCurrentBubbleType] = useState<BubbleType>("parole");
  const { toast } = useToast();

  useEffect(() => {
    loadImage(imageUrl).then(setImg).catch(() => console.error("Failed to load image"));
  }, [imageUrl]);

  useEffect(() => {
    if (!canvasRef.current || !img) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    bubbles.forEach((bubble) => {
      drawBubble(ctx, bubble);
      if (bubble.id === selectedBubbleId) {
        ctx.strokeStyle = "rgba(0, 102, 255, 0.7)";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(bubble.x, bubble.y, bubble.width, bubble.height);
        ctx.setLineDash([]);
      }
    });
  }, [img, bubbles, selectedBubbleId]);

  const addBubble = () => {
    const newBubble: Bubble = {
      id: `bubble-${Date.now()}`,
      x: 50,
      y: 50,
      width: 300,
      height: 120,
      text: "Nouveau texte...",
      type: currentBubbleType,
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
      let match;
      let yOffset = 20;

      // Find speaker colors
      const speakerColors: { [key: string]: string | undefined } = {};
      (speakingCharacterNames || []).forEach(name => {
          const character = characters.find(c => c.name === name);
          if (character) {
              speakerColors[name] = character.factionColor;
          }
      });
      const mainSpeakerColor = speakingCharacterNames && speakingCharacterNames.length > 0 ? speakerColors[speakingCharacterNames[0]] : undefined;

      // Extract dialogues
      while ((match = dialogueRegex.exec(content)) !== null) {
          newBubbles.push({
              id: `bubble-${Date.now()}-${newBubbles.length}`,
              x: 20,
              y: yOffset,
              width: 400,
              height: 100,
              text: match[1],
              type: 'parole',
              color: mainSpeakerColor || '#000000', // Default to black if no speaker color
          });
          yOffset += 110;
      }

      // Extract thoughts
      while ((match = thoughtRegex.exec(content)) !== null) {
          newBubbles.push({
              id: `bubble-${Date.now()}-${newBubbles.length}`,
              x: 20,
              y: yOffset,
              width: 350,
              height: 80,
              text: match[1],
              type: 'pensée',
              color: '#808080' // Thoughts are always neutral gray
          });
          yOffset += 90;
      }

      if (newBubbles.length > 0) {
        setBubbles(prev => [...prev, ...newBubbles]);
        toast({ title: `${newBubbles.length} bulle(s) insérée(s) automatiquement.`});
      } else {
        toast({ title: "Aucun dialogue ou pensée trouvé", description: "Le texte ne contient pas de dialogues (\") ou de pensées (*).", variant: "default" });
      }
  };


  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const canvasX = (x / rect.width) * canvasRef.current.width;
    const canvasY = (y / rect.height) * canvasRef.current.height;
    const clickedBubble = bubbles.slice().reverse().find(
      (b) => canvasX >= b.x && canvasX <= b.x + b.width && canvasY >= b.y && canvasY <= b.y + b.height
    );
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

  const updateText = (text: string) => {
    if (selectedBubbleId === null) return;
    setBubbles(currentBubbles => currentBubbles.map(b =>
      b.id === selectedBubbleId ? { ...b, text } : b
    ));
  };

  const deleteBubble = () => {
    if (selectedBubbleId === null) return;
    setBubbles(bubbles.filter((b) => b.id !== selectedBubbleId));
    setSelectedBubbleId(null);
  };
  
    const handleSave = async () => {
        if (!canvasRef.current) return;
        
        try {
            const compressedUrl = await compressImage(canvasRef.current.toDataURL('image/png'), 0.85);
            onSave(compressedUrl);
            toast({
                title: "Image Sauvegardée",
                description: "Votre image modifiée a été ajoutée à la BD."
            })
            onClose();
        } catch(error) {
            toast({
                title: "Erreur de compression",
                description: "Impossible de compresser l'image.",
                variant: "destructive"
            });
            console.error(error);
        }
    };


  const selectedBubble = selectedBubbleId !== null ? bubbles.find(b => b.id === selectedBubbleId) : null;

  return (
    <div className="flex flex-col gap-4 items-center p-4 bg-muted/50 rounded-lg h-full">
      <div className="flex-1 w-full overflow-auto border rounded-md">
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
      </div>
      <div className="flex flex-col md:flex-row w-full gap-4">
        <div className="flex-1 space-y-3">
             <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Style de bulle :</span>
                    <Select value={currentBubbleType} onValueChange={(e) => setCurrentBubbleType(e as BubbleType)}>
                        <SelectTrigger className="w-[180px] bg-background">
                            <SelectValue placeholder="Style" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(bubbleTypes).map(([key, { label }]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={addBubble} size="sm">➕ Ajouter bulle</Button>
                <Button onClick={handleAutoInsertBubbles} size="sm" variant="outline">
                    <MessageSquarePlus className="mr-2 h-4 w-4" /> Insérer Bulles Auto
                </Button>
            </div>
            {selectedBubble && (
                <div className="w-full p-3 border rounded-md bg-background space-y-3">
                    <h3 className="font-semibold">Éditer la bulle sélectionnée ({bubbleTypes[selectedBubble.type].label})</h3>
                    <Textarea
                    value={selectedBubble.text}
                    onChange={(e) => updateText(e.target.value)}
                    placeholder="Écrivez votre dialogue ici..."
                    rows={3}
                    />
                    <div className="flex items-center gap-2">
                        <label htmlFor="bubble-type-editor">Style:</label>
                        <Select
                            value={selectedBubble.type}
                            onValueChange={(value) => {
                                if (selectedBubbleId) {
                                    setBubbles(bubbles.map(b => b.id === selectedBubbleId ? {...b, type: value as BubbleType} : b));
                                }
                            }}
                        >
                            <SelectTrigger id="bubble-type-editor" className="flex-1">
                                <SelectValue placeholder="Style" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(bubbleTypes).map(([key, { label }]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={deleteBubble} variant="destructive" size="sm">
                        🗑️ Supprimer la bulle
                    </Button>
                </div>
            )}
        </div>
        <div className="flex flex-col gap-2 md:w-40">
             <Button onClick={handleSave} variant="default" size="lg">💾 Sauvegarder dans la BD</Button>
             <Button onClick={onClose} variant="outline" size="lg">Fermer</Button>
        </div>
      </div>
    </div>
  );
}
