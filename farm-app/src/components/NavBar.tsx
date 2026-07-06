"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/", label: "Panel" },
  { href: "/calves", label: "Buzağılar" },
  { href: "/treatments", label: "Mastitler" },
  { href: "/inseminations", label: "Tohumlama" },
  { href: "/bulls", label: "Boğalar" },
  { href: "/opu", label: "OPU/Embriyo" },
  { href: "/tasks", label: "Görevler" },
  { href: "/medicines", label: "İlaç Stoğu" },
  { href: "/notifications/new", label: "Duyuru" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold tracking-tight text-green-800">🐄 Marder Çiftlik</span>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/herd" className="rounded-md px-2 py-1 hover:bg-neutral-100 hover:underline">
            Sürü Bilgileri
          </Link>
          <Link href="/profile" className="max-w-[35vw] truncate rounded-md px-2 py-1 hover:bg-neutral-100 hover:underline">
            {profile?.full_name}
          </Link>
          <button onClick={handleSignOut} className="rounded-md px-2 py-1 transition-colors hover:bg-neutral-100">
            Çıkış
          </button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 pb-2.5 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 rounded-md px-2.5 py-1.5 font-medium transition-colors ${
              pathname === link.href
                ? "bg-green-700 text-white shadow-sm"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
