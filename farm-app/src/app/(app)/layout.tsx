"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";
import { DemoBanner } from "@/components/DemoBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/login");
    }
  }, [loading, profile, router]);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">Yükleniyor...</div>;
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DemoBanner />
      <NavBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
