const GRADIENTS = {
  green: "from-green-500 to-green-700",
  rose: "from-rose-500 to-rose-700",
  sky: "from-sky-500 to-sky-700",
  purple: "from-purple-500 to-purple-700",
  amber: "from-amber-500 to-amber-600",
  teal: "from-teal-500 to-teal-700",
  slate: "from-slate-600 to-slate-800",
} as const;

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  color?: keyof typeof GRADIENTS;
  actions?: React.ReactNode;
}

// Sayfa ustu basligi: renkli/emoji rozet + baslik + opsiyonel aciklama ve
// aksiyon butonlari. Modul sayfalari arasinda tutarli bir gorunum saglar.
export function PageHeader({ icon, title, subtitle, color = "green", actions }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="page-header">
        <span className={`page-header-icon bg-gradient-to-br text-white ${GRADIENTS[color]}`}>{icon}</span>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
          {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
