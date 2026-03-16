import AuthGate from "@/components/AuthGate";
import TopBar from "@/components/TopBar";
import MobileBanner from "@/components/MobileBanner";
import { MangaProvider } from "@/contexts/MangaContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <MangaProvider>
        <div className="min-h-screen bg-black">
          <TopBar />
          <MobileBanner />
          {children}
        </div>
      </MangaProvider>
    </AuthGate>
  );
}
