"use client";

import { useEffect, useState } from "react";
import { listProfiles, updateProfile } from "@/lib/data";
import { Profile } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { PERMISSION_KEYS, PERMISSION_LABELS } from "@/lib/permissions";

export default function TeamPage() {
  const { profile: me } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    listProfiles().then((p) => {
      setProfiles(p.sort((a, b) => a.full_name.localeCompare(b.full_name, "tr")));
      setLoading(false);
    });
  }, []);

  async function toggle(target: Profile, field: "is_admin" | (typeof PERMISSION_KEYS)[number], value: boolean) {
    const key = `${target.id}:${field}`;
    setSavingKey(key);
    try {
      const updated = await updateProfile(target.id, { [field]: value });
      if (updated) setProfiles((prev) => prev.map((p) => (p.id === target.id ? updated : p)));
    } finally {
      setSavingKey(null);
    }
  }

  if (!me?.is_admin) {
    return <p className="text-sm text-neutral-500">Bu sayfayı görüntüleme yetkiniz yok.</p>;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Ekip ve Yetkiler</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Her kullanıcı için hangi işlemleri yapabileceğini buradan belirleyebilirsiniz. Yönetici yetkisi olan
          kullanıcılar her şeyi yapabilir.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : (
        <div className="space-y-4">
          {profiles.map((p) => (
            <div key={p.id} className="card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-neutral-800">{p.full_name}</h2>
                <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-green-800">
                  <input
                    type="checkbox"
                    checked={p.is_admin}
                    disabled={savingKey === `${p.id}:is_admin`}
                    onChange={(e) => toggle(p, "is_admin", e.target.checked)}
                  />
                  Yönetici (tüm yetkiler)
                </label>
              </div>

              {!p.is_admin && (
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 border-t border-neutral-100 pt-3 sm:grid-cols-2">
                  {PERMISSION_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        checked={p[key]}
                        disabled={savingKey === `${p.id}:${key}`}
                        onChange={(e) => toggle(p, key, e.target.checked)}
                      />
                      {PERMISSION_LABELS[key]}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
