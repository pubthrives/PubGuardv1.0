// app/layout.tsx
"use client";

import "./globals.css";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Shield, AlertTriangle, User, Settings, Globe } from "lucide-react";

// 🔵 Move NavItem OUTSIDE component (fixes static-components ESLint error)
function NavItem({
  href,
  icon,
  label,
  currentPath,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  currentPath: string;
}) {
  const isActive = currentPath === href;


  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
        ? "bg-blue-500/10 text-blue-600 shadow-sm ring-1 ring-blue-500/20"
        : "text-gray-700 hover:bg-gray-100/50 hover:text-gray-900"
        }`}
    >
      <span
        className={`p-1.5 rounded-lg ${isActive ? "bg-blue-500 text-white" : "text-gray-500"
          }`}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);

  // 🟢 FIX: useEffect should not setState synchronously
  useEffect(() => {
    Promise.resolve().then(() => setHydrated(true));
  }, []);

  // 🟢 FIXED: Removed setLoggedIn since it's not defined or needed
  // We only need to handle redirection, not track login state here
  useEffect(() => {
    if (!hydrated) return;

    Promise.resolve().then(() => {
      const local = localStorage.getItem("isLoggedIn");
      const cookie = document.cookie.includes("isLoggedIn=true");
      const isLogged = !!local || cookie;

      // Only handle redirection - no need to store login state here
      if (!isLogged && pathname !== "/login") {
        router.replace("/login");
      }
    });
  }, [hydrated, pathname, router]);

  if (!hydrated) {
    return (
      <html lang="en">
        <body className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">Loading...</p>
        </body>
      </html>
    );
  }

  if (pathname === "/login") {
    return (
      <html lang="en">
        <body className="min-h-screen bg-gray-100">{children}</body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {/* Sidebar */}
        <aside className="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="px-6 pt-8 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Shield className="text-white" size={18} />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">PubGuard</h1>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            <NavItem href="/" icon={<Home size={18} />} label="Overview" currentPath={pathname} />
            <NavItem href="/sites" icon={<Globe size={18} />} label="Sites" currentPath={pathname} />
            <NavItem
              href="/violations"
              icon={<AlertTriangle size={18} />}
              label="Violations"
              currentPath={pathname}
            />
            <NavItem
              href="/ivt-blocker"
              icon={<Shield size={18} />}
              label="IVT Blocker"
              currentPath={pathname}
            />
            <NavItem
              href="/grant-access"
              icon={<User size={18} />}
              label="Grant Access"
              currentPath={pathname}
            />
            <NavItem
              href="/settings"
              icon={<Settings size={18} />}
              label="Settings"
              currentPath={pathname}
            />
          </nav>
        </aside>

        {/* Main content */}
        <main className="ml-64 p-6">{children}</main>
      </body>
    </html>
  );
}