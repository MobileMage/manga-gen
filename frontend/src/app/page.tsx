"use client";

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
  const { user } = useAuth();
  const ctaHref = user ? "/create" : "/login";
  const ctaLabel = user ? "OPEN APP" : "GET STARTED";
  const showDemo = !user;

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar ctaHref={ctaHref} ctaLabel={ctaLabel} showDemo={showDemo} />
      <Hero ctaHref={ctaHref} ctaLabel={ctaLabel} showDemo={showDemo} />
      <HowItWorks />
      <ActionBreak />
      <Showcase />
      <Features />
      <CtaSection ctaHref={ctaHref} ctaLabel={ctaLabel} showDemo={showDemo} />
      <Footer />
    </div>
  );
}
