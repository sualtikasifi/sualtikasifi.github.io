// Supabase network-level hatalarinda (Postgrest istegi fetch asamasinda
// basarisiz olursa) hata gercek bir Error degil, sadece {message,...}
// tasiyan duz bir nesne olabilir - ayrica bazen mesaj alani bos string
// olarak gelir. Bu yuzden hem instanceof Error'a guvenmiyoruz hem de bos
// mesaji kullanici arayuzunde bos bir satir olarak birakmiyoruz.
export function describeError(err: unknown, fallback: string): string {
  const msg =
    err instanceof Error
      ? err.message
      : err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string"
        ? (err as { message: string }).message
        : "";
  if (!msg) return fallback;
  if (/failed to fetch|network|abort|load failed|timeout/i.test(msg)) {
    return "Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.";
  }
  if (/row-level security|permission denied/i.test(msg)) {
    return "Bu işlem için yetkiniz yok. Yöneticinize başvurun.";
  }
  return msg;
}
