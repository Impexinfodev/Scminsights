"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import TrialBanner from "@/components/TrialBanner";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Mail01Icon,
  CallIcon,
  Building02Icon,
  Loading03Icon,
  Cancel01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import axios from "axios";
import { useUser } from "@/hooks/useUser";

interface DirectoryItem {
  id?: number;
  IEC_NAME: string;
  IEC_EMAIL: string;
  IEC_MOBILE: string;
}

interface Meta {
  total_items: number;
  total_pages: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

const maskEmail = (email: string) => {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return "***@***.***";
  const maskedLocal = local.substring(0, 2) + "***";
  const [domainName, ext] = domain.split(".");
  const maskedDomain = domainName.substring(0, 2) + "***";
  return `${maskedLocal}@${maskedDomain}.${ext || "***"}`;
};

const maskMobile = (mobile: string) => {
  if (!mobile) return null;
  if (mobile.length <= 4) return "****";
  return mobile.substring(0, 2) + "****" + mobile.substring(mobile.length - 2);
};

const maskName = (name: string) => {
  if (!name) return "*****";
  const words = name.split(" ");
  if (words.length >= 2) {
    return (
      words[0].substring(0, 3) +
      "*** " +
      words
        .slice(1)
        .map(() => "***")
        .join(" ")
    );
  }
  return name.substring(0, 3) + "***";
};

export default function BuyersDirectoryPageClient() {
  const { sessionToken, isLoading: userLoading } = useUser({
    redirectTo: "/login",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DirectoryItem[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<Meta>({
    total_items: 0,
    total_pages: 0,
    page: 1,
    limit: 25,
    has_next: false,
    has_prev: false,
  });

  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "warning" | "success";
  } | null>(null);

  // Page size dropdown
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const pageSizeRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pageSizeRef.current &&
        !pageSizeRef.current.contains(event.target as Node)
      ) {
        setIsPageSizeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchLicenseInfo = useCallback(async () => {
    if (!sessionToken) {
      setIsCheckingLicense(false);
      return;
    }
    try {
      const response = await axios.get(`${backendUrl}/userLicenseInfo`, {
        headers: { "Session-Token": sessionToken },
      });
      setLicenseInfo(response.data || null);
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem("session");
        router.push("/login");
      }
      setLicenseInfo(null);
    } finally {
      setIsCheckingLicense(false);
    }
  }, [backendUrl, sessionToken, router]);

  useEffect(() => {
    fetchLicenseInfo();
  }, [fetchLicenseInfo]);

  const hasSimsAccess = useMemo(
    () => licenseInfo?.IsSimsAccess === true,
    [licenseInfo],
  );
  const trialDirLimit = useMemo(
    () => licenseInfo?.NumberOfRowsPerPeriod ?? 10,
    [licenseInfo],
  );
  const trialSearchRows = useMemo(
    () => licenseInfo?.DirectoryRowsPerSearch ?? 5,
    [licenseInfo],
  );
  const effectivePageSize = hasSimsAccess ? pageSize : trialSearchRows;

  const pageSizeOptions = hasSimsAccess
    ? [
        { value: 10, label: "10 per page" },
        { value: 25, label: "25 per page" },
        { value: 50, label: "50 per page" },
      ]
    : [
        {
          value: trialSearchRows,
          label: `${trialSearchRows} per page (trial)`,
        },
      ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSimsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: effectivePageSize.toString(),
      });
      if (debouncedSearch.trim())
        params.append("search", debouncedSearch.trim());
      const response = await axios.get(
        `${backendUrl}/api/sims-data?${params.toString()}`,
        {
          headers: sessionToken ? { "Session-Token": sessionToken } : {},
        },
      );

      if (response.data?.success) {
        let fetchedData = response.data.data || [];
        const meta = response.data.meta || {};

        if (!hasSimsAccess) {
          fetchedData = fetchedData
            .slice(0, trialDirLimit)
            .map((item: any) => ({
              ...item,
              // Name visible in directory; only contact details masked for trial
              IEC_NAME: item.IEC_NAME ?? "",
              IEC_EMAIL: item.IEC_EMAIL
                ? maskEmail(item.IEC_EMAIL)
                : item.IEC_EMAIL,
              IEC_MOBILE: item.IEC_MOBILE
                ? maskMobile(item.IEC_MOBILE)
                : item.IEC_MOBILE,
            }));
          setPaginationMeta({
            ...meta,
            total_items: Math.min(meta.total_items || 0, trialDirLimit),
            total_pages: 1,
            has_next: false,
          });
        } else {
          setPaginationMeta(meta);
        }

        setData(fetchedData);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem("session");
        router.push("/login");
        return;
      }
      setToast({
        message: error.response?.data?.error || "Failed to load data.",
        type: "error",
      });
      setData([]);
      setPaginationMeta({
        total_items: 0,
        total_pages: 0,
        page: 1,
        limit: effectivePageSize,
        has_next: false,
        has_prev: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    effectivePageSize,
    debouncedSearch,
    hasSimsAccess,
    trialDirLimit,
    backendUrl,
    sessionToken,
    router,
  ]);

  useEffect(() => {
    fetchSimsData();
  }, [fetchSimsData]);

  // Pagination handlers
  const totalPages = Math.ceil(paginationMeta.total_items / effectivePageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || isLoading) return;
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setIsPageSizeOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 shadow-lg ${
              toast.type === "error"
                ? "bg-red-500 text-white"
                : toast.type === "warning"
                  ? "bg-amber-500 text-white"
                  : "bg-green-500 text-white"
            }`}
          >
            {toast.message}
            <button
              onClick={() => setToast(null)}
              className="hover:opacity-80 cursor-pointer"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Buyers Directory
            </h1>
            <p className="text-gray-500">
              Browse verified importers with contact details
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Trial banner – contact details masked, row limit applies */}
        {!hasSimsAccess && !isCheckingLicense && data.length > 0 && (
          <TrialBanner context="directory" rowLimit={trialDirLimit} className="mb-6" />
        )}

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <HugeiconsIcon icon={Search01Icon} size={18} />
              </div>
              <input
                type="text"
                placeholder="Search by company name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 text-sm bg-white border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="h-12 px-5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Table Header Info */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-gray-50">
            <span className="text-gray-600 text-sm">
              {paginationMeta.total_items === 0 ? (
                "No companies"
              ) : (
                <>
                  Showing{" "}
                  <span className="font-semibold text-gray-900">
                    {(currentPage - 1) * effectivePageSize + 1}
                  </span>{" "}
                  -{" "}
                  <span className="font-semibold text-gray-900">
                    {Math.min(
                      currentPage * effectivePageSize,
                      paginationMeta.total_items,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-900">
                    {paginationMeta.total_items.toLocaleString()}
                  </span>{" "}
                  companies
                </>
              )}
            </span>

            {/* Page Size Dropdown */}
            {hasSimsAccess && (
              <div className="relative" ref={pageSizeRef}>
                <button
                  type="button"
                  onClick={() => setIsPageSizeOpen(!isPageSizeOpen)}
                  className="h-9 px-4 pr-9 text-sm bg-white border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-all cursor-pointer text-left"
                >
                  {
                    pageSizeOptions.find(
                      (opt) =>
                        opt.value ===
                        (hasSimsAccess ? pageSize : effectivePageSize),
                    )?.label
                  }
                </button>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    size={14}
                    className={`transition-transform ${isPageSizeOpen ? "rotate-180" : ""}`}
                  />
                </div>

                <AnimatePresence>
                  {isPageSizeOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute right-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
                    >
                      {pageSizeOptions.map((option) => (
                        <li
                          key={option.value}
                          onClick={() => handlePageSizeChange(option.value)}
                          className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${
                            (hasSimsAccess ? pageSize : effectivePageSize) ===
                            option.value
                              ? "bg-blue-50 text-blue-600 font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          {option.label}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Table Content */}
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 w-16">
                    #
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        icon={Building02Icon}
                        size={16}
                        className="text-gray-400"
                      />
                      Company Name
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        icon={Mail01Icon}
                        size={16}
                        className="text-gray-400"
                      />
                      Email
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        icon={CallIcon}
                        size={16}
                        className="text-gray-400"
                      />
                      Mobile
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        size={28}
                        className="mx-auto mb-3 text-blue-500 animate-spin"
                      />
                      <p className="text-gray-500">Loading directory...</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <HugeiconsIcon
                        icon={Building02Icon}
                        size={40}
                        className="mx-auto mb-3 text-gray-300"
                      />
                      <p className="text-gray-500 mb-1">No results found</p>
                      <p className="text-gray-400 text-xs">
                        Try adjusting your search query
                      </p>
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr
                      key={item.id ?? `row-${index}`}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-400 font-medium">
                        {(currentPage - 1) * effectivePageSize + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">
                          {item.IEC_NAME || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {item.IEC_EMAIL ? (
                          <span className="text-gray-600">
                            {item.IEC_EMAIL}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {item.IEC_MOBILE ? (
                          <span className="text-gray-600">
                            {item.IEC_MOBILE}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!isLoading && data.length > 0 && hasSimsAccess && (
            <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-gray-50">
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1 || isLoading}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Previous
                </button>
                <span className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-blue-50 border border-blue-200 rounded-lg">
                  {currentPage}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || isLoading}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages || isLoading}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
