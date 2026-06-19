import "./globals.css";
import { Inter, Manrope } from "next/font/google";
import Navbar from "@/components/navbar";
import { AuthProvider } from "@/hooks/use-auth";
import { LanguageProvider } from "@/hooks/use-language";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata = {
  title: "Kagaz AI — Smart Worksheet Grading & Learning Analytics",
  description:
    "AI-powered grading assistant. Upload handwritten worksheets, get OCR-extracted answers, AI learning gap analysis, and class-level insights in seconds.",
  keywords: "worksheet grading, OCR, AI education, learning gaps, teacher tools",
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
              <Navbar />
              <div className="flex-1">{children}</div>
            </div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


