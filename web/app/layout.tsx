import type { Metadata } from "next";
import { STIX_Two_Text, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Display face: an actual scientific-journal typeface family (STIX exists to
// set research papers), used with restraint at large sizes only.
const stixTwo = STIX_Two_Text({
  variable: "--font-stix",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

// Body: IBM's own engineering-heritage sans — a deliberate alternative to the
// Inter/system-ui default that shows up on nearly every AI-generated product.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      className={`${stixTwo.variable} ${plexSans.variable} ${plexMono.variable}`}
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
