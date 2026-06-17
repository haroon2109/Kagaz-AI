import "./globals.css";
import Navbar from "@/components/navbar";
import { AuthProvider } from "@/hooks/use-auth";

export const metadata = {
  title: "Kagaz AI - Smart Grading & Educational Insights",
  description: "AI-powered grading assistant helping teachers evaluate worksheets in seconds",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased text-slate-900 dark:text-slate-100">
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <div className="flex-1">{children}</div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
