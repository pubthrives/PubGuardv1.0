"use client";

import "./globals.css";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Shield,
  AlertTriangle,
  User,
  Settings,
  LogOut,
  Menu,
  Globe,
} from "lucide-react";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;

    const isLoggedLocal =
      typeof window !== "undefined" && !!localStorage.getItem("isLoggedIn");

    const cookies = typeof document !== "undefined" ? document.cookie : "";
    const isLoggedCookie = cookies.includes("isLoggedIn=true");

    const isLogged = isLoggedLocal || isLoggedCookie;
    setLoggedIn(isLogged);

    if (!isLogged && pathname !== "/login") {
      router.replace("/login");
    }
  }, [hydrated, pathname, router]);

  if (!hydrated) {
    return (
      <html lang="en">
        <body className="min-h-screen flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-50 to-gray-100">
          <p className="text-lg font-light">Loading...</p>
        </body>
      </html>
    );
  }

  if (pathname === "/login") {
    return (
      <html lang="en">
        <body className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          {children}
        </body>
      </html>
    );
  }

  const NavItem = ({
    href,
    icon,
    children,
  }: {
    href: string;
    icon: React.ReactNode;
    children: ReactNode;
  }) => {
    const isActive = pathname === href;
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
        <span>{children}</span>
      </Link>
    );
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 font-sans antialiased overflow-hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-md bg-white shadow-md text-gray-600"
        >
          <Menu size={20} />
        </button>

        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-white/80 backdrop-blur-md border-r border-gray-200 flex flex-col z-30 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            }`}
        >
          <div className="px-6 pt-8 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Shield className="text-white" size={18} />
              </div>
              <div>
                <h1 className="text-lg font-semibold">PubGuard</h1>
                <p className="text-xs text-gray-500">Compliance Dashboard</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-1">
              <li>
                <NavItem href="/" icon={<Home size={18} />}>
                  Overview
                </NavItem>
              </li>
              <li>
                <NavItem href="/sites" icon={<Globe size={18} />}>
                  Sites
                </NavItem>
              </li>
              <li>
                <NavItem href="/violations" icon={<AlertTriangle size={18} />}>
                  Violations
                </NavItem>
              </li>
              <li>
                <NavItem href="/ivt-blocker" icon={<Shield size={18} />}>
                  IVT Blocker
                </NavItem>
              </li>
              <li>
                <NavItem href="/grant-access" icon={<User size={18} />}>
                  Grant Access
                </NavItem>
              </li>
              <li>
                <NavItem href="/settings" icon={<Settings size={18} />}>
                  Settings
                </NavItem>
              </li>
            </ul>
          </nav>

          <div className="px-6 py-4 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1 truncate">
              👤{" "}
              {loggedIn
                ? localStorage.getItem("userEmail") || "User"
                : "Guest"}
            </div>

            <div className="flex gap-2">
              {loggedIn ? (
                <button
                  onClick={() => {
                    document.cookie =
                      "isLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    document.cookie =
                      "userEmail=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    localStorage.removeItem("isLoggedIn");
                    localStorage.removeItem("userEmail");
                    setLoggedIn(false);
                    window.location.href = "/login";
                  }}
                  className="w-full flex items-center justify-center gap-2 text-xs text-red-500 hover:text-red-600 py-1.5 rounded-lg hover:bg-red-50"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 text-xs text-blue-600 hover:text-blue-700 py-1.5 rounded-lg hover:bg-blue-50"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="md:ml-64 h-screen overflow-y-auto pt-4 pb-8 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}