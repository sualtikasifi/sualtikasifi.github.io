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
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-green-50 to-neutral-100 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-md">
        <div className="mb-1 text-3xl">🐄</div>
        <h1 className="text-xl font-semibold text-neutral-900">Marder Çiftlik Yönetimi</h1>
        <p className="mt-1 text-sm text-neutral-500">Devam etmek için giriş yapın.</p>

        {isDemoMode && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Demo modu aktif: Supabase bağlantısı henüz kurulmadı. E-posta/şifre
            girmeden aşağıdaki butona basarak demo hesabıyla girebilirsiniz.
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
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Şifre</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input mt-1"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {isDemoMode ? "Demo hesabıyla gir" : submitting ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
