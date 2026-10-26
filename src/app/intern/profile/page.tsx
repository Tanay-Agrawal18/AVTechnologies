"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SessionUser } from "@/types";
import { Shield, Mail, Hash, Camera, Trash2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

export default function InternProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUser = () => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push("/login?error=inactive");
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchUser();
  }, [router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/users/profile-picture", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload profile picture");
      }

      setUploadSuccess("Profile picture updated successfully!");
      fetchUser();
      // Inform header to refresh if needed
      window.dispatchEvent(new Event("profile-picture-updated"));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Error uploading picture");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePicture = async () => {
    if (!confirm("Are you sure you want to remove your profile picture?")) return;
    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const res = await fetch("/api/users/profile-picture", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove profile picture");
      }

      setUploadSuccess("Profile picture removed successfully!");
      fetchUser();
      window.dispatchEvent(new Event("profile-picture-updated"));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Error removing picture");
    } finally {
      setIsUploading(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "I";

  return (
    <>
      <DashboardHeader
        title="My Profile"
        description="Your verified identity, assignment parameters, and security credentials"
      />

      <main className="p-3 sm:p-5 lg:p-8 max-w-2xl space-y-4 sm:space-y-6">
        {uploadSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {uploadError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <div
          className="iwms-card p-4 sm:p-7 space-y-4 sm:space-y-6"
          style={{ borderRadius: "16px" }}
        >
          {/* Avatar + name with Cloudinary Upload */}
          <div
            className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-4 sm:pb-6 text-center sm:text-left"
            style={{ borderBottom: "1px solid var(--iwms-border)" }}
          >
            {/* Profile Picture with overlay action */}
            <div className="relative group shrink-0">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name || "Profile"}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover ring-4 ring-sky-100 shadow-md"
                />
              ) : (
                <div
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-full flex items-center justify-center font-bold text-2xl sm:text-3xl shrink-0"
                  style={{
                    background: "rgba(56,189,248,.15)",
                    color: "var(--iwms-sky)",
                    border: "2px solid rgba(56,189,248,.30)",
                  }}
                >
                  {initials}
                </div>
              )}

              {/* Upload Loading Spinner */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div>
                {user ? (
                  <>
                    <h3
                      className="font-bold text-base sm:text-xl"
                      style={{ color: "var(--iwms-black)" }}
                    >
                      {user.name}
                    </h3>
                    <p
                      className="text-xs sm:text-sm capitalize mt-0.5"
                      style={{ color: "rgba(11,31,58,.50)" }}
                    >
                      {user.role} Account
                    </p>
                  </>
                ) : (
                  <div className="space-y-1.5 py-1">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                )}
              </div>

              {/* Picture Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--iwms-sky)", color: "white" }}
                >
                  <Camera className="w-3.5 h-3.5" />
                  {user?.profilePicture ? "Change Photo" : "Upload Photo"}
                </button>

                {user?.profilePicture && (
                  <button
                    type="button"
                    onClick={handleRemovePicture}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                JPEG, PNG, or WebP (Max 5MB). Previous photos are securely deleted from Cloudinary.
              </p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-2 sm:space-y-4 text-xs sm:text-sm">
            {/* Intern ID */}
            <div
              className="flex items-center justify-between py-2.5 sm:py-3 gap-2"
              style={{ borderBottom: "1px solid rgba(11,31,58,.07)" }}
            >
              <span
                className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm"
                style={{ color: "rgba(11,31,58,.55)" }}
              >
                <Hash
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                  style={{ color: "var(--iwms-sky)" }}
                />
                Intern ID
              </span>
              <span
                className="font-mono font-semibold text-xs sm:text-sm"
                style={{ color: "var(--iwms-black)" }}
              >
                {user?.internId || "N/A"}
              </span>
            </div>

            {/* Email */}
            <div
              className="flex items-center justify-between py-2.5 sm:py-3 gap-2"
              style={{ borderBottom: "1px solid rgba(11,31,58,.07)" }}
            >
              <span
                className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm shrink-0"
                style={{ color: "rgba(11,31,58,.55)" }}
              >
                <Mail
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                  style={{ color: "var(--iwms-sky)" }}
                />
                Work Email
              </span>
              <span
                className="font-medium text-[11px] sm:text-sm truncate max-w-[200px] sm:max-w-none text-right"
                style={{ color: "var(--iwms-black)" }}
                title={user?.email}
              >
                {user?.email}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between py-2.5 sm:py-3 gap-2">
              <span
                className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm"
                style={{ color: "rgba(11,31,58,.55)" }}
              >
                <Shield
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                  style={{ color: "var(--iwms-sky)" }}
                />
                Account Status
              </span>
              <span
                className="font-semibold capitalize px-2 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-xs"
                style={
                  user?.status === "active"
                    ? {
                        background: "rgba(16,185,129,.12)",
                        color: "#059669",
                        border: "1px solid rgba(16,185,129,.25)",
                      }
                    : {
                        background: "rgba(239,68,68,.12)",
                        color: "#DC2626",
                        border: "1px solid rgba(239,68,68,.25)",
                      }
                }
              >
                {user?.status || "Loading…"}
              </span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
