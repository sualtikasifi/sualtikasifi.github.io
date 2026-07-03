import { isDemoMode } from "@/lib/supabaseClient";

export function DemoBanner() {
  if (!isDemoMode) return null;
  return (
    <div className="border-b border-amber-300 bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900">
      Demo modu: veriler bu tarayıcıda saklanıyor. Supabase bağlantı bilgileri
      eklendiğinde gerçek veritabanına geçilecek.
    </div>
  );
}
