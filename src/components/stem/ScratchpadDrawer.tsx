import { useState } from "react";
import { Calculator } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScratchpadCanvas } from "./ScratchpadCanvas";

/**
 * Tombol "Papan hitung" yang membuka drawer berisi canvas coret-coret.
 * Bisa dipakai mandiri atau di dalam StemPractice.
 */
export function ScratchpadDrawer({ height = 340 }: { height?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="sm" variant="secondary" className="h-8 text-xs gap-1">
          <Calculator className="w-3.5 h-3.5" /> Papan hitung
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Papan hitung
          </DrawerTitle>
          <DrawerDescription>
            Coret-coret bebas di sini — tidak mempengaruhi jawabanmu.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <ScratchpadCanvas height={height} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}