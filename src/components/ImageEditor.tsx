
"use client";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComicPage, SaveData } from "@/types";

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
}

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
});

const compressImage = async (dataUrl: string, quality = 0.8): Promise<string> => {
    const img = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg', quality);
};


export default function ImageEditor({ imageUrl }: { imageUrl: string; }) {
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
      const style = bubbleTypes[bubble.type];
      ctx.fillStyle = "white";
      ctx.strokeStyle = style.border.split(' ')[2];
      ctx.lineWidth = parseInt(style.border.split(' ')[0], 10);
      ctx.setLineDash(style.lineDash);
      ctx.beginPath();
      ctx.rect(bubble.x, bubble.y, bubble.width, bubble.height);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "black";
      ctx.font = "16px Arial";
      ctx.textBaseline = "top";
      const words = bubble.text.split(' ');
      let line = '';
      let textY = bubble.y + 10;
      const lineHeight = 20;
      const padding = 10;
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
      width: 200,
      height: 80,
      text: "Nouveau texte...",
      type: currentBubbleType,
    };
    setBubbles([...bubbles, newBubble]);
    setSelectedBubbleId(newBubble.id);
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

  const addToComicPage = async () => {
    if (!canvasRef.current) return;
    try {
        const stateString = localStorage.getItem('currentAdventureState');
        if (!stateString) {
            toast({ title: "Erreur", description: "Aucune aventure active pour sauvegarder l'image.", variant: "destructive"});
            return;
        }
        const currentAdventure: SaveData = JSON.parse(stateString);
        const storyId = currentAdventure.adventureSettings.world; // Using world title as a pseudo-id for the story

        const storageKey = `comic_book_v1_${storyId}`;

        const dataUrlWithBubbles = canvasRef.current.toDataURL('image/png');
        const compressedDataUrl = await compressImage(dataUrlWithBubbles, 0.8);

        const savedComicStr = localStorage.getItem(storageKey);
        let comicBook: ComicPage[] = savedComicStr ? JSON.parse(savedComicStr) : [createNewPage()];
        
        let panelFound = false;
        for (let i = 0; i < comicBook.length; i++) {
            const page = comicBook[i];
            const firstEmptyPanelIndex = page.panels.findIndex(p => !p.imageUrl);
            if (firstEmptyPanelIndex !== -1) {
                page.panels[firstEmptyPanelIndex].imageUrl = compressedDataUrl;
                panelFound = true;
                
                localStorage.setItem(storageKey, JSON.stringify(comicBook));
                
                toast({
                    title: "Image Ajoutée !",
                    description: `L'image a été ajoutée à l'album de "${storyId}".`,
                });
                break;
            }
        }
        if (!panelFound) {
            toast({
                title: "Aucun panneau vide",
                description: "Veuillez ajouter une nouvelle planche ou un nouveau panneau dans l'éditeur de BD.",
                variant: "destructive"
            });
        }
    } catch (e) {
        toast({ title: "Erreur", description: "Impossible d'ajouter l'image à la planche.", variant: "destructive" });
    }
  };
  
    const exportImage = async () => {
        if (!canvasRef.current) return;
        
        const compressedUrl = await compressImage(canvasRef.current.toDataURL('image/png'), 0.85);

        const link = document.createElement("a");
        link.download = "panneau_bd.jpg";
        link.href = compressedUrl;
        link.click();
        toast({
            title: "Image Exportée",
            description: "Votre panneau compressé a été sauvegardé."
        })
    };

    const createNewPage = (): ComicPage => ({
      id: `page-${Date.now()}`,
      panels: Array.from({ length: 4 }, () => ({ id: `panel-${Math.random()}`, bubbles: [] })),
      gridCols: 2,
    });


  const selectedBubble = selectedBubbleId !== null ? bubbles.find(b => b.id === selectedBubbleId) : null;

  return (
    <div className="flex flex-col gap-4 items-center p-4 bg-muted/50 rounded-lg">
      <div className="w-full max-w-3xl overflow-auto border rounded-md">
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
        <Button onClick={addToComicPage} variant="default" size="sm">🖼️ Ajouter à la Planche BD</Button>
        <Button onClick={exportImage} variant="secondary" size="sm">💾 Exporter en JPG</Button>
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
  );
}
