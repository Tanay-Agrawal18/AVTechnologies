"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ITaskTemplate, TaskPriority } from "@/types";
import { formatDate, getPriorityBadgeClass } from "@/lib/utils";
import {
  FileSpreadsheet,
  PlusCircle,
  Search,
  Filter,
  AlertCircle,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Layers,
  ArrowRight,
  Clock,
  Tag,
} from "lucide-react";

export default function AdminTaskTemplatesPage() {
  const [templates, setTemplates] = useState<ITaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modal State for Create & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ITaskTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [defaultDueDaysOffset, setDefaultDueDaysOffset] = useState<string>("");
  const [tagsString, setTagsString] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion/Deactivation confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (priorityFilter !== "all") query.set("priority", priorityFilter);
      if (includeInactive) query.set("includeInactive", "true");

      const res = await fetch(`/api/admin/templates?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Failed to load task templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [priorityFilter, includeInactive]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTemplates();
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDefaultDueDaysOffset("");
    setTagsString("");
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tmpl: ITaskTemplate) => {
    setEditingTemplate(tmpl);
    setTitle(tmpl.title);
    setDescription(tmpl.description);
    setPriority(tmpl.priority);
    setDefaultDueDaysOffset(
      tmpl.defaultDueDaysOffset !== null && tmpl.defaultDueDaysOffset !== undefined
        ? tmpl.defaultDueDaysOffset.toString()
        : ""
    );
    setTagsString(tmpl.tags ? tmpl.tags.join(", ") : "");
    setIsActive(tmpl.isActive);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    const tags = tagsString
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const offsetNumber = defaultDueDaysOffset.trim() === "" ? null : Number(defaultDueDaysOffset);
    if (offsetNumber !== null && (isNaN(offsetNumber) || offsetNumber < 0 || offsetNumber > 365)) {
      setModalError("Due date offset must be a valid number between 0 and 365 days.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      title,
      description,
      priority,
      defaultDueDaysOffset: offsetNumber,
      tags,
      isActive,
    };

    try {
      const url = editingTemplate
        ? `/api/admin/templates/${editingTemplate._id}`
        : "/api/admin/templates";
      const method = editingTemplate ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save template");
      }

      setIsModalOpen(false);
      setActionNotice(
        editingTemplate
          ? `Template "${title}" updated successfully.`
          : `Template "${title}" created successfully.`
      );
      setTimeout(() => setActionNotice(null), 5000);
      fetchTemplates();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (tmpl: ITaskTemplate) => {
    try {
      const res = await fetch(`/api/admin/templates/${tmpl._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tmpl.isActive }),
      });
      if (res.ok) {
        setActionNotice(
          tmpl.isActive
            ? `Template "${tmpl.title}" deactivated.`
            : `Template "${tmpl.title}" activated.`
        );
        setTimeout(() => setActionNotice(null), 4000);
        fetchTemplates();
      }
    } catch {
      alert("Failed to toggle template status");
    }
  };

  const handleDeleteOrDeactivate = async (tmpl: ITaskTemplate) => {
    const confirmPrompt =
      tmpl.usageCount > 0
        ? `Template "${tmpl.title}" has been used to create ${tmpl.usageCount} tasks.\nIt will be safely deactivated to preserve assignment and audit history. Proceed?`
        : `Are you sure you want to delete template "${tmpl.title}"? This cannot be undone.`;

    if (!confirm(confirmPrompt)) return;

    setDeletingId(tmpl._id);
    try {
      const res = await fetch(`/api/admin/templates/${tmpl._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setActionNotice(data.message || "Template removed successfully.");
        setTimeout(() => setActionNotice(null), 5000);
        fetchTemplates();
      } else {
        alert(data.error || "Failed to remove template");
      }
    } catch {
      alert("Failed to remove template");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Reusable Task Templates"
        description="Standardize recurring intern deliverables, default priorities, and instructions"
      />

      <main className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Action Notice Banner */}
        {actionNotice && (
          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-sm flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button
              onClick={() => setActionNotice(null)}
              className="text-xs text-sky-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3"
          >
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search templates by title, tag, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer px-1">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              Show Inactive
            </label>

            <button
              type="submit"
              className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Filter
            </button>
          </form>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/tasks"
              className="px-3 py-2 text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" /> Back to Tasks
            </Link>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs hover:opacity-90 shrink-0"
              style={{ background: "#0284C7" }}
            >
              <PlusCircle className="w-4 h-4 shrink-0" /> New Template
            </button>
          </div>
        </div>

        {/* Templates Grid / Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Template Title & Guidelines</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Default Due Offset</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4">Usage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading templates...
                    </td>
                  </tr>
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No task templates found</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Create reusable templates for onboarding sprints, code reviews, and milestones to speed up task creation.
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 text-white rounded-lg text-xs font-semibold"
                        style={{ background: "#0284C7" }}
                      >
                        <PlusCircle className="w-4 h-4" /> Create First Template
                      </button>
                    </td>
                  </tr>
                ) : (
                  templates.map((tmpl) => (
                    <tr
                      key={tmpl._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !tmpl.isActive ? "bg-slate-50/50 opacity-75" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <div className="font-semibold text-slate-900 truncate">
                          {tmpl.title}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 whitespace-pre-line">
                          {tmpl.description}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${getPriorityBadgeClass(
                            tmpl.priority
                          )}`}
                        >
                          {tmpl.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {tmpl.defaultDueDaysOffset !== null && tmpl.defaultDueDaysOffset !== undefined ? (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            +{tmpl.defaultDueDaysOffset} day{tmpl.defaultDueDaysOffset === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None specified</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-[180px]">
                        {tmpl.tags && tmpl.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tmpl.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium"
                              >
                                <Tag className="w-2.5 h-2.5 text-slate-400" />
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {tmpl.usageCount || 0} used
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tmpl.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(tmpl)}
                            className="p-1.5 rounded-md text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                            title="Edit Template"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(tmpl)}
                            className={`p-1.5 rounded-md transition-colors ${
                              tmpl.isActive
                                ? "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={tmpl.isActive ? "Deactivate" : "Activate"}
                          >
                            {tmpl.isActive ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteOrDeactivate(tmpl)}
                            disabled={deletingId === tmpl._id}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title={tmpl.usageCount > 0 ? "Deactivate (used in tasks)" : "Delete"}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Create / Edit Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              {editingTemplate ? "Edit Task Template" : "Create Reusable Task Template"}
            </h3>
            <p className="text-xs text-slate-500 mb-4 sm:mb-5">
              Define reusable requirements, priority, guidelines, and default due date offset.
            </p>

            {modalError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly Status Progress Report"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Deliverable Instructions *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Comprehensive guidelines, acceptance criteria, links, or report format..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Date Offset (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={defaultDueDaysOffset}
                    onChange={(e) => setDefaultDueDaysOffset(e.target.value)}
                    placeholder="e.g. 7 (days from assignment)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Optional. Pre-computes due date when creating tasks.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsString}
                  onChange={(e) => setTagsString(e.target.value)}
                  placeholder="e.g. Onboarding, Weekly, Frontend, Bugfix"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  Template is Active and available in task creation
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-white rounded-lg text-xs font-semibold shadow-xs hover:opacity-90 disabled:opacity-50 transition-all"
                  style={{ background: "#0284C7" }}
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingTemplate
                    ? "Update Template"
                    : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
