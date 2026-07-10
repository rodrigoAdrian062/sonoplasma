import { useFaixas } from '@/hooks/useFaixas';
import { resolveLucide } from '@/lib/faixaIcons';

// Faixa comemorativa exibida no topo da página inicial
export function CommemorativeBanner() {
  const { current } = useFaixas();
  if (!current) return null;

  const Icon = resolveLucide(current.icone);

  return (
    <div
      className="w-full rounded-xl px-4 py-3 mb-6 flex items-center gap-3 shadow-lg animate-fade-in"
      style={{
        background: `linear-gradient(135deg, ${current.corFundo}, ${current.corFundo}cc)`,
        color: current.corTexto,
      }}
      role="status"
    >
      <div
        className="shrink-0 rounded-full p-2"
        style={{ backgroundColor: `${current.corTexto}22` }}
      >
        <Icon size={22} style={{ color: current.corTexto }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
          {current.def.nome}
        </p>
        <p className="text-sm sm:text-base font-medium leading-snug">
          {current.texto}
        </p>
      </div>
    </div>
  );
}
