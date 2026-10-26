"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SessionUser } from "@/types";
import {
  Shield,
  Mail,
  Hash,
  Camera,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Phone,
  MapPin,
  GraduationCap,
  Globe,
  Link2,
  FileText,
  Save,
  Layers,
  HelpCircle,
} from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

export default function InternProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for editable personal details
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [college, setCollege] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [bio, setBio] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsSuccess, setDetailsSuccess] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

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
        if (data?.user) {
          setUser(data.user);
          setPhone(data.user.phone || "");
          setAddress(data.user.address || "");
          setCollege(data.user.college || "");
          setGithubUrl(data.user.githubUrl || "");
          setLinkedinUrl(data.user.linkedinUrl || "");
          setBio(data.user.bio || "");
        }
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

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDetails(true);
    setDetailsError(null);
    setDetailsSuccess(null);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          address: address.trim(),
          college: college.trim(),
          githubUrl: githubUrl.trim(),
          linkedinUrl: linkedinUrl.trim(),
          bio: bio.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile details");
      }

      setDetailsSuccess("Your details have been saved successfully and are now visible to the Admin!");
      fetchUser();
      setTimeout(() => setDetailsSuccess(null), 5000);
    } catch (err: unknown) {
      setDetailsError(err instanceof Error ? err.message : "Error saving profile details");
    } finally {
      setIsSavingDetails(false);
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
        description="Your verified identity, assignment parameters, personal details, and security credentials"
      />

      <main className="p-3 sm:p-5 lg:p-8 max-w-4xl space-y-6">
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

        {/* Identity & Verified Account Card */}
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
                      {user.role} Account {user.designation ? `• ${user.designation}` : ""}
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

          {/* Readonly Identity Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-xs sm:text-sm">
            {/* Intern ID */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                <Hash className="w-3.5 h-3.5 text-sky-500" />
                Intern ID
              </span>
              <p className="font-mono font-bold text-slate-800 text-sm mt-1">
                {user?.internId || "—"}
              </p>
            </div>

            {/* Email */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                <Mail className="w-3.5 h-3.5 text-sky-500" />
                Work Email
              </span>
              <p className="font-medium text-slate-800 text-xs mt-1 truncate" title={user?.email}>
                {user?.email || "—"}
              </p>
            </div>

            {/* Department */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                <Layers className="w-3.5 h-3.5 text-sky-500" />
                Department
              </span>
              <p className="font-medium text-slate-800 text-xs mt-1 truncate">
                {user?.department || "General"}
              </p>
            </div>

            {/* Status */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                <Shield className="w-3.5 h-3.5 text-sky-500" />
                Account Status
              </span>
              <div className="mt-1">
                <span
                  className="font-semibold capitalize px-2 py-0.5 rounded-full text-[11px] inline-block"
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
        </div>

        {/* Detailed Personal Profile Form */}
        <div
          className="iwms-card p-4 sm:p-7 space-y-5"
          style={{ borderRadius: "16px" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900">
                Personal & Contact Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Fill in your contact and background info. These details will be directly visible to the management team in the Admin Panel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event("iwms:replay-onboarding"));
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors self-start sm:self-auto"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
              Replay Orientation Walkthrough
            </button>
          </div>

          {detailsSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{detailsSuccess}</span>
            </div>
          )}

          {detailsError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{detailsError}</span>
            </div>
          )}

          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-sky-500" />
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* College / University */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-sky-500" />
                  College / University
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. Delhi University, IIT, NIT"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-500" />
                Current Address / City
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Flat / House No, Street, City, State, PIN code"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
              />
            </div>

            {/* Social Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* LinkedIn URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-sky-500" />
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* GitHub URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-500" />
                  GitHub / Portfolio URL
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Bio / About */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-500" />
                Short Bio / Skills Summary
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Briefly describe your skill set, key domains (e.g. Frontend, React, Python), and career goals..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingDetails}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
                style={{ background: "var(--iwms-sky)" }}
              >
                {isSavingDetails ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Details...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Profile Details
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
