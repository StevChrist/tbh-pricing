"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import {
  Package,
  Clock,
  Bell,
  Inbox,
  Layers,
  Search,
  ShieldAlert,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function HowToUsePage() {
  const [unreadCount, setUnreadCount] = useState(0);
  void setUnreadCount;

  // Track expanded state for each of the 4 sections
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({
    1: true,
    2: false,
    3: false,
    4: false,
  });

  const toggleSection = (id: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const headerStyle = (isOpen: boolean) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    backgroundColor: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: isOpen ? "12px 12px 0 0" : "12px",
    cursor: "pointer",
    transition: "all var(--transition)",
    boxShadow: "var(--shadow-sm)",
  });

  const contentStyle = {
    padding: "24px",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    borderRight: "1px solid var(--border)",
    borderBottom: "1px solid var(--border)",
    borderLeft: "1px solid var(--border)",
    borderRadius: "0 0 12px 12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopBar unreadCount={unreadCount} />

      <main
        className="animate-container-slide"
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "800px",
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {/* Page Title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <HelpCircle size={40} style={{ color: "var(--cyan-highlight)" }} />
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "3rem",
              fontWeight: 500,
              textTransform: "uppercase",
              color: "var(--text)",
              letterSpacing: "0.02em",
              textAlign: "center",
              margin: 0,
            }}
          >
            Panduan Penggunaan
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--text-muted)", textAlign: "center", maxWidth: "600px", margin: 0 }}>
            Klik pada judul topik di bawah ini untuk membaca panduan cara menggunakan fitur-fitur utama website.
          </p>
        </div>

        {/* Collapsible Accordion Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
          
          {/* Section 1 */}
          <div>
            <div onClick={() => toggleSection(1)} style={headerStyle(openSections[1])}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Layers size={20} style={{ color: "var(--cyan-highlight)" }} />
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>1. Penjelasan Halaman Utama</h2>
              </div>
              {openSections[1] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            {openSections[1] && (
              <div style={contentStyle}>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Aplikasi ini dibagi menjadi tiga halaman utama yang saling terintegrasi:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "8px", lineHeight: 1.6 }}>
                    <li><strong>Dashboard (Panel Ringkasan):</strong> Menampilkan valuasi total inventaris Anda, 8 item termahal milik Anda secara ringkas tanpa scrollbar, grafik analitik aset (kelangkaan & likuiditas), serta kotak rekomendasi bilingual.</li>
                    <li><strong>Inventory (Kelola Inventaris):</strong> Tempat memantau semua barang yang Anda simpan. Di sini Anda bisa mengubah jumlah barang, menambahkan catatan khusus, memasang alarm harga, serta mengekspor data ke file CSV.</li>
                    <li><strong>Browse (Cari Item):</strong> Menelusuri seluruh database katalog item game Task Bar Hero untuk ditambahkan ke inventaris Anda secara cepat.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Section 2 */}
          <div>
            <div onClick={() => toggleSection(2)} style={headerStyle(openSections[2])}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Bell size={20} style={{ color: "var(--accent-orange)" }} />
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>2. Alarm Harga (Price Alerts & Mailbox)</h2>
              </div>
              {openSections[2] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            {openSections[2] && (
              <div style={contentStyle}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  Anda dapat memantau pergerakan harga item tertentu secara otomatis:
                </p>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "8px", lineHeight: 1.6 }}>
                  <li><strong>Pasang Alarm:</strong> Klik ikon lonceng pada baris item pilihan Anda di halaman Inventory atau Browse, tentukan target batas harga (Rupiah/USD), lalu simpan.</li>
                  <li><strong>Notifikasi Masuk:</strong> Jika harga pasar Steam menyentuh target Anda, sistem akan secara otomatis mengirimkan notifikasi ke halaman <strong>Mailbox</strong> Anda.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Section 3 */}
          <div>
            <div onClick={() => toggleSection(3)} style={headerStyle(openSections[3])}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <ShieldAlert size={20} style={{ color: "var(--accent-orange)" }} />
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>3. Status Perdagangan (Tradable vs Non-Tradable)</h2>
              </div>
              {openSections[3] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            {openSections[3] && (
              <div style={contentStyle}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  Tidak semua item dalam game dapat diperdagangkan di Steam Market:
                </p>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "8px", lineHeight: 1.6 }}>
                  <li><strong>Item Tradable (Bisa Dijual):</strong> Hanya perlengkapan (Gear) tingkat kelangkaan *Legendary & Immortal (Variant A)* serta kategori *Bahan Baku (Materials)* yang aktif diperdagangkan di Steam.</li>
                  <li><strong>Item Non-Tradable (Terkunci):</strong> Perlengkapan kelas tertinggi seperti *Celestial, Divine, dan Cosmic* dibatasi oleh developer game sehingga harganya ditampilkan sebagai "Unavailable".</li>
                </ul>
              </div>
            )}
          </div>

          {/* Section 4 */}
          <div>
            <div onClick={() => toggleSection(4)} style={headerStyle(openSections[4])}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Clock size={20} style={{ color: "var(--cyan-highlight)" }} />
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>4. Pembaruan Harga Otomatis</h2>
              </div>
              {openSections[4] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            {openSections[4] && (
              <div style={contentStyle}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  Harga item pada sistem ini diperbarui secara berkala oleh server setiap **30 menit sekali secara otomatis** untuk menjaga keakuratan data pelacakan inventaris Anda.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
