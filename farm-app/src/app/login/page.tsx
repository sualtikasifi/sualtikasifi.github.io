"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { isDemoMode } from "@/lib/supabaseClient";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Marder Ciftlik Yonetimi</h1>
        <p className="mt-1 text-sm text-neutral-500">Devam etmek icin giris yapin.</p>

        {isDemoMode && (
          <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            Demo modu aktif: Supabase baglantisi henuz kurulmadi. E-posta/sifre
            girmeden asagidaki butona basarak demo hesabiyla girebilirsiniz.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {!isDemoMode && (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-700">E-posta</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Sifre</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
          >
            {isDemoMode ? "Demo hesabiyla gir" : submitting ? "Giris yapiliyor..." : "Giris yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
