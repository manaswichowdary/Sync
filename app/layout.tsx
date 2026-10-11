import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { AppFrame } from "@/components/AppFrame";
import { PrivacyPrompt } from "@/components/PrivacyPrompt";
import { isAdminEmail } from "@/lib/admin";
import { currentUser } from "@/lib/data/db";
import { loadHome } from "@/lib/data/load";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sync",
  description: "A little help, right when you need it.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const home = user ? await loadHome() : null;
  return (
    <html lang="en">
      <body className={nunito.className}>
        <AppFrame signedIn={Boolean(user)} groupId={home?.groupId ?? null} admin={isAdminEmail(user?.email)}>
          {children}
        </AppFrame>
        <PrivacyPrompt signedIn={Boolean(user)} />
        <footer className="site-footer">
          <div className="wrap">
            <p>
              Trust badges are not background checks. Meet in public places, and always make the final call in person. In an emergency call 911. For emotional support call or text 988. For local help call 211.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
