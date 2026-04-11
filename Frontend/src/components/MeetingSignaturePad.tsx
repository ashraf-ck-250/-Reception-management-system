import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Pen } from "lucide-react";

interface MeetingSignaturePadProps {
  onSignatureChange: (dataUrl: string) => void;
  width?: number;
  height?: number;
  className?: string;
}

export default function MeetingSignaturePad({
  onSignatureChange,
  width = 520,
  height = 160,
  className = ""
}: MeetingSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set drawing styles
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setIsEmpty(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ("touches" in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveSignature();
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSignatureChange(dataUrl);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    setIsEmpty(true);
    onSignatureChange("");
  };

  return (
    <div className={`border border-border rounded-lg ${className}`}>
      <div className="p-2 bg-muted/50 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Pen size={16} />
          <span>Draw your signature</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearSignature}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <Trash2 size={16} />
        </Button>
      </div>
      <div className="p-2 bg-background">
        <canvas
          ref={canvasRef}
          className="border border-border rounded cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ width, height }}
        />
      </div>
    </div>
  );
}
