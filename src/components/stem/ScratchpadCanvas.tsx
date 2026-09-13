import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tool = "pen" | "eraser";

const PALETTE = ["#1d4ed8", "#dc2626", "#059669", "#111827", "#f59e0b"];

/**
 * Canvas coret-coret sederhana (pointer events + DPR-aware).
 * Tidak menyimpan state ke server — murni untuk menghitung di layar.
 */
export function ScratchpadCanvas({
  className,
  height = 340,
}: {
  className?: string;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PALETTE[0]!);
  const [width, setWidth] = useState(2.5);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(1, Math.floor(wrap.getBoundingClientRect().width));
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [height]);

  useEffect(() => {
    setupCanvas();
    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setupCanvas]);

  const localPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = localPos(e);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = localPos(e);
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = tool === "eraser" ? width * 7 : width;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant={tool === "pen" ? "default" : "secondary"}
          className="h-7 text-xs gap-1"
          onClick={() => setTool("pen")}
        >
          <Pencil className="w-3.5 h-3.5" /> Pena
        </Button>
        <Button
          size="sm"
          variant={tool === "eraser" ? "default" : "secondary"}
          className="h-7 text-xs gap-1"
          onClick={() => setTool("eraser")}
        >
          <Eraser className="w-3.5 h-3.5" /> Hapus
        </Button>

        <div className="flex items-center gap-1 ml-1" aria-label="Warna pena">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Warna ${c}`}
              onClick={() => {
                setColor(c);
                setTool("pen");
              }}
              className={cn(
                "w-5 h-5 rounded-full border transition-transform",
                color === c && tool === "pen"
                  ? "ring-2 ring-offset-1 ring-primary scale-110 border-transparent"
                  : "border-border",
              )}
              style={{ background: c }}
            />
          ))}
        </div>

        <input
          type="range"
          min={1}
          max={8}
          step={0.5}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="w-20 ml-auto"
          aria-label="Ketebalan pena"
        />
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={clear}>
          <Trash2 className="w-3.5 h-3.5" /> Bersihkan
        </Button>
      </div>

      <div
        ref={wrapRef}
        className="rounded-xl border border-border bg-background overflow-hidden touch-none"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          className="block w-full cursor-crosshair"
        />
      </div>
    </div>
  );
}