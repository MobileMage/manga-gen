"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import ActionBreak from "@/components/landing/ActionBreak";
import Showcase from "@/components/landing/Showcase";
import Features from "@/components/landing/Features";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  const { user, enterDemoMode } = useAuth();
  const router = useRouter();
  const ctaHref = user ? "/create" : "/login";
  const ctaLabel = user ? "OPEN APP" : "GET STARTED";
  const showDemo = !user;

  const handleDemoClick = useCallback(() => {
    enterDemoMode();
    router.push("/create");
  }, [enterDemoMode, router]);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar ctaHref={ctaHref} ctaLabel={ctaLabel} showDemo={showDemo} onDemoClick={handleDemoClick} />
      <Hero ctaHref={ctaHref} ctaLabel={ctaLabel} showDemo={showDemo} onDemoClick={handleDemoClick} />
      <HowItWorks />
      <ActionBreak />
      <Showcase />
      <Features />
      <CtaSection ctaHref={ctaHref} ctaLabel={ctaLabel} showDemo={showDemo} onDemoClick={handleDemoClick} />
      <Footer />
    </div>
  );
}
