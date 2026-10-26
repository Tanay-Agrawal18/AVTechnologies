import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaManager from "@/components/PwaManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vyorai — Intern Workspace Management",
  description:
    "Vyorai Intern Workspace Management System — manage tasks, deliverables, projects, and work history.",
  applicationName: "Vyorai",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vyorai",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0B1F3A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var origWarn = console.warn;
                  var origError = console.error;
                  var origInfo = console.info;
                  var origLog = console.log;
                  var isJunk = function(args) {
                    for (var i = 0; i < args.length; i++) {
                      var str = typeof args[i] === 'string' ? args[i] : (args[i] && args[i].message ? args[i].message : '');
                      if (
                        str.indexOf('contentscript.js') !== -1 ||
                        str.indexOf('ObjectMultiplex') !== -1 ||
                        str.indexOf('MaxListenersExceededWarning') !== -1 ||
                        str.indexOf('app-init-liveness') !== -1 ||
                        str.indexOf('background-liveness') !== -1 ||
                        str.indexOf('beforeinstallprompt') !== -1 ||
                        str.indexOf('Banner not shown') !== -1
                      ) {
                        return true;
                      }
                    }
                    return false;
                  };
                  console.warn = function() {
                    if (isJunk(arguments)) return;
                    origWarn.apply(console, arguments);
                  };
                  console.error = function() {
                    if (isJunk(arguments)) return;
                    origError.apply(console, arguments);
                  };
                  console.info = function() {
                    if (isJunk(arguments)) return;
                    origInfo.apply(console, arguments);
                  };
                  console.log = function() {
                    if (isJunk(arguments)) return;
                    origLog.apply(console, arguments);
                  };
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
