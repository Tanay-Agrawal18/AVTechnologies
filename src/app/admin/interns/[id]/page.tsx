"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { IUser, ITask } from "@/types";
import { formatDate, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import {
  ArrowLeft,
  KeyRound,
  CheckCircle,
  XCircle,
  Clock,
  CheckSquare,
  AlertCircle,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  GraduationCap,
  Globe,
  Link2,
  FileText,
  ExternalLink,
  CreditCard,
  Award,
} from "lucide-react";

export default function AdminInternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [intern, setIntern] = useState<IUser | null>(null);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Member Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editInternId, setEditInternId] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCollege, setEditCollege] = useState("");
  const [editGithubUrl, setEditGithubUrl] = useState("");
  const [editLinkedinUrl, setEditLinkedinUrl] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editCertificateUrl, setEditCertificateUrl] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive" | "pending_setup">("active");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/interns/${id}`);
      if (res.ok) {
        const data = await res.json();
        setIntern(data.intern);
        setTasks(data.tasks || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();

    const handleRevalidate = () => {
      fetchDetail();
    };
    window.addEventListener("iwms:revalidate", handleRevalidate);
    return () => {
      window.removeEventListener("iwms:revalidate", handleRevalidate);
    };
  }, [id]);

  const handleGenerateReset = async () => {
    try {
      const res = await fetch(`/api/admin/interns/${id}/reset-link`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.resetLink) {
        navigator.clipboard.writeText(data.resetLink);
        setResetMessage("One-time setup link copied to clipboard!");
        setTimeout(() => setResetMessage(null), 4000);
      }
    } catch {
      alert("Failed to generate link");
    }
  };

  const handleToggleStatus = async () => {
    if (!intern) return;
    const nextStatus = intern.status === "active" ? "inactive" : "active";
    if (!confirm(`Are you sure you want to mark ${intern.name} as ${nextStatus}?`)) return;

    try {
      const res = await fetch(`/api/admin/interns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) fetchDetail();
    } catch {
      alert("Failed to update status");
    }
  };

  const handleDeleteIntern = async () => {
    if (!intern) return;
    const promptText = `⚠️ PERMANENT HARD DELETE\n\nAre you sure you want to completely delete intern "${intern.name}" (${intern.internId || intern.email})?\n\nThis will permanently delete:\n• The intern user profile\n• All tasks assigned or transferred to them\n• All their submissions, code files, and attachments\n• All daily progress images\n• All issued documents (offer letters, certificates)\n• All related email logs\n• Remove them from all project teams\n\nType DELETE to confirm:`;
    const input = prompt(promptText);
    if (input !== "DELETE") {
      if (input !== null) {
        alert("Deletion cancelled. You must type DELETE exactly to proceed.");
      }
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/interns/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete intern");
      }
      alert(`Intern "${intern.name}" and all associated data have been permanently deleted.`);
      router.push("/admin/interns");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete intern");
      setIsDeleting(false);
    }
  };

  const openEditModal = () => {
    if (!intern) return;
    setEditName(intern.name);
    setEditEmail(intern.email);
    setEditInternId(intern.internId || "");
    setEditDepartment(intern.department || "");
    setEditDesignation(intern.designation || "");
    setEditPhone(intern.phone || "");
    setEditAddress(intern.address || "");
    setEditCollege(intern.college || "");
    setEditGithubUrl(intern.githubUrl || "");
    setEditLinkedinUrl(intern.linkedinUrl || "");
    setEditBio(intern.bio || "");
    setEditStartDate(intern.startDate || "");
    setEditEndDate(intern.endDate || "");
    setEditCertificateUrl(intern.certificateUrl || "");
    setEditStatus(intern.status);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intern) return;
    setEditError(null);
    setIsSavingEdit(true);

    try {
      const res = await fetch(`/api/admin/interns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          internId: editInternId || undefined,
          department: editDepartment || undefined,
          designation: editDesignation || undefined,
          phone: editPhone || undefined,
          address: editAddress || undefined,
          college: editCollege || undefined,
          githubUrl: editGithubUrl || undefined,
          linkedinUrl: editLinkedinUrl || undefined,
          bio: editBio || undefined,
          startDate: editStartDate || undefined,
          endDate: editEndDate || undefined,
          certificateUrl: editCertificateUrl || undefined,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update member");
      }

      setIsEditOpen(false);
      fetchDetail();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <DashboardHeader title="Intern Profile" />
        <main className="p-8 text-slate-500">Loading intern details...</main>
      </>
    );
  }

  if (!intern) {
    return (
      <>
        <DashboardHeader title="Intern Not Found" />
        <main className="p-8">
          <p className="text-slate-600 mb-4">The requested intern record was not found.</p>
          <Link href="/admin/interns" className="text-blue-600 font-semibold hover:underline">
            &larr; Back to Interns List
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        title={`${intern.name} (${intern.internId || "Intern"})`}
        description="Intern portfolio, assigned task history, and account security controls"
      />

      <main className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href="/admin/interns"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" /> Back to Interns
          </Link>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
            <Link
              href={`/admin/interns/${intern._id}/id-card`}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100"
            >
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 shrink-0" /> ID Card
            </Link>
            <button
              onClick={openEditModal}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" /> Edit Member
            </button>
            <button
              onClick={handleGenerateReset}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-center"
            >
              <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" /> Reset Link
            </button>
            <button
              onClick={handleToggleStatus}
              className={`col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg ${
                intern.status === "active"
                  ? "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {intern.status === "active" ? (
                <>
                  <XCircle className="w-4 h-4 text-slate-500" /> Deactivate
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Activate
                </>
              )}
            </button>
            <button
              onClick={handleDeleteIntern}
              disabled={isDeleting}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              {isDeleting ? "Deleting..." : "Delete Intern"}
            </button>
          </div>
        </div>

        {resetMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {resetMessage}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
          {/* Top Info & Avatar */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-5 border-b border-slate-100 text-center sm:text-left">
            {intern.profilePicture ? (
              <img
                src={intern.profilePicture}
                alt={intern.name}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover ring-4 ring-sky-100 shadow-sm shrink-0"
              />
            ) : (
              <div
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full flex items-center justify-center font-bold text-xl sm:text-2xl shrink-0"
                style={{
                  background: "rgba(56,189,248,.15)",
                  color: "var(--iwms-sky)",
                  border: "2px solid rgba(56,189,248,.30)",
                }}
              >
                {intern.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}

            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">{intern.name}</h2>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getStatusBadgeClass(
                    intern.status
                  )}`}
                >
                  {intern.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                {intern.designation || "Intern"} • {intern.department || "General"} Department
              </p>
              {intern.bio && (
                <p className="text-xs sm:text-sm text-slate-600 pt-1 max-w-2xl italic">
                  &ldquo;{intern.bio}&rdquo;
                </p>
              )}
            </div>

            {/* Quick Links */}
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              {intern.linkedinUrl && (
                <a
                  href={intern.linkedinUrl.startsWith("http") ? intern.linkedinUrl : `https://${intern.linkedinUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  LinkedIn
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              )}
              {intern.githubUrl && (
                <a
                  href={intern.githubUrl.startsWith("http") ? intern.githubUrl : `https://${intern.githubUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  GitHub
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              )}
              {intern.certificateUrl && (
                <a
                  href={intern.certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors"
                  title="View / Download Internship Certificate"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Certificate
                  <ExternalLink className="w-3 h-3 ml-0.5 text-emerald-600" />
                </a>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Intern ID</span>
              <p className="font-mono font-bold text-slate-800 text-sm mt-0.5 truncate">
                {intern.internId || "—"}
              </p>
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Work Email</span>
              <p className="font-medium text-slate-800 text-xs sm:text-sm mt-0.5 truncate" title={intern.email}>
                {intern.email}
              </p>
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase flex items-center gap-1">
                <Phone className="w-3 h-3 text-sky-500" /> Mobile Phone
              </span>
              <p className="font-medium text-slate-800 text-xs sm:text-sm mt-0.5 truncate">
                {intern.phone ? (
                  <a href={`tel:${intern.phone}`} className="hover:text-blue-600 hover:underline">
                    {intern.phone}
                  </a>
                ) : (
                  <span className="text-slate-400">Not provided</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-sky-500" /> College / Univ
              </span>
              <p className="font-medium text-slate-800 text-xs sm:text-sm mt-0.5 truncate" title={intern.college}>
                {intern.college || <span className="text-slate-400">Not provided</span>}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-500" /> Address / Location
              </span>
              <p className="font-medium text-slate-800 text-xs sm:text-sm mt-0.5 truncate" title={intern.address}>
                {intern.address || <span className="text-slate-400">Not provided</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Task History Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Assigned Task Portfolio</h3>
              <p className="text-xs text-slate-500">
                All tasks assigned to this intern across their engagement lifecycle
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {tasks.length} total tasks
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      No tasks assigned yet to this intern.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {task.title}
                        {task.isArchived && (
                          <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium uppercase ${getPriorityBadgeClass(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClass(
                            task.status
                          )}`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {formatDate(task.assignmentDate)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {formatDate(task.dueDate)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/tasks/${task._id}`}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Manage & Review &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit Member Modal */}
      {isEditOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150 relative">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close modal"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1 pr-8">Edit Member Profile</h3>
            <p className="text-xs text-slate-500 mb-5">
              Update intern details. Roles, credentials, and authentication secrets are strictly protected.
            </p>

            {editError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intern ID *
                </label>
                <input
                  type="text"
                  required
                  value={editInternId}
                  onChange={(e) => setEditInternId(e.target.value)}
                  placeholder="e.g. VYOR-26-01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Maya Patel"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="maya.p@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    placeholder="Engineering"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    placeholder="Full Stack Intern"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College / University
                  </label>
                  <input
                    type="text"
                    value={editCollege}
                    onChange={(e) => setEditCollege(e.target.value)}
                    placeholder="Delhi University, IIT, etc."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address / City
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Street, City, State, PIN"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    LinkedIn Profile
                  </label>
                  <input
                    type="url"
                    value={editLinkedinUrl}
                    onChange={(e) => setEditLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GitHub Profile
                  </label>
                  <input
                    type="url"
                    value={editGithubUrl}
                    onChange={(e) => setEditGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bio / Summary
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Intern bio and skill summary"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internship Certificate Drive Link (Optional)
                </label>
                <input
                  type="url"
                  value={editCertificateUrl}
                  onChange={(e) => setEditCertificateUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Provide Google Drive link to the completion certificate. Automatically shown on the intern&apos;s public QR verification profile when the internship ends or URL is set.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Status *
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as "active" | "inactive" | "pending_setup")}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="active">Active (Access allowed)</option>
                  <option value="inactive">Inactive (Deactivated / Blocked)</option>
                  <option value="pending_setup">Pending Setup (Awaiting password setup)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Setting to Inactive immediately terminates active sessions and blocks dashboard access.
                </p>
              </div>

              <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs flex justify-end gap-3 pt-3 pb-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSavingEdit ? "Saving Changes..." : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
