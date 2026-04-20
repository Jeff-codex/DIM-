import type { Metadata } from "next";
import Script from "next/script";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { PageTransition } from "@/components/page-transition";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const defaultSocialImage = `${siteConfig.url}${siteConfig.publisher.logoPath}`;
const googleAnalyticsMeasurementId = "G-5VWW1YQ295";
const naverAnalyticsSiteId = "ce73dbb492c340";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-body",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerifKr = Noto_Serif_KR({
  variable: "--font-display",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  icons: {
    icon: [
      { url: `${siteConfig.url}/favicon.ico`, type: "image/x-icon", sizes: "any" },
      { url: `${siteConfig.url}/icon.png`, type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: `${siteConfig.url}/favicon.ico`, type: "image/x-icon" }],
    apple: [
      {
        url: `${siteConfig.url}/apple-icon.png`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteConfig.url,
    title: siteConfig.publisher.name,
    description: siteConfig.description,
    siteName: siteConfig.publisher.name,
    images: [
      {
        url: defaultSocialImage,
        alt: "DIM 로고",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [defaultSocialImage],
  },
  verification: {
    google: "viTebMQcg3UIXlwCFpe7VyVLFqqXmCp92LiUe-9PvDk",
    other: {
      "msvalidate.01": "83816417854613178C26BF6EF5E3E714",
      "naver-site-verification": "7f5d1b972351449a89ca175303a61b8ef170c20a",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": siteConfig.publisher.id,
    name: siteConfig.publisher.name,
    alternateName: siteConfig.publisher.alternateName,
    url: siteConfig.url,
    logo: {
      "@type": "ImageObject",
      url: `${siteConfig.url}${siteConfig.publisher.logoPath}`,
    },
    sameAs:
      siteConfig.publisher.sameAs.length > 0
        ? siteConfig.publisher.sameAs
        : undefined,
  };

  return (
    <html lang="ko">
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${siteConfig.name} RSS`}
          href={`${siteConfig.url}/rss.xml`}
        />
        <Script
          id="google-analytics-loader"
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsMeasurementId}`}
          strategy="beforeInteractive"
        />
        <Script id="google-analytics-init" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || []; function gtag(){window.dataLayer.push(arguments);} window.gtag = gtag; gtag('js', new Date()); gtag('config', '${googleAnalyticsMeasurementId}');`}
        </Script>
      </head>
      <body className={`${notoSansKr.variable} ${notoSerifKr.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(sessionStorage.getItem('dim-page-transition')==='1'){document.documentElement.classList.add('page-entering')}}catch(e){}})();",
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <div className="site-frame">
          <SiteHeader />
          <main className="site-main">
            <PageTransition>{children}</PageTransition>
          </main>
          <SiteFooter />
        </div>
        <Script
          id="naver-analytics-loader"
          src="//wcs.pstatic.net/wcslog.js"
          strategy="afterInteractive"
        />
        <Script id="naver-analytics-init" strategy="afterInteractive">
          {`if(!window.wcs_add) window.wcs_add = {}; window.wcs_add["wa"] = "${naverAnalyticsSiteId}"; if(window.wcs) { window.wcs_do(); }`}
        </Script>
      </body>
    </html>
  );
}
