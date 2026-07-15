"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { Sparkles, TrendingUp, ShieldAlert, Award, Layers } from "lucide-react";
import type { InventoryItem } from "@/types";
import { formatIDR } from "@/lib/currency";

interface AnalyticsSectionProps {
  items: InventoryItem[];
  loading: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  COMMON: "#e4e4e4",
  UNCOMMON: "#54fc0c",
  RARE: "#2f8bfc",
  LEGENDARY: "#fc9c0c",
  IMMORTAL: "#fc2424",
  ARCANA: "#b40cfc",
  BEYOND: "#fc246c",
  CELESTIAL: "#6ccce4",
  DIVINE: "#fce454",
  COSMIC: "#ffffff",
};

export function AnalyticsSection({ items, loading }: AnalyticsSectionProps) {
  // 1. Process Data
  const stats = useMemo(() => {
    if (!items || items.length === 0) return null;

    let totalValue = 0;
    let tradableValue = 0;
    let untradableValue = 0;
    let untradableCount = 0;
    let tradableCount = 0;

    const rarityValueMap: Record<string, number> = {};
    const rarityCountMap: Record<string, number> = {};

    items.forEach((item) => {
      const isTradable = !!item.master_item.market_hash_name;
      const price = item.latest_price?.lowest_price_idr ?? 0;
      const itemValue = price * item.quantity;

      totalValue += itemValue;
      if (isTradable) {
        tradableValue += itemValue;
        tradableCount += item.quantity;
      } else {
        untradableValue += itemValue;
        untradableCount += item.quantity;
      }

      const rarity = item.master_item.rarity?.toUpperCase() || "COMMON";
      rarityValueMap[rarity] = (rarityValueMap[rarity] || 0) + itemValue;
      rarityCountMap[rarity] = (rarityCountMap[rarity] || 0) + item.quantity;
    });

    // Chart 1: Rarity Distribution by Value
    const rarityChartData = Object.keys(rarityValueMap).map((rarity) => ({
      name: rarity.charAt(0) + rarity.slice(1).toLowerCase(),
      value: rarityValueMap[rarity],
      count: rarityCountMap[rarity],
      color: RARITY_COLORS[rarity] || "#ffffff",
    })).filter(d => d.value > 0 || d.count > 0);

    // Chart 2: Tradability breakdown
    const tradabilityChartData = [
      { name: "Liquid (Tradable)", value: tradableValue, color: "#10b981" },
      { name: "Locked (Untradable)", value: untradableValue, color: "#ef4444" }
    ];

    // Chart 3: Top Items Value
    const topItemsData = [...items]
      .map(item => {
        const price = item.latest_price?.lowest_price_idr ?? 0;
        return {
          name: item.master_item.display_name,
          value: price * item.quantity,
          qty: item.quantity
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalValue,
      tradableValue,
      untradableValue,
      tradableCount,
      untradableCount,
      rarityChartData,
      tradabilityChartData,
      topItemsData,
    };
  }, [items]);

  const [lang, setLang] = useState<"id" | "en">("id");

  // 2. Generate Tips based on Data Science metrics in both languages
  const tips = useMemo(() => {
    if (!stats || items.length === 0) {
      return {
        id: [
          "Tambahkan beberapa item ke inventaris Anda di halaman Browse untuk mengaktifkan analisis data sains secara real-time."
        ],
        en: [
          "Add some items to your inventory on the Browse page to activate real-time data science analytics."
        ]
      };
    }

    const listId: string[] = [];
    const listEn: string[] = [];
    
    const totalItemsCount = stats.tradableCount + stats.untradableCount;
    const untradableRatio = totalItemsCount > 0 ? stats.untradableCount / totalItemsCount : 0;
    const untradableValueRatio = stats.totalValue > 0 ? stats.untradableValue / stats.totalValue : 0;

    // A. Concentration Risk
    if (stats.topItemsData.length > 0 && stats.totalValue > 0) {
      const top1Value = stats.topItemsData[0].value;
      const top1Ratio = top1Value / stats.totalValue;
      if (top1Ratio > 0.5) {
        listId.push(
          `Konsentrasi Aset Tinggi: Item "${stats.topItemsData[0].name}" menguasai ${(top1Ratio * 100).toFixed(1)}% dari total nilai portofolio Anda. Kami menyarankan diversifikasi untuk meminimalkan risiko volatilitas harga pasar Steam.`
        );
        listEn.push(
          `High Asset Concentration: Item "${stats.topItemsData[0].name}" represents ${(top1Ratio * 100).toFixed(1)}% of your total portfolio value. We recommend diversifying to minimize Steam Market price volatility risk.`
        );
      }
    }

    // B. Untradable / Liquidity Risk
    if (untradableRatio > 0.3) {
      listId.push(
        `Risiko Likuiditas (${(untradableRatio * 100).toFixed(0)}% Items Locked): Sebagian besar inventaris Anda terdiri dari item tingkat tinggi (Cosmic/Divine/Celestial gear) yang dilarang diperdagangkan oleh developer. Nilai item-item ini saat ini terkunci di dalam game.`
      );
      listEn.push(
        `Liquidity Risk (${(untradableRatio * 100).toFixed(0)}% Items Locked): A large portion of your inventory consists of high-tier items (Cosmic/Divine/Celestial gear) restricted from trade by developers. The value of these items is currently locked in-game.`
      );
    } else if (untradableValueRatio > 0.4) {
      listId.push(
        `Aset Terkunci Tinggi: Sekitar ${(untradableValueRatio * 100).toFixed(0)}% kekayaan inventaris Anda terikat pada item non-tradable. Pertimbangkan untuk memfokuskan grinding pada item Legendary atau material tradable untuk likuiditas yang lebih baik.`
      );
      listEn.push(
        `High Locked Wealth: About ${(untradableValueRatio * 100).toFixed(0)}% of your inventory wealth is tied to non-tradable items. Consider focusing your grinding on Legendary items or tradable materials for better liquidity.`
      );
    }

    // C. Zero Tradable Items warning
    if (stats.tradableCount === 0 && stats.untradableCount > 0) {
      listId.push(
        "Likuiditas Pasar Nol: Tidak ada item di inventaris Anda saat ini yang dapat diperdagangkan di Steam Market. Aliran kas potensial Anda di Steam saat ini adalah Rp 0. Carilah gear tingkat Legendary (Variant A) atau material kerajinan."
      );
      listEn.push(
        "Zero Market Liquidity: None of the items currently in your inventory can be traded on the Steam Market. Your potential cash flow on Steam is currently Rp 0. Look for Legendary grade gear (Variant A) or crafting materials."
      );
    }

    // D. High Qty, Low Value Warning
    if (totalItemsCount > 5 && stats.totalValue > 0 && stats.totalValue < 50000) {
      listId.push(
        `Kuantitas Tinggi, Nilai Rendah: Anda memiliki ${totalItemsCount} item tetapi nilai totalnya rendah (${formatIDR(stats.totalValue)}). Cobalah konsolidasi dengan menjual material bernilai kecil untuk membeli item Legendary yang permintaannya lebih stabil.`
      );
      listEn.push(
        `High Quantity, Low Value: You own ${totalItemsCount} items but the total portfolio value is low (${formatIDR(stats.totalValue)}). Try consolidating by selling low-value materials to purchase Legendary items with more stable demand.`
      );
    }

    // E. Materials Advantage
    const materialItems = items.filter(i => i.master_item.gear_type === null);
    const materialRatio = items.length > 0 ? materialItems.length / items.length : 0;
    if (materialRatio > 0.25) {
      listId.push(
        "Keunggulan Bahan Baku: Anda memiliki proporsi material yang cukup tinggi (>25%). Material (Soulstones/Inscriptions) sangat likuid dan bebas dari larangan perdagangan gear kelas atas, menjadikannya 'safe haven' saat pasar bergejolak."
      );
      listEn.push(
        "Materials Advantage: You have a high proportion of crafting materials (>25%). Materials (Soulstones/Inscriptions) are highly liquid and exempt from high-tier gear trade bans, making them excellent safe havens during market corrections."
      );
    } else {
      listId.push(
        "Tips Diversifikasi: Tingkatkan proporsi material kerajinan (crafting materials) atau dekorasi dalam inventaris Anda. Material terbebas dari aturan batas kelangkahan (rarity gates) minimum Legendary dan sangat mudah dicairkan di Steam Market."
      );
      listEn.push(
        "Diversification Tip: Increase the proportion of crafting materials or decorations in your inventory. Materials are exempt from the minimum Legendary rarity gate rules and are highly liquid on the Steam Market."
      );
    }

    // F. General Market Trend (optimized sales)
    listId.push(
      "Optimasi Penjualan: Volume perdagangan di Steam Market untuk game TBH memuncak di akhir pekan. Pasang order jual (sell orders) Anda di hari Sabtu/Minggu untuk pencairan aset yang lebih cepat dengan harga premium."
    );
    listEn.push(
      "Sales Optimization: Steam Market trading volume for TBH items peaks during the weekend. Place your sell orders on Saturday/Sunday to liquidate assets faster at premium prices."
    );

    return { id: listId, en: listEn };
  }, [stats, items]);

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "32px",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        Menganalisis data pasar dan inventaris...
      </div>
    );
  }

  if (!stats || items.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "32px",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
          Analytic Belum Tersedia
        </p>
        <p style={{ fontSize: "0.875rem" }}>
          Tambahkan beberapa item ke inventaris Anda untuk melihat visualisasi analitik data pasar.
        </p>
      </div>
    );
  }

  const formatChartPrice = (val: number) => {
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}k`;
    return `Rp ${val}`;
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "12px" }}>
      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
        <Sparkles size={22} style={{ color: "var(--cyan-highlight)" }} />
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 500,
            color: "var(--text)",
            letterSpacing: "0.01em",
            textAlign: "center",
          }}
        >
          Items Analytics
        </h2>
      </div>

      {/* Visualizations Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "20px",
          width: "100%",
        }}
      >
        {/* Card 1: Value Distribution by Rarity */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={16} style={{ color: "var(--cyan-highlight)" }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-muted)" }}>
              RARITY VALUE CONCENTRATION
            </span>
          </div>

          <div style={{ height: "220px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.rarityChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stats.rarityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatIDR(value as number), "Total Value"]}
                  contentStyle={{
                    backgroundColor: "rgba(10, 10, 10, 0.95)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--text)"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 12px",
              justifyContent: "center",
              fontSize: "0.75rem",
            }}
          >
            {stats.rarityChartData.map((entry, index) => (
              <div key={index} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    backgroundColor: entry.color,
                    boxShadow: `0 0 4px ${entry.color}`
                  }}
                />
                <span style={{ color: "var(--text-muted)" }}>{entry.name}</span>
                <span style={{ fontWeight: 600 }}>({((entry.value / stats.totalValue) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Liquidity status */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={16} style={{ color: "#10b981" }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-muted)" }}>
              LIQUIDITY ANALYSIS (TRADABILITY)
            </span>
          </div>

          <div style={{ height: "220px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.tradabilityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={formatChartPrice} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [formatIDR(value as number), "Value"]}
                  contentStyle={{
                    backgroundColor: "rgba(10, 10, 10, 0.95)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--text)"
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stats.tradabilityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", textAlign: "center" }}>
            Total Liquid: <strong style={{ color: "#10b981" }}>{formatIDR(stats.tradableValue)}</strong> (Qty: {stats.tradableCount}) |
            Locked: <strong style={{ color: "#ef4444" }}>{formatIDR(stats.untradableValue)}</strong> (Qty: {stats.untradableCount})
          </div>
        </div>

        {/* Card 3: Top Items Value Share */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Award size={16} style={{ color: "var(--accent-orange)" }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-muted)" }}>
              TOP 5 ITEMS VALUE SHARE
            </span>
          </div>

          <div style={{ height: "220px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.topItemsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={formatChartPrice} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [formatIDR(value as number), "Value"]}
                  contentStyle={{
                    backgroundColor: "rgba(10, 10, 10, 0.95)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--text)"
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--cyan-highlight)" fill="rgba(0, 229, 255, 0.08)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", textAlign: "center" }}>
            Memvisualisasikan konsentrasi nilai di antara 5 item teratas Anda.
          </div>
        </div>
      </div>

      {/* Recommendation Tips Box */}
      <div
        style={{
          backgroundColor: "rgba(0, 229, 255, 0.04)",
          border: "1px solid rgba(0, 229, 255, 0.15)",
          borderRadius: "12px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "rgba(0, 229, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldAlert size={20} style={{ color: "var(--cyan-highlight)" }} />
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
                {lang === "id" ? "Rekomendasi & Wawasan Data Sains" : "Data Science Insights & Recommendations"}
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
                {lang === "id" ? "Algoritma analisis portofolio real-time mendeteksi rekomendasi berikut:" : "Real-time portfolio analysis algorithm detects the following recommendations:"}
              </p>
            </div>
          </div>

          {/* Language Toggle */}
          <div
            style={{
              display: "flex",
              borderRadius: "8px",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              border: "1px solid var(--border)",
              padding: "2px",
            }}
          >
            <button
              onClick={() => setLang("en")}
              style={{
                padding: "4px 10px",
                fontSize: "0.75rem",
                fontWeight: 600,
                borderRadius: "6px",
                border: "none",
                backgroundColor: lang === "en" ? "var(--cyan-highlight)" : "transparent",
                color: lang === "en" ? "#000000" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all var(--transition)",
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLang("id")}
              style={{
                padding: "4px 10px",
                fontSize: "0.75rem",
                fontWeight: 600,
                borderRadius: "6px",
                border: "none",
                backgroundColor: lang === "id" ? "var(--cyan-highlight)" : "transparent",
                color: lang === "id" ? "#000000" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all var(--transition)",
              }}
            >
              ID
            </button>
          </div>
        </div>

        <ul
          style={{
            margin: 0,
            paddingLeft: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            lineHeight: 1.5,
          }}
        >
          {tips[lang].map((tip, idx) => (
            <li key={idx} style={{ color: "var(--text-muted)" }}>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
