
"use client";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComicPage } from "@/types";

// Définition des types de bulles et de la structure d'une planche
const bubbleTypes = {
  parole: {
    label: "Parole",
    border: "2px solid black",
    lineDash: [],
  },
  pensée: {
    label: "Pensée",
    border: "2px dashed gray",
    lineDash: [6, 3],
  },
  cri: {
    label: "Cri",
    border: "3px solid red",
    lineDash: [],
  },
  chuchotement: {
    label: "Chuchotement",
    border: "2px dotted blue",
    lineDash: [2, 2],
  },
};

type BubbleType = keyof typeof bubbleTypes;

interface Bubble {
  id: string; // Add ID for better state management
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  type: BubbleType;
}

// Structure d'un panneau de BD (utilisée pour la sauvegarde)
interface ComicPanel {
  id: string;
  imageUrl?: string | null;
  bubbles: Bubble[];
}

export default function ImageEditor({
  imageUrl,
}: {
  imageUrl: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentBubbleType, setCurrentBubbleType] = useState<BubbleType>("parole");
  const { toast } = useToast();

  // 1. Charger l'image
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageUrl;
    image.onload = () => setImg(image);
    image.onerror = () => console.error("Failed to load image");
  }, [imageUrl]);

  // 2. Dessiner le canvas
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
      // Simple rect for this editor, roundRect is in the ComicPageEditor
      ctx.rect(bubble.x, bubble.y, bubble.width, bubble.height);
      ctx.fill();
      ctx.stroke();

      ctx.setLineDash([]); // Reset line dash for text
      
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

  // 3. Ajouter une bulle
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

  // 4. Gérer le clic de la souris
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedBubble = bubbles.slice().reverse().find(
      (b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
    );

    if (clickedBubble) {
      setSelectedBubbleId(clickedBubble.id);
      setDragging(true);
      setDragOffset({
        x: x - clickedBubble.x,
        y: y - clickedBubble.y,
      });
    } else {
      setSelectedBubbleId(null);
    }
  };

  // 5. Gérer le déplacement
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || selectedBubbleId === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setBubbles(currentBubbles => currentBubbles.map(b => 
        b.id === selectedBubbleId ? {...b, x: x - dragOffset.x, y: y - dragOffset.y} : b
    ));
  };

  // 6. Gérer le relâchement du clic
  const handleMouseUp = () => {
    setDragging(false);
  };

  // 7. Mettre à jour le texte
  const updateText = (text: string) => {
    if (selectedBubbleId === null) return;
    setBubbles(currentBubbles => currentBubbles.map(b =>
        b.id === selectedBubbleId ? { ...b, text } : b
    ));
  };
  
  // 8. Supprimer la bulle
  const deleteBubble = () => {
      if (selectedBubbleId === null) return;
      setBubbles(bubbles.filter((b) => b.id !== selectedBubbleId));
      setSelectedBubbleId(null);
  }

  // 9. Exporter l'image
  const exportImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "image_avec_bulles.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };
  
  const addToComicPage = () => {
    if (!imageUrl) {
        toast({ title: "Erreur", description: "URL de l'image source manquante.", variant: "destructive" });
        return;
    }
    try {
        const savedComicBook = localStorage.getItem("comic_book_v1");
        
        let comicBook: ComicPage[] = savedComicBook ? JSON.parse(savedComicBook) : [];
        let panelFound = false;

        for (let i = 0; i < comicBook.length; i++) {
            const page = comicBook[i];
            const firstEmptyPanelIndex = page.panels.findIndex(p => !p.imageUrl);

            if (firstEmptyPanelIndex !== -1) {
                // IMPORTANT: Do NOT save the image data URI. This will exceed localStorage quota.
                // We save the original imageUrl (which might be a data URI from the adventure display, but we'll handle that)
                // and the bubbles separately. The ComicPageEditor will be responsible for rendering.
                
                // For now, let's just mark the panel as having content, but without the image data itself
                // to prevent quota errors. A better approach is needed.
                page.panels[firstEmptyPanelIndex].imageUrl = "placeholder"; // Use a placeholder to indicate it's filled
                page.panels[firstEmptyPanelIndex].bubbles = bubbles;
                panelFound = true;
                
                // This will still fail if bubbles are too large, but it avoids the image data issue.
                try {
                  localStorage.setItem("comic_book_v1", JSON.stringify(comicBook));
                  toast({
                      title: "Image Ajoutée (Métadonnées)!",
                      description: `Les bulles ont été ajoutées au panneau ${firstEmptyPanelIndex + 1} de la planche ${i + 1}. Vous devez exporter et importer l'image manuellement.`,
                  });
                } catch (e: any) {
                  if (e.name === 'QuotaExceededError') {
                     toast({
                        title: "Erreur de Quota",
                        description: "Le stockage local est plein. Impossible de sauvegarder la nouvelle planche.",
                        variant: "destructive"
                     });
                  } else {
                     throw e;
                  }
                }
                break; 
            }
        }

        if (!panelFound) {
            toast({
                title: "Planches Complètes",
                description: "Aucun panneau vide trouvé. Veuillez ajouter une nouvelle planche sur la page BD.",
                variant: "destructive",
            });
        }
    } catch (error) {
        console.error("Failed to add to comic page:", error);
        toast({ title: "Erreur de Sauvegarde", description: "Impossible d'ajouter les bulles à la planche.", variant: "destructive" });
    }
  };


  const selectedBubble =
    selectedBubbleId !== null ? bubbles.find(b => b.id === selectedBubbleId) : null;

  return (
    <div className="flex flex-col gap-4 items-center p-4 bg-muted/50 rounded-lg">
      <div className="w-full max-w-3xl overflow-auto border rounded-md">
        <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: dragging ? "grabbing" : (selectedBubbleId !== null ? "move" : "default") }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Style de bulle :</span>
             <Select
                value={currentBubbleType}
                onValueChange={(e) => setCurrentBubbleType(e as BubbleType)}
            >
                <SelectTrigger className="w-[180px] bg-background">
                    <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(bubbleTypes).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <Button onClick={addBubble} size="sm">➕ Ajouter bulle</Button>
        <Button onClick={exportImage} variant="secondary" size="sm">
          💾 Exporter en PNG
        </Button>
         <Button onClick={addToComicPage} variant="default" size="sm">
          📖 Ajouter à la planche BD
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
                <Label htmlFor="bubble-type-editor">Style:</Label>
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
                            <SelectItem key={key} value={key}>
                                {label}
                            </SelectItem>
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
