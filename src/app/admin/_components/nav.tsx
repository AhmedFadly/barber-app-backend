"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Today", icon: "◐" },
  { href: "/admin/appointments", label: "Appointments", icon: "▦" },
  { href: "/admin/customers", label: "Customers", icon: "◎" },
  { href: "/admin/services", label: "Services", icon: "✂" },
  { href: "/admin/barbers", label: "Barbers", icon: "◈" },
  { href: "/admin/branches", label: "Branches", icon: "⌂" },
  { href: "/admin/news", label: "News", icon: "✦" },
  { href: "/admin/gift-cards", label: "Gift cards", icon: "◇" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "nav-link active" : "nav-link"}>
            <span className="nav-icon" aria-hidden>
              {l.icon}
            </span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
