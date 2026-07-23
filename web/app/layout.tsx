import type { Metadata } from "next";
import { Fraunces, Manrope, IBM_Plex_Mono } from "next/font/google";
import { PageTransition } from "@/components/PageTransition";
import "./globals.css";

// Display: Fraunces — a soft, warm serif with a deliberate "wonk" to its
// curves instead of a mechanically even one. Set light (never above 500)
// so it reads as thin and drawn rather than stamped, with a true italic
// cut for the handful of places that want an extra flourish.
const fraunces = Fraunces({
  variable: "--font-bitter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

// Body: Manrope — a clean, rounded modern sans for UI chrome, warmer
// than a pure grotesque without losing legibility at small sizes.
const plexSans = Manrope({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}
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
      <body>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
