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

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
/** 공유 미리보기용 이미지 (public/og.png). 서브경로 배포 시 /quizpang/og.png 형태 */
const ogImagePath = `${basePath}/og.png`;

function metadataBaseUrl(): URL {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    const s = site.replace(/\/$/, "");
    return new URL(s.startsWith("http") ? s : `https://${s}`);
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: "SBS연예뉴스 퀴즈팡",
  description: "매일 새로운 퀴즈가 찾아옵니다!",
  openGraph: {
    title: "SBS연예뉴스 퀴즈팡",
    description: "매일 새로운 퀴즈가 찾아옵니다!",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: ogImagePath,
        alt: "SBS연예뉴스 퀴즈팡",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SBS연예뉴스 퀴즈팡",
    description: "매일 새로운 퀴즈가 찾아옵니다!",
    images: [ogImagePath],
  },
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
