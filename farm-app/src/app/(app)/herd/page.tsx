"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default function HerdInfoPage() {
  const { profile } = useAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Sürü Bilgileri</h1>

      {hasPermission(profile, "can_manage_animals") && (
        <div className="card">
          <h2 className="text-sm font-semibold text-neutral-800">Toplu veri aktarımı</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Excel dosyasından toplu hayvan kaydı aktarın.
          </p>
          <Link href="/animals/import" className="btn-secondary mt-3 inline-block text-sm">
            Excel&apos;den toplu aktar
          </Link>
        </div>
      )}
    </div>
  );
}
