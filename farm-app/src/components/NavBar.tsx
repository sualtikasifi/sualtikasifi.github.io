"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/", label: "Panel" },
  { href: "/calves", label: "Buzagilar" },
  { href: "/treatments", label: "Mastitler" },
  { href: "/inseminations", label: "Tohumlama" },
  { href: "/bulls", label: "Bogalar" },
  { href: "/opu", label: "OPU/Embriyo" },
  { href: "/tasks", label: "Gorevler" },
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
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2.5">
        <span className="text-sm font-semibold text-green-800">Marder Ciftlik</span>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/profile" className="hidden hover:underline sm:inline">
            {profile?.full_name}
          </Link>
          <button onClick={handleSignOut} className="rounded-md px-2 py-1 hover:bg-neutral-100">
            Cikis
          </button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 rounded-md px-2.5 py-1.5 ${
              pathname === link.href
                ? "bg-green-700 text-white"
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
