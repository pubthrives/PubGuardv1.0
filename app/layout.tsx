// app/layout.tsx
"use client";

import "./globals.css";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Shield, AlertTriangle, User, Settings, LogOut, Menu } from "lucide-react"; // Import icons

export default function RootLayout({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // State for mobile sidebar toggle
  const pathname = usePathname();
  const router = useRouter();

  // Ensure hydration before reading cookies/localStorage
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    const cookies = document.cookie || "";
    const isLogged = cookies.includes("isLoggedIn=true");
    setLoggedIn(isLogged);

    // Redirect to login if not logged in
    if (!isLogged && pathname !== "/login") {
      router.replace("/login");
    }
  }, [hydrated, pathname, router]);

  // 🕐 Avoid hydration mismatch
  if (!hydrated) {
    return (
      <html lang="en">
        <body className="min-h-screen flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-50 to-gray-100">
          <p className="text-lg font-light">Loading...</p>
        </body>
      </html>
    );
  }

  // 🔐 Show login layout (no sidebar)
  if (pathname === "/login") {
    return (
      <html lang="en">
        <body className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">{children}</body>
      </html>
    );
  }

  // Navigation Items Component (Re-usable)
  const NavItem = ({ href, icon, children }: { href: string; icon: React.ReactNode; children: ReactNode }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-out ${isActive
          ? "bg-blue-500/10 text-blue-600 shadow-sm ring-1 ring-blue-500/20"
          : "text-gray-700 hover:bg-gray-100/50 hover:text-gray-900"
          }`}
      >
        <span className={`p-1.5 rounded-lg ${isActive ? "bg-blue-500 text-white" : "text-gray-500"}`}>
          {icon}
        </span>
        <span>{children}</span>
      </Link>
    );
  };

  // ✅ Dashboard layout (with sidebar)
  return (
    <html lang="en">
      {/* Apply a subtle gradient background */}
      <body className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 font-sans antialiased overflow-hidden">
        {/* Mobile Menu Button (only shown on small screens) */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-md bg-white shadow-md text-gray-600"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Sidebar */}
        {/* Use fixed positioning and backdrop-blur for the Apple-like effect. Add conditional class for mobile. */}
        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-white/80 backdrop-blur-md border-r border-gray-200/50 flex flex-col z-30 transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0" // Slide in/out on mobile
            }`}
        >
          {/* Branding */}
          <div className="px-6 pt-8 pb-6 border-b border-gray-100/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Shield className="text-white" size={18} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 tracking-tight">PolicyGuard</h1>
                <p className="text-xs text-gray-500 mt-0.5">Compliance Dashboard</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-1">
              <NavItem href="/" icon={<Home size={18} />}>Overview</NavItem>
              <NavItem href="/sites" icon={<Globe size={18} />}>Sites</NavItem>
              <NavItem href="/violations" icon={<AlertTriangle size={18} />}>Violations</NavItem>
              <NavItem href="/grant-access" icon={<User size={18} />}>Grant Access</NavItem>
              <NavItem href="/settings" icon={<Settings size={18} />}>Settings</NavItem>
            </ul>
          </nav>

          {/* User & Sign Out */}
          <div className="px-6 py-4 border-t border-gray-100/50">
            <div className="text-xs text-gray-500 mb-1 truncate">
              <span className="inline-block mr-1 align-middle">👤</span>
              {typeof window !== "undefined" ? localStorage.getItem("userEmail") || "Guest" : "Guest"}
            </div>
            <button
              onClick={() => {
                document.cookie = "isLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "userEmail=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("userEmail");
                window.location.href = "/login";
              }}
              className="w-full flex items-center justify-center gap-2 text-xs text-red-500 hover:text-red-600 font-medium py-1.5 rounded-lg hover:bg-red-50/50 transition-colors duration-150"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setSidebarOpen(false)} // Close sidebar when clicking overlay
          />
        )}

        {/* Main Content */}
        {/* Add margin on desktop to accommodate fixed sidebar, padding on mobile */}
        <main className="md:ml-64 h-screen overflow-y-auto pt-4 pb-8 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}

// Define Globe icon (since it's used in NavItem but not imported globally)
import { Globe } from "lucide-react";