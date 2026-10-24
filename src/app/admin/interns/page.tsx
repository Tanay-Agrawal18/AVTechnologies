"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { IUser } from "@/types";
import { formatDate, getStatusBadgeClass } from "@/lib/utils";
import {
  Users,
  Search,
  UserPlus,
  KeyRound,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  Edit2,
} from "lucide-react";

export default function AdminInternsPage() {
  const [interns, setInterns] = useState<IUser[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // New Intern Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccessLink, setModalSuccessLink] = useState<string | null>(null);

  // Edit Intern Modal State
  const [editingIntern, setEditingIntern] = useState<IUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editInternId, setEditInternId] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Reset link toast state
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const fetchInterns = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (statusFilter !== "all") query.set("status", statusFilter);

      const res = await fetch(`/api/admin/interns?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInterns(data.interns || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterns();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInterns();
  };

  const handleCreateIntern = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccessLink(null);

    try {
      const res = await fetch("/api/admin/interns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          department: department || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create intern");
      }

      setModalSuccessLink(data.activationLink);
      fetchInterns();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to create intern");
    }
  };

  const handleToggleStatus = async (intern: IUser) => {
    const nextStatus = intern.status === "active" ? "inactive" : "active";
    const confirmMsg = nextStatus === "inactive"
      ? `Are you sure you want to deactivate ${intern.name}? They will not be able to log in to the dashboard or submit deliverables while inactive.`
      : `Reactivate ${intern.name}? They will regain access to their assigned tasks and dashboard.`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/interns/${intern._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchInterns();
      }
    } catch {
      alert("Failed to update status");
    }
  };

  const handleGenerateReset = async (intern: IUser) => {
    try {
      const res = await fetch(`/api/admin/interns/${intern._id}/reset-link`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.resetLink) {
        navigator.clipboard.writeText(data.resetLink);
        setCopiedLink(`One-time setup link copied for ${intern.name}!`);
        setTimeout(() => setCopiedLink(null), 4000);
      }
    } catch {
      alert("Failed to generate setup link");
    }
  };

  const openEditModal = (intern: IUser) => {
    setEditingIntern(intern);
    setEditName(intern.name);
    setEditEmail(intern.email);
    setEditInternId(intern.internId || "");
    setEditDepartment(intern.department || "");
    setEditDesignation(intern.designation || "");
    setEditPhone(intern.phone || "");
    setEditStartDate(intern.startDate || "");
    setEditEndDate(intern.endDate || "");
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIntern) return;
    setEditError(null);
    setIsSavingEdit(true);

    try {
      const res = await fetch(`/api/admin/interns/${editingIntern._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          internId: editInternId || undefined,
          department: editDepartment || undefined,
          designation: editDesignation || undefined,
          phone: editPhone || undefined,
          startDate: editStartDate || undefined,
          endDate: editEndDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update member");
      }

      setEditingIntern(null);
      fetchInterns();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Intern Roster Management"
        description="Create individual intern accounts, monitor onboarding statuses, and manage access"
      />

      <main className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {copiedLink && (
          <div className="p-3 sm:p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center justify-between gap-2">
            <span className="truncate">{copiedLink}</span>
            <button
              onClick={() => setCopiedLink(null)}
              className="text-emerald-600 hover:text-emerald-800 text-xs shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="iwms-card p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(11,31,58,0.4)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, ID..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-black)" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 xs:flex-none px-3 py-2 text-xs sm:text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-navy)" }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending_setup">Pending Setup</option>
              </select>
              <button
                type="submit"
                className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors hover:bg-slate-100"
                style={{ background: "rgba(11,31,58,0.05)", color: "var(--iwms-navy)" }}
              >
                Search
              </button>
            </div>
          </form>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
            <Link
              href="/admin/import"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-colors hover:bg-slate-50 text-center"
              style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-navy)" }}
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-600 shrink-0" /> Bulk Import
            </Link>
            <button
              onClick={() => {
                setIsModalOpen(true);
                setModalError(null);
                setModalSuccessLink(null);
              }}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white rounded-xl shadow-xs transition-all hover:opacity-95 active:scale-95 text-center"
              style={{ background: "#0284C7" }}
            >
              <UserPlus className="w-4 h-4 shrink-0" /> Add Intern
            </button>
          </div>
        </div>

        {/* Interns Table */}
        <div className="iwms-card overflow-hidden shadow-xs" style={{ borderRadius: "14px" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wider" style={{ background: "rgba(11,31,58,0.02)", borderColor: "var(--iwms-border)", color: "rgba(11,31,58,0.55)" }}>
                  <th className="py-3 px-4">Intern ID</th>
                  <th className="py-3 px-4">Name & Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Cohort Period</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm" style={{ borderColor: "var(--iwms-border)" }}>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs sm:text-sm" style={{ color: "rgba(11,31,58,0.45)" }}>
                      Loading roster...
                    </td>
                  </tr>
                ) : interns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No interns found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try modifying your search or add your first intern.
                      </p>
                    </td>
                  </tr>
                ) : (
                  interns.map((intern) => (
                    <tr key={intern._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {intern.internId || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/interns/${intern._id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 inline-flex items-center gap-1"
                        >
                          {intern.name}
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                        <div className="text-xs text-slate-500">{intern.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {intern.department || "General"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClass(
                            intern.status
                          )}`}
                        >
                          {intern.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {intern.startDate ? formatDate(intern.startDate) : "N/A"} →{" "}
                        {intern.endDate ? formatDate(intern.endDate) : "Ongoing"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(intern)}
                            title="Edit member details"
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleGenerateReset(intern)}
                            title="Generate one-time activation/reset link"
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(intern)}
                            title={intern.status === "active" ? "Deactivate" : "Activate"}
                            className={`p-1.5 rounded hover:bg-slate-100 ${
                              intern.status === "active"
                                ? "text-slate-400 hover:text-rose-600"
                                : "text-emerald-600 hover:text-emerald-700"
                            }`}
                          >
                            {intern.status === "active" ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Manual Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Add Intern Account</h3>
            <p className="text-xs text-slate-500 mb-5">
              An expiring one-time link will be generated for password setup. Plaintext passwords are never accepted.
            </p>

            {modalError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccessLink ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                  <p className="font-semibold mb-1">Account successfully created!</p>
                  <p className="text-xs mb-3">
                    Copy and share this one-time setup link with the intern:
                  </p>
                  <input
                    type="text"
                    readOnly
                    value={modalSuccessLink}
                    className="w-full p-2 bg-white border border-emerald-300 rounded text-xs font-mono select-all"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setName("");
                      setEmail("");
                      setDepartment("");
                    }}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateIntern} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Patel"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Corporate Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maya.p@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Engineering, Design, Analytics..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                  >
                    Create & Generate Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Intern Modal */}
      {editingIntern && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Edit Member Profile</h3>
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
                  placeholder="e.g. AV-2026-001"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
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

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingIntern(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
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
