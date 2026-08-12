"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

const links = [
  { href: "/", label: "Panel", icon: "🏠" },
  { href: "/calves", label: "Buzağılar", icon: "🐮" },
  { href: "/treatments", label: "Mastitler", icon: "💉" },
  { href: "/bulls", label: "Boğalar", icon: "🐂" },
  { href: "/opu", label: "OPU/Embriyo", icon: "🧬" },
  { href: "/tasks", label: "Görevler", icon: "✅" },
  { href: "/medicines", label: "İlaç Stoğu", icon: "💊" },
  { href: "/leave", label: "İzin Takvimi", icon: "🗓️" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const navLinks = [
    ...links,
    ...(hasPermission(profile, "can_send_announcements") ? [{ href: "/notifications/new", label: "Duyuru", icon: "📣" }] : []),
    ...(profile?.is_admin ? [{ href: "/team", label: "Ekip ve Yetkiler", icon: "🛡️" }] : []),
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200/80 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-700 text-lg shadow-sm shadow-green-900/20">
            🐄
          </span>
          <span className="text-sm font-bold tracking-tight text-green-900">Marder Çiftlik</span>
        </Link>
        <div className="flex items-center gap-1 text-sm text-neutral-500">
          <Link
            href="/profile"
            className="max-w-[32vw] truncate rounded-lg px-2.5 py-1.5 font-medium transition-colors hover:bg-green-50 hover:text-green-800"
          >
            👤 {profile?.full_name}
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded-lg px-2.5 py-1.5 font-medium text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            Çıkış
          </button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2.5 text-sm">
        {navLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                active
                  ? "bg-gradient-to-b from-green-600 to-green-700 text-white shadow-sm shadow-green-900/20"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <span aria-hidden>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
