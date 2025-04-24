import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./dark-mode.css";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { AuthProvider } from "./context/AuthContext";
import { RefreshProvider } from "./context/RefreshContext";
import { NavigationProvider } from "./context/NavigationContext";
import LoadingIndicator from "./components/LoadingIndicator";
import image from "../../public/image-original.png"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  icons: image.src,
  title: "Docker Management UI",
  description: "A web application for managing Docker containers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <script src="/toggle-dark-mode.js" defer></script>
        <script src="/login-redirect.js" defer></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900`}
      >
        <AuthProvider>
          <RefreshProvider>
            <NavigationProvider>
              <LoadingIndicator />
              {children}
            </NavigationProvider>
          </RefreshProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
