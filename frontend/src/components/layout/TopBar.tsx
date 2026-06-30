"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Megaphone, Sun, Moon, User as UserIcon, ChevronDown, LogOut } from "lucide-react";
import { authApi } from "@/lib/api";
import { ProfileModal } from "./ProfileModal";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/items", label: "Browse" },
  { href: "/how-to-use", label: "How To Use" },
  { href: "/about", label: "About" },
];

interface TopBarProps {
  unreadCount?: number;
}

export function TopBar({ unreadCount = 0 }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeEl = navRef.current?.querySelector('[data-active="true"]') as HTMLElement;
      if (activeEl) {
        setUnderlineStyle({
          left: activeEl.offsetLeft + 8,
          width: activeEl.offsetWidth - 16,
          opacity: 1,
        });
      } else {
        setUnderlineStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [pathname, mounted]);

  useEffect(() => {
    setMounted(true);
    authApi.me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await authApi.logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  }

  return (
    <>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} user={user} />

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "var(--bg)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: PEN Logo */}
        <div style={{ display: "flex", alignItems: "center", width: "200px" }}>
          <Link href="https://stevchrist.site">
            <img
              src={mounted && resolvedTheme === "light" ? "/Logo PEN Black.png" : "/Logo PEN White.png"}
              alt="PEN Logo"
              style={{
                height: "28px",
                width: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Link>
        </div>

        {/* Middle: Centered Navigation Capsule */}
        <div style={{ display: "flex", justifyContent: "center", flex: 1 }}>
          <nav
            ref={navRef}
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "var(--surface)",
              borderRadius: "9999px",
              padding: "6px 16px",
              gap: "20px",
              boxShadow: "var(--shadow-sm)",
              position: "relative",
            }}
          >
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  data-active={isActive ? "true" : "false"}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.875rem",
                    fontWeight: 400,
                    color: "var(--text)",
                    textDecoration: "none",
                    position: "relative",
                    padding: "4px 8px",
                    display: "inline-block",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
            <span
              style={{
                position: "absolute",
                bottom: "4px",
                height: "1.5px",
                backgroundColor: "var(--text)",
                borderRadius: "9999px",
                transition: "all 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
                left: `${underlineStyle.left}px`,
                width: `${underlineStyle.width}px`,
                opacity: underlineStyle.opacity,
                pointerEvents: "none",
              }}
            />
          </nav>
        </div>

        {/* Right: Controls & Dropdown */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            width: "200px",
          }}
        >
          {/* Notifications */}
          <Link
            href="/mailbox"
            aria-label="Notifications"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              color: "var(--text-muted)",
              transition: "color var(--transition)",
            }}
          >
            <Megaphone size={16} style={{ color: "var(--text)" }} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  right: "2px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "9999px",
                  backgroundColor: "var(--cyan-highlight)",
                  border: "1.5px solid var(--bg)",
                }}
              />
            )}
          </Link>

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                color: "var(--text-muted)",
                transition: "color var(--transition)",
              }}
            >
              {theme === "dark" ? (
                <Sun size={16} style={{ color: "var(--text)" }} />
              ) : (
                <Moon size={16} style={{ color: "var(--text)" }} />
              )}
            </button>
          )}

          {/* User profile dropdown */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                height: "36px",
                padding: "0 14px",
                borderRadius: "9999px",
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                cursor: "pointer",
                transition: "background-color var(--transition)",
              }}
            >
              <UserIcon size={14} style={{ color: "var(--text)" }} />
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.8125rem",
                  fontWeight: 400,
                  maxWidth: "100px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user ? `@${user.username}` : "@username"}
              </span>
              <ChevronDown
                size={12}
                style={{
                  color: "var(--text-muted)",
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform var(--transition)",
                }}
              />
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  minWidth: "180px",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-lg)",
                  overflow: "hidden",
                  zIndex: 100,
                }}
              >
                {user && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>
                      @{user.username}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {user.email}
                    </p>
                  </div>
                )}

                <div style={{ padding: "4px" }}>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setProfileOpen(true);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.8125rem",
                      color: "var(--text)",
                      textAlign: "left",
                    }}
                  >
                    <UserIcon size={14} /> Profile Settings
                  </button>

                  <button
                    onClick={handleLogout}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.8125rem",
                      color: "#f87171",
                      textAlign: "left",
                    }}
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}