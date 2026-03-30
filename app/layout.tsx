import type { Metadata } from "next";
import { Gowun_Dodum, Jua } from "next/font/google";
import "./globals.css";

const jua = Jua({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-jua",
  display: "swap",
});

const gowun = Gowun_Dodum({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gowun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SBS연예뉴스 퀴즈팡",
  description: "매일 새로운 퀴즈가 찾아옵니다!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${jua.variable} ${gowun.variable} font-gowun antialiased text-zinc-900`}
      >
        {children}
      </body>
    </html>
  );
}
