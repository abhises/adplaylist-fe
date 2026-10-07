import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import ImageGuard from "@/components/ImageGuard";
import { AuthProvider } from "@/lib/AuthProvider";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { NotificationsProvider } from "@/lib/NotificationsProvider";
import { ToastProvider } from "@/lib/ToastProvider";
import { I18nProvider } from "@/lib/I18nProvider";
import { LOCALE_TAGS } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/serverLocale";
import { DICTIONARIES } from "@/lib/dictionaries";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestLocale();
  const { description } = DICTIONARIES[locale].meta;
  return {
    // Relative canonicals resolve against the English site on every
    // subdomain: only pages with their own translation (the home page) set
    // an absolute canonical on their language's subdomain.
    metadataBase: new URL(SITE_URL),
    title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
    description,
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: LOCALE_TAGS[locale].og,
      description,
    },
    twitter: { card: "summary_large_image" },
    // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to verify with Search Console
    // via meta tag (not needed when verifying the domain through DNS).
    verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
  };
}

const noFlashScript = `
try {
  var t = localStorage.getItem('adplaylist_theme');
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, base } = await getRequestLocale();
  return (
    <html
      lang={LOCALE_TAGS[locale].lang}
      className={`${archivo.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <I18nProvider locale={locale} baseHost={base}>
          <ThemeProvider>
            <AuthProvider>
              <ImageGuard />
              <ToastProvider>
                <NotificationsProvider>{children}</NotificationsProvider>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
