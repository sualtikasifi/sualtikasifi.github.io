import Link from "next/link";

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
  // Verilirse: solda buyuk bir geri butonu, ortada baslik, sagda rozet
  // duzenine gecilir (alt sayfalarda "ust sayfaya don" icin).
  backHref?: string;
}

// Sayfa ustu basligi: renkli/emoji rozet + baslik + opsiyonel aciklama ve
// aksiyon butonlari. Modul sayfalari arasinda tutarli bir gorunum saglar.
export function PageHeader({ icon, title, subtitle, color = "green", actions, backHref }: Props) {
  if (backHref) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            aria-label="Geri"
            className="btn-secondary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-xl font-bold text-neutral-900">{title}</h1>
            {subtitle && <p className="truncate text-xs text-neutral-500">{subtitle}</p>}
          </div>
          <span className={`page-header-icon bg-gradient-to-br text-white ${GRADIENTS[color]}`}>{icon}</span>
        </div>
        {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
      </div>
    );
  }

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
