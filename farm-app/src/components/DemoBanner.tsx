import { isDemoMode } from "@/lib/supabaseClient";

export function DemoBanner() {
  if (!isDemoMode) return null;
  return (
    <div className="bg-amber-100 border-b border-amber-300 px-4 py-1.5 text-center text-xs font-medium text-amber-900">
      Demo modu: veriler bu tarayicida saklaniyor. Supabase baglanti bilgileri
      eklendiginde gercek veritabanina gecilecek.
    </div>
  );
}
