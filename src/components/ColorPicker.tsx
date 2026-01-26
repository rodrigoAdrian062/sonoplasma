import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Dourado', hex: '#D4AF37' },
  { name: 'Azul Royal', hex: '#4169E1' },
  { name: 'Verde Esmeralda', hex: '#50C878' },
  { name: 'Roxo', hex: '#8B5CF6' },
  { name: 'Vermelho', hex: '#EF4444' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Laranja', hex: '#F97316' },
  { name: 'Ciano', hex: '#06B6D4' },
  { name: 'Âmbar', hex: '#F59E0B' },
  { name: 'Índigo', hex: '#6366F1' },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-3">
      {/* Preset colors */}
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.hex}
            type="button"
            onClick={() => onChange(color.hex)}
            className={cn(
              'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all',
              value.toLowerCase() === color.hex.toLowerCase()
                ? 'border-foreground scale-110'
                : 'border-transparent hover:scale-105'
            )}
            style={{ backgroundColor: color.hex }}
            title={color.name}
          >
            {value.toLowerCase() === color.hex.toLowerCase() && (
              <Check size={16} className="text-white drop-shadow-md" />
            )}
          </button>
        ))}
      </div>

      {/* Custom color picker */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Cor personalizada:</label>
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border border-border"
          />
        </div>
        <span className="text-sm text-muted-foreground font-mono uppercase">
          {value}
        </span>
      </div>
    </div>
  );
}
