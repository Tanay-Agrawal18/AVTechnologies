"use client";

import { useEffect, useState } from "react";
import { SessionUser } from "@/types";
import { InternOnboardingModal } from "@/components/InternOnboardingModal";

export function InternOnboardingController() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data?.user && data.user.role === "intern") {
          setUser(data.user);
          // If onboardingCompleted is false/undefined, display modal automatically
          if (!data.user.onboardingCompleted) {
            setShowModal(true);
          }
        }
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchSession();

    // Listen for custom trigger to replay orientation from Help / Profile
    const handleReplay = () => {
      setShowModal(true);
    };

    window.addEventListener("iwms:replay-onboarding", handleReplay);
    return () => {
      window.removeEventListener("iwms:replay-onboarding", handleReplay);
    };
  }, []);

  if (!mounted || !user || !showModal) {
    return null;
  }

  return (
    <InternOnboardingModal
      user={user}
      isOpen={showModal}
      onClose={(completed) => {
        setShowModal(false);
        if (completed) {
          setUser((prev) => (prev ? { ...prev, onboardingCompleted: true } : null));
        }
      }}
    />
  );
}
