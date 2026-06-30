import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { GlobalProviders } from "@/components/providers/GlobalProviders";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "TBH Price Tracker",
  description: "Track your Task Bar Hero in-game inventory with live Steam Market prices (IDR & USD).",
  keywords: ["TBH", "Task Bar Hero", "Steam Market", "Price Tracker", "Inventory"],
  openGraph: {
    title: "TBH Inventory Price Tracker",
    description: "Live Steam Market prices for your TBH inventory",
    type: "website",
  },
  icons: {
    icon: "/TBH-P.png",
    shortcut: "/TBH-P.png",
    apple: "/TBH-P.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <GlobalProviders>
            {children}
          </GlobalProviders>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}