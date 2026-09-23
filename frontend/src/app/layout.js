import "./globals.css";
import { Inter, Manrope } from "next/font/google";
import Navbar from "@/components/navbar";
import { AuthProvider } from "@/hooks/use-auth";
import { LanguageProvider } from "@/hooks/use-language";
import { GlobalOfflineBanner } from "@/components/api-status-banner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata = {
  title: "Kagaz AI — From student work to the next teaching action",
  description:
    "AI-powered learning diagnosis and teaching-action assistant. Scan handwritten student work, see demonstrated competencies, group students for targeted support, run 10-minute remediations, and check whether learning improved.",
  keywords: "formative assessment, foundational literacy numeracy, FLN, TaRL, learning gaps, teacher tools, OCR",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${manrope.variable} font-sans antialiased min-h-screen`}
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <AuthProvider>
          <LanguageProvider>
            <div className="relative flex min-h-screen flex-col">
              <GlobalOfflineBanner />
              <Navbar />
              <div className="flex-1">{children}</div>
            </div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


