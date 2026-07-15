"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import {
  Package,
  Clock,
  Bell,
  Inbox,
  FileSpreadsheet,
  Layers,
  Search,
  Sparkles,
  ShieldAlert,
  HelpCircle
} from "lucide-react";

export default function HowToUsePage() {
  const [unreadCount, setUnreadCount] = useState(0);
  void setUnreadCount;

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
          maxWidth: "900px",
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "36px",
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
          <p style={{ fontSize: "1rem", color: "var(--text-muted)", textAlign: "center", maxWidth: "600px" }}>
            Pelajari cara kerja sistem, penjelasan fitur di setiap halaman, dan cara mengoptimalkan pelacakan harga inventaris Task Bar Hero Anda.
          </p>
        </div>

        {/* Section 1: Panduan Per Halaman */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            1. Penjelasan Halaman Utama
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
            {/* Dashboard */}
            <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <Layers size={20} style={{ color: "var(--cyan-highlight)" }} />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Halaman Dashboard (Panel Utama)</h3>
              </div>
              <ul style={{ paddingLeft: "20px", fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "8px", lineHeight: 1.6 }}>
                <li><strong>Metrik Cepat:</strong> Pantau valuasi total inventaris Anda dalam Rupiah (IDR) & USD, jumlah item unik, dan aset dengan harga jual termahal secara real-time.</li>
                <li><strong>My Inventory (Top 8):</strong> Menampilkan daftar 8 item termahal milik Anda. Tabel dirancang bebas scrollbar agar Anda mendapat ringkasan yang ringkas dan rapi.</li>
                <li><strong>Items Analytics:</strong> Visualisasi portofolio Anda menggunakan 3 diagram interaktif:
                  <ul style={{ paddingLeft: "20px", marginTop: "4px" }}>
                    <li><em>Rarity Value Concentration:</em> Menampilkan tingkat kelangkaan (Common s.d Cosmic) mana yang mendominasi nilai portofolio Anda.</li>
                    <li><em>Liquidity Analysis:</em> Membandingkan nilai aset Anda yang <strong>Liquid (bisa dijual/Tradable)</strong> vs <strong>Locked (terkunci/Untradable)</strong> di Steam Market.</li>
                    <li><em>Top 5 Items Value Share:</em> Grafik kontribusi nilai dari 5 barang terbaik Anda.</li>
                  </ul>
                </li>
                <li><strong>Insight & Recommendation:</strong> Kotak rekomendasi pintar berbasis data sains untuk memberikan tips diversifikasi, pengelolaan risiko likuiditas, dan optimasi waktu penjualan (bisa di-toggle ID/EN).</li>
              </ul>
            </div>

            {/* Inventory */}
            <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <Package size={20} style={{ color: "var(--cyan-highlight)" }} />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Halaman Inventory (Kelola Aset)</h3>
              </div>
              <ul style={{ paddingLeft: "20px", fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "8px", lineHeight: 1.6 }}>
                <li>Menampilkan daftar lengkap seluruh item di portofolio Anda secara detail, lengkap dengan harga Steam terkini (USD & IDR) serta estimasi saldo yang Anda terima setelah dipotong pajak Steam (15%).</li>
                <li><strong>Sync Prices:</strong> Klik tombol ini untuk memperbarui harga seluruh item Anda secara langsung dari Steam Market secara massal.</li>
                <li><strong>Export CSV:</strong> Unduh seluruh data inventaris Anda ke dalam bentuk file spreadsheet/Excel dalam satu klik.</li>
                <li><strong>Aksi Cepat:</strong> Pada setiap baris item, Anda dapat memperbarui jumlah barang (QTY), menambahkan catatan khusus (Notes), memasang alarm harga, memicu refresh satu item, atau menghapusnya.</li>
              </ul>
            </div>

            {/* Browse */}
            <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <Search size={20} style={{ color: "var(--cyan-highlight)" }} />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Halaman Browse (Cari & Tambah Item)</h3>
              </div>
              <ul style={{ paddingLeft: "20px", fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "8px", lineHeight: 1.6 }}>
                <li>Menampilkan katalog lengkap berisi **5.934 item** dari game Task Bar Hero yang disinkronkan langsung dari Wiki resmi.</li>
                <li>Gunakan kolom pencarian nama item, filter kategori tipe (Gear / Material), serta filter tingkat kelangkaan (Rarity) untuk menemukan barang dengan cepat.</li>
                <li>Gunakan checkbox untuk memilih banyak item sekaligus, lalu klik **"Add Selected to Inventory"** untuk menambahkannya ke portofolio Anda secara instan (bulk-add).</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2: Fitur Alarm Harga */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            2. Sistem Alarm & Kotak Masuk (Price Alerts & Mailbox)
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              width: "100%",
            }}
          >
            {/* Set Alert */}
            <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <Bell size={18} style={{ color: "var(--accent-orange)" }} />
                <h4 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Cara Memasang Alarm</h4>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                Klik ikon lonceng pada baris item pilihan Anda di halaman Inventory atau Browse. Pilih kondisi apakah harga turun di bawah (<em>Price goes below</em>) atau naik di atas (<em>Price goes above</em>) nilai target Anda. Masukkan nilai target dalam USD atau IDR, lalu simpan.
              </p>
            </div>

            {/* Mailbox */}
            <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <Inbox size={18} style={{ color: "var(--cyan-highlight)" }} />
                <h4 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Menerima Notifikasi</h4>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                Setiap kali sistem melakukan sinkronisasi harga otomatis (setiap 30 menit), sistem akan mencocokkan harga baru dengan alarm Anda. Jika kondisi terpenuhi, notifikasi akan dikirimkan ke <strong>Mailbox</strong> Anda dan indikator merah di lonceng menu kanan atas akan menyala.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Penting - Kebijakan Tradable / Market */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            3. Panduan Penting Mengenai Status Perdagangan (Tradable)
          </h2>

          <div
            style={{
              backgroundColor: "rgba(255, 179, 0, 0.04)",
              border: "1px solid rgba(255, 179, 0, 0.15)",
              borderRadius: "12px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ShieldAlert size={22} style={{ color: "var(--accent-orange)" }} />
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
                Kenapa sebagian item bertstatus Tradable: "No" dan harganya "Unavailable"?
              </h3>
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: "10px" }}>
              <p style={{ margin: 0 }}>
                Sebagai pengguna dan analis data, Anda perlu memahami regulasi Steam Market yang ditetapkan oleh developer game *TBH: Task Bar Hero*:
              </p>
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                <li>
                  <strong>Batas Kelangkaan (Rarity Gates):</strong> Hanya perlengkapan (Gear) dengan kelangkaan minimum <strong>Legendary & Immortal (Variant A)</strong> yang diizinkan untuk diperdagangkan di Steam Market.
                </li>
                <li>
                  <strong>Pemblokiran Kelas Atas:</strong> Developer game menutup perdagangan untuk seluruh perlengkapan kelas tertinggi seperti **Celestial, Divine, dan Cosmic** guna menjaga kestabilan ekonomi game.
                </li>
                <li>
                  <strong>Bahan Baku Terkecuali (Materials Exempt):</strong> Barang kategori material kerajinan (seperti Soulstones, Ores, Pearls, Inscriptions) dibebaskan dari aturan batas kelangkaan dan **tetap dapat diperdagangkan di tingkat kelangkaan apa pun**.
                </li>
              </ul>
              <p style={{ margin: 0, fontWeight: 500, color: "var(--text)" }}>
                Sistem kami secara akurat mendeteksi aturan ini dan melabeli item sebagai Tradable: "No" agar Anda tahu bahwa harga item tersebut tidak tersedia karena dibatasi secara resmi oleh developer game, bukan karena kesalahan sistem.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Sinkronisasi Otomatis */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            4. Sinkronisasi Data Otomatis di Background
          </h2>
          <div style={{ display: "flex", gap: "16px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
            <Clock size={20} style={{ color: "var(--cyan-highlight)", flexShrink: 0, marginTop: "2px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <h4 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Jadwal Pembaruan Otomatis</h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                Server backend kami secara berkala menjalankan tugas sinkronisasi otomatis: pembaruan harga inventaris aktif setiap <strong>30 menit</strong>, sinkronisasi data pasar harian setiap pukul <strong>02:00 dini hari</strong>, dan pembaruan database katalog secara penuh setiap hari <strong>Minggu pukul 04:00 subuh</strong>.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
