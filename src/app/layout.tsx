import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marginalia",
  description: "Notas de lectura de libros en papel.",
  applicationName: "Marginalia",
  // Hace que iOS abra el icono de la pantalla de inicio en modo standalone.
  appleWebApp: {
    capable: true,
    title: "Marginalia",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  // App privada: nunca debe indexarse.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Sin zoom manual: evita el zoom accidental al disparar la cámara con una mano.
  maximumScale: 1,
  userScalable: false,
  // Permite pintar bajo la barra de estado en modo standalone (iOS notch).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
