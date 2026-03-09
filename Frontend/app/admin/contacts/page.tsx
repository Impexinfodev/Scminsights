"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message01Icon,
  Loading03Icon,
  Delete02Icon,
  Mail01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
import { useUser } from "@/hooks/useUser";
import axios from "axios";

type ContactRow = {
  ContactId: string;
  Name: string;
  Email: string;
  PhoneNumber: string;
  Message: string;
  Status: string;
  CreatedTime: string;
};

export default function AdminContactsPage() {
  const router = useRouter();
  const { user, isLoading, isLoggedIn, sessionChecked, sessionToken } = useUser(
    {
      redirectTo: "/login",
    },
  );

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 50,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyModal, setReplyModal] = useState<ContactRow | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = user?.user_details?.Role === "ADMIN";
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchContacts = useCallback(() => {
    if (!sessionToken || !backendUrl) return;
    setLoading(true);
    setError(null);
    axios
      .get(
        `${backendUrl}/api/admin/contacts?page=${pagination.page}&page_size=${pagination.page_size}&sort_order=desc`,
        {
          headers: {
            "Session-Token": sessionToken ?? "",
            "X-Client": "scm-insights",
          },
          withCredentials: true,
        },
      )
      .then((res) => {
        setContacts(res.data?.contacts ?? []);
        setPagination((prev) => ({
          ...prev,
          ...res.data?.pagination,
          total: res.data?.pagination?.total ?? 0,
          total_pages: res.data?.pagination?.total_pages ?? 0,
        }));
      })
      .catch((err) =>
        setError(
          err.response?.data?.error || "Failed to load contact submissions",
        ),
      )
      .finally(() => setLoading(false));
  }, [sessionToken, backendUrl, pagination.page, pagination.page_size]);

  useEffect(() => {
    if (!sessionChecked || !isLoggedIn) return;
    if (sessionChecked && isLoggedIn && !isAdmin) {
      router.replace("/");
      return;
    }
  }, [sessionChecked, isLoggedIn, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin || !sessionToken || !backendUrl) return;
    fetchContacts();
  }, [
    isAdmin,
    sessionToken,
    backendUrl,
    pagination.page,
    pagination.page_size,
    fetchContacts,
  ]);

  const openReply = (c: ContactRow) => {
    setReplyModal(c);
    const sub = (c.Message || "").trim().slice(0, 50);
    setReplySubject(
      sub
        ? `Re: ${sub}${(c.Message || "").length > 50 ? "…" : ""}`
        : "Re: Your enquiry – SCM Insights",
    );
    setReplyBody("");
  };

  const sendReply = async () => {
    if (!replyModal || !sessionToken || !backendUrl || !replyBody.trim())
      return;
    setReplySending(true);
    try {
      await axios.post(
        `${backendUrl}/api/admin/contacts/${replyModal.ContactId}/reply`,
        { subject: replySubject.trim() || undefined, body: replyBody.trim() },
        {
          headers: {
            "Session-Token": sessionToken ?? "",
            "X-Client": "scm-insights",
            "Content-Type": "application/json",
          },
          withCredentials: true,
        },
      );
      setReplyModal(null);
      fetchContacts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send reply");
    } finally {
      setReplySending(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!sessionToken || !backendUrl) return;
    setActionLoading(contactId);
    try {
      await axios.delete(`${backendUrl}/api/admin/contacts/${contactId}`, {
        headers: { "Session-Token": sessionToken ?? "", "X-Client": "scm-insights" },
        withCredentials: true,
      });
      setDeleteConfirm(null);
      fetchContacts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || !sessionChecked || (isLoggedIn && !isAdmin)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <HugeiconsIcon
          icon={Loading03Icon}
          size={32}
          className="text-blue-600 animate-spin"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
          <HugeiconsIcon
            icon={Message01Icon}
            size={24}
            className="text-white"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Contact submissions
          </h1>
          <p className="text-sm text-gray-500">
            Messages submitted via the contact form
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
          <span className="text-sm text-gray-600">
            {pagination.total > 0
              ? `Showing ${(pagination.page - 1) * pagination.page_size + 1}–${Math.min(pagination.page * pagination.page_size, pagination.total)} of ${pagination.total}`
              : "No submissions"}
          </span>
          <label className="text-sm text-gray-600 flex items-center gap-2">
            Rows per page
            <select
              value={pagination.page_size}
              onChange={(e) =>
                setPagination((p) => ({
                  ...p,
                  page_size: Number(e.target.value),
                  page: 1,
                }))
              }
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <HugeiconsIcon
              icon={Loading03Icon}
              size={28}
              className="text-blue-600 animate-spin"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider max-w-[200px]">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500 text-sm"
                    >
                      No contact submissions yet.
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => (
                    <tr key={c.ContactId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {c.Name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="break-all">{c.Email || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                        {c.PhoneNumber || "—"}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate"
                        title={c.Message}
                      >
                        {c.Message || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                        {c.CreatedTime
                          ? new Date(c.CreatedTime).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            c.Status === "NEW"
                              ? "bg-amber-100 text-amber-700"
                              : c.Status === "REPLIED"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {c.Status || "NEW"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openReply(c)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Reply by email"
                          >
                            <HugeiconsIcon icon={Mail01Icon} size={14} />
                            Reply
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(c.ContactId)}
                            disabled={actionLoading === c.ContactId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                            title="Delete"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total_pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600 bg-gray-50/30">
            <span>
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} /> Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
              >
                Next <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Reply modal */}
      <AnimatePresence>
        {replyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !replySending && setReplyModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  Reply to {replyModal.Name || replyModal.Email}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Reply will be sent to {replyModal.Email}
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Re: Your enquiry"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Type your reply..."
                  />
                </div>
              </div>
              <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !replySending && setReplyModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={replySending || !replyBody.trim()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {replySending ? (
                    <>
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        size={18}
                        className="animate-spin"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Mail01Icon} size={18} />
                      Send reply
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !actionLoading && setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5"
            >
              <p className="text-gray-700 font-medium">
                Delete this contact submission? This cannot be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={!!actionLoading}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading === deleteConfirm ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <HugeiconsIcon icon={Delete02Icon} size={18} />
                  )}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
