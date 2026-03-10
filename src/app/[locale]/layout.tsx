import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Syne, DM_Sans } from "next/font/google";
import { routing } from "../../../i18n/routing";
import { Navbar } from "@/components/Navbar";
import type { Metadata } from "next";
import "../globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://kuku-post.vercel.app";

export const metadata: Metadata = {
  title: "KUKU便 - 樹木の里から、届けます。",
  description: "広告なし。登録なし。大切なデータを安全にお届けします。無料ファイル転送サービス。",
  openGraph: {
    title: "KUKU便 - 樹木の里から、届けます。",
    description: "広告なし。登録なし。大切なデータを安全にお届けします。",
    siteName: "KUKU便",
    images: [{ url: `${BASE_URL}/ogp.png`, width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KUKU便 - 樹木の里から、届けます。",
    description: "広告なし。登録なし。大切なデータを安全にお届けします。",
    images: [`${BASE_URL}/ogp.png`],
  },
};

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "ja" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#3B7D52" />
      </head>
      <body className={`${syne.variable} ${dmSans.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <Navbar />
          {children}
        </NextIntlClientProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator){navigator.serviceWorker.register("/sw.js")}`,
          }}
        />
      </body>
    </html>
  );
}
