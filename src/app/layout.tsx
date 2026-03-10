import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KUKU便 — 樹木の里から、届けます",
  description: "広告なし。登録なし。大切なファイルを、森の郵便局から届けます。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
