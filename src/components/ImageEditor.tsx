
"use client";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

// Définition des styles de bulles
const bubbleTypes = {
  parole: {
    label: "Parole",
    border: "2px solid black",
    lineDash: [],
  },
  pensee: {
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
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  type: BubbleType;
}

export default function ImageEditor({
  imageUrl,
}: {
  imageUrl: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [selectedBubbleIndex, setSelectedBubbleIndex] = useState<number | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentBubbleType, setCurrentBubbleType] = useState<BubbleType>("parole");

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

    bubbles.forEach((bubble, index) => {
      const style = bubbleTypes[bubble.type];
      
      ctx.fillStyle = "white";
      ctx.strokeStyle = style.border.split(' ')[2];
      ctx.lineWidth = parseInt(style.border.split(' ')[0], 10);
      ctx.setLineDash(style.lineDash);

      ctx.beginPath();
      ctx.roundRect(bubble.x, bubble.y, bubble.width, bubble.height, 15);
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

      if (index === selectedBubbleIndex) {
        ctx.strokeStyle = "rgba(0, 102, 255, 0.7)";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(bubble.x, bubble.y, bubble.width, bubble.height);
        ctx.setLineDash([]);
      }
    });
  }, [img, bubbles, selectedBubbleIndex]);

  // 3. Ajouter une bulle
  const addBubble = () => {
    const newBubble: Bubble = {
      x: 50,
      y: 50,
      width: 200,
      height: 80,
      text: "Nouveau texte...",
      type: currentBubbleType,
    };
    setBubbles([...bubbles, newBubble]);
    setSelectedBubbleIndex(bubbles.length);
  };

  // 4. Gérer le clic de la souris
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedBubbleIndex = bubbles.findIndex(
      (b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
    );

    if (clickedBubbleIndex !== -1) {
      setSelectedBubbleIndex(clickedBubbleIndex);
      setDragging(true);
      setDragOffset({
        x: x - bubbles[clickedBubbleIndex].x,
        y: y - bubbles[clickedBubbleIndex].y,
      });
    } else {
      setSelectedBubbleIndex(null);
    }
  };

  // 5. Gérer le déplacement
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || selectedBubbleIndex === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const updatedBubbles = [...bubbles];
    updatedBubbles[selectedBubbleIndex].x = x - dragOffset.x;
    updatedBubbles[selectedBubbleIndex].y = y - dragOffset.y;
    setBubbles(updatedBubbles);
  };

  // 6. Gérer le relâchement du clic
  const handleMouseUp = () => {
    setDragging(false);
  };

  // 7. Mettre à jour le texte
  const updateText = (text: string) => {
    if (selectedBubbleIndex === null) return;
    const updatedBubbles = [...bubbles];
    updatedBubbles[selectedBubbleIndex].text = text;
    setBubbles(updatedBubbles);
  };
  
  // 8. Supprimer la bulle
  const deleteBubble = () => {
      if (selectedBubbleIndex === null) return;
      const updatedBubbles = bubbles.filter((_, index) => index !== selectedBubbleIndex);
      setBubbles(updatedBubbles);
      setSelectedBubbleIndex(null);
  }

  // 9. Exporter l'image
  const exportImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "bande_dessinee.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const selectedBubble =
    selectedBubbleIndex !== null ? bubbles[selectedBubbleIndex] : null;

  return (
    <div className="flex flex-col gap-4 items-center p-4 bg-muted/50 rounded-lg">
      <div className="w-full max-w-3xl overflow-auto border rounded-md">
        <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: dragging ? "grabbing" : (selectedBubbleIndex !== null ? "move" : "default") }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Style de bulle :</span>
            <select
                value={currentBubbleType}
                onChange={(e) => setCurrentBubbleType(e.target.value as BubbleType)}
                className="border p-1 rounded-md bg-background"
            >
                {Object.entries(bubbleTypes).map(([key, { label }]) => (
                <option key={key} value={key}>
                    {label}
                </option>
                ))}
            </select>
        </div>
        <Button onClick={addBubble} size="sm">➕ Ajouter bulle</Button>
        <Button onClick={exportImage} variant="default" size="sm">
          💾 Exporter en PNG
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
            <Button onClick={deleteBubble} variant="destructive" size="sm">
                🗑️ Supprimer la bulle
            </Button>
        </div>
      )}
    </div>
  );
}
