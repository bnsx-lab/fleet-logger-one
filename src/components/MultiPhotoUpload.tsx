import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Item = { file: File; preview: string };

type Props = {
  value: File[];
  onChange: (files: File[]) => void;
  max?: number;
  disabled?: boolean;
  label?: string;
};

export const MultiPhotoUpload = ({ value, onChange, max = 8, disabled, label = "Adicionar foto(s)" }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const items: Item[] = value.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));

  const add = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    const incoming = Array.from(files);
    const valid: File[] = [];
    for (const f of incoming) {
      if (!f.type.startsWith("image/")) { toast.error(`Ignorado (não é imagem): ${f.name}`); continue; }
      if (f.size > 12 * 1024 * 1024) { toast.error(`Imagem maior que 12MB: ${f.name}`); continue; }
      valid.push(f);
    }
    const next = [...value, ...valid].slice(0, max);
    if (value.length + valid.length > max) toast.info(`Limite de ${max} fotos.`);
    onChange(next);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => add(e.target.files)}
        disabled={disabled || busy}
      />
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((it, idx) => (
            <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border border-border">
              <img src={it.preview} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow hover:bg-background"
                aria-label="Remover"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy || value.length >= max}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
        {value.length >= max ? `Limite atingido (${max})` : `${label}${value.length > 0 ? ` (${value.length})` : ""}`}
      </Button>
    </div>
  );
};
