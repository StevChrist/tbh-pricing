"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Megaphone, Sun, Moon, User as UserIcon, ChevronDown, LogOut, Shield,
  LayoutDashboard, Package, Search, BookOpen, Info, Users, ScrollText, ShieldCheck, Menu, X,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { ProfileModal } from "./ProfileModal";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/items", label: "Browse", icon: Search },
  { href: "/how-to-use", label: "How To Use", icon: BookOpen },
  { href: "/about", label: "About", icon: Info },
];

interface TopBarProps {
  unreadCount?: number;
}

export function TopBar({ unreadCount = 0 }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ username: string; email: string; role?: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0, opacity: 0 });

  // Detect mobile breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

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
  }, [pathname, mounted, user]);

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

  const navLinks = [
    ...NAV_LINKS,
    ...(user?.role === "admin"
      ? [
          { href: "/users", label: "Users", icon: Users },
          { href: "/logs", label: "Logs", icon: ScrollText },
          { href: "/admin/security", label: "Security", icon: ShieldCheck },
        ]
      : []),
  ];

  return (
    <>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} user={user} onUserUpdate={setUser} />

      {/* Mobile Drawer Overlay */}
      {isMobile && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 998,
              backgroundColor: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
              opacity: mobileMenuOpen ? 1 : 0,
              pointerEvents: mobileMenuOpen ? "auto" : "none",
              transition: "opacity 0.25s ease",
            }}
          />

          {/* Drawer Panel */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
              width: "min(300px, 85vw)",
              backgroundColor: "var(--surface)",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              transform: mobileMenuOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: "20px 20px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Menu
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px", display: "flex", alignItems: "center" }}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav Links */}
            <nav style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
              {navLinks.map((link) => {
                const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={false}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "13px 16px",
                      borderRadius: "10px",
                      marginBottom: "4px",
                      textDecoration: "none",
                      fontSize: "1rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--cyan-highlight)" : "var(--text)",
                      backgroundColor: isActive ? "rgba(34,211,238,0.08)" : "transparent",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <Icon size={20} style={{ flexShrink: 0, color: isActive ? "var(--cyan-highlight)" : "var(--text-muted)" }} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Account Section */}
            <div style={{ borderTop: "1px solid var(--border)", padding: "16px 12px" }}>
              {/* Notification link */}
              <Link
                href="/mailbox"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "13px 16px",
                  borderRadius: "10px",
                  marginBottom: "4px",
                  textDecoration: "none",
                  fontSize: "1rem",
                  fontWeight: 400,
                  color: "var(--text)",
                }}
              >
                <Megaphone size={20} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                Notifications
                {unreadCount > 0 && (
                  <span style={{
                    marginLeft: "auto",
                    backgroundColor: "var(--cyan-highlight)",
                    color: "#000",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    borderRadius: "9999px",
                    padding: "2px 7px",
                  }}>
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* Theme Toggle */}
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "13px 16px",
                    borderRadius: "10px",
                    marginBottom: "4px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                    fontSize: "1rem",
                    color: "var(--text)",
                  }}
                >
                  {theme === "dark"
                    ? <Sun size={20} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    : <Moon size={20} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
              )}

              {/* Separator + User Account */}
              {user && (
                <div style={{ borderTop: "1px solid var(--border)", marginTop: "8px", paddingTop: "12px" }}>
                  {/* User Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 16px 12px" }}>
                    <div style={{
                      width: "38px", height: "38px", borderRadius: "9999px",
                      backgroundColor: "var(--primary)", display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0,
                    }}>
                      <UserIcon size={18} style={{ color: "#fff" }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        @{user.username}
                      </p>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => { setMobileMenuOpen(false); setProfileOpen(true); }}
                    style={{ display: "flex", alignItems: "center", gap: "14px", padding: "11px 16px", borderRadius: "10px", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", fontSize: "0.95rem", color: "var(--text)", marginBottom: "2px" }}
                  >
                    <UserIcon size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    Profile Settings
                  </button>

                  <button
                    onClick={() => { setMobileMenuOpen(false); router.push("/settings/security"); }}
                    style={{ display: "flex", alignItems: "center", gap: "14px", padding: "11px 16px", borderRadius: "10px", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", fontSize: "0.95rem", color: "var(--text)", marginBottom: "2px" }}
                  >
                    <Shield size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    Security Settings
                  </button>

                  <button
                    onClick={handleLogout}
                    style={{ display: "flex", alignItems: "center", gap: "14px", padding: "11px 16px", borderRadius: "10px", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", fontSize: "0.95rem", color: "#f87171" }}
                  >
                    <LogOut size={18} style={{ color: "#f87171", flexShrink: 0 }} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Render Desktop Header or Mobile Header based on breakpoint */}
      {!isMobile ? (
        // EXACT ORIGINAL DESKTOP HEADER LAYOUT
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
              {navLinks.map((link) => {
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
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <UserIcon size={14} /> Profile Settings
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push("/settings/security");
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
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <Shield size={14} /> Security Settings
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
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
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
      ) : (
        // EXACT ORIGINAL MOBILE HEADER (WITH HAMBURGER REDIRECT TO DRAWER)
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            backgroundColor: "var(--bg)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          {/* Left: PEN Logo */}
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <Link href="https://stevchrist.site">
              <img
                src={mounted && resolvedTheme === "light" ? "/Logo PEN Black.png" : "/Logo PEN White.png"}
                alt="PEN Logo"
                style={{ height: "28px", width: "auto", objectFit: "contain", display: "block" }}
              />
            </Link>
          </div>

          {/* Mobile: Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Open menu"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              color: "var(--text)",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <Menu size={20} />
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: "6px", right: "6px", width: "7px", height: "7px", borderRadius: "9999px", backgroundColor: "var(--cyan-highlight)", border: "1.5px solid var(--bg)" }} />
            )}
          </button>
        </header>
      )}
    </>
  );
}