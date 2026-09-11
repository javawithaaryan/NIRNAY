import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari, Public_Sans } from "next/font/google";
import { languageStorageKey, textScaleStorageKey } from "@/lib/preferenceKeys";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "NIRNYAY · Mission-Aware Disruption Response",
    template: "%s · NIRNYAY",
  },
  description:
    "NIRNYAY connects field evidence, transport-network conditions and essential logistics missions to support faster, explainable operational decisions.",
};

export const viewport: Viewport = {
  themeColor: "#0b2545",
};

const preferenceScript = `(function(){try{var root=document.documentElement;var scale=localStorage.getItem(${JSON.stringify(
  textScaleStorageKey,
)});if(scale==="small"||scale==="large"){root.dataset.textScale=scale;}if(localStorage.getItem(${JSON.stringify(
  languageStorageKey,
)})==="hi"){root.lang="hi";}}catch(error){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${publicSans.variable} ${notoSansDevanagari.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <script dangerouslySetInnerHTML={{ __html: preferenceScript }} />
        {children}
      </body>
    </html>
  );
}
