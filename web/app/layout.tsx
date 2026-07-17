import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Display: Bricolage Grotesque — an unusual, high-personality variable
// grotesque (irregular terminals, a real point of view) for headlines,
// the compass mark, and hero numbers. Chosen specifically to not read as
// a safe default — most AI-generated products reach for Inter or a
// generic serif; this doesn't.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Body: IBM's own engineering-heritage sans — the UI-chrome and data
// register, a deliberate alternative to the Inter/system-ui default.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Data face: for stats, timestamps, nav labels — the "instrument readout"
// register.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Longevity Compass — a coach that reads what you log",
  description:
    "A longevity coach built from published research on nutrition, movement, sleep, and mind — reshaped daily by what you actually do.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${plexSans.variable} ${plexMono.variable}`}
      // The boot script below sets data-theme on this element before React
      // hydrates, on purpose (that's what avoids the flash) — React would
      // otherwise flag that as a hydration mismatch even though it's correct.
      suppressHydrationWarning
    >
      <head>
        {/* Sets the color scheme before first paint so switching themes in
            Settings never produces a flash of the wrong theme on reload. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              var t = localStorage.getItem('lc_theme_v1');
              if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
            } catch (e) {}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
