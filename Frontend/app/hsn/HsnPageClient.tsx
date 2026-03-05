"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Search,
  Tag,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  X,
} from "lucide-react";
import axios from "axios";
import { useUser } from "@/hooks/useUser";

interface HsnItem {
  code: string;
  description?: string;
  name?: string;
  type?: string;
  tax_rate?: string;
  cgst_rate?: string;
  sgst_rate?: string;
}

type SortByOption = "code" | "description" | "type";

const SEARCH_DEBOUNCE_MS = 300;

export default function HsnPageClient() {
  const { sessionToken, isLoading: userLoading } = useUser({
    redirectTo: "/login",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortBy, setSortBy] = useState<SortByOption>("code");
  const [isLoading, setIsLoading] = useState(true);
  const [pageData, setPageData] = useState<HsnItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [fetchError, setFetchError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(searchQuery.trim());
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDebounced, rowsPerPage, sortBy]);

  const fetchPage = useCallback(async () => {
    if (!sessionToken) return;

    setIsLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        page_size: String(rowsPerPage),
        sort: sortBy,
      });
      if (searchDebounced) params.set("search", searchDebounced);

      const res = await axios.get(
        `${backendUrl}/hscodes-descriptions?${params.toString()}`,
        { headers: { "Session-Token": sessionToken } },
      );

      const json = res.data;
      if (
        json &&
        typeof json.data !== "undefined" &&
        typeof json.total === "number"
      ) {
        const list = Array.isArray(json.data) ? json.data : [];
        setPageData(
          list.map((x: Record<string, unknown>) => ({
            code: String(x.code ?? ""),
            description: String(x.name ?? x.description ?? ""),
            name: x.name != null ? String(x.name) : undefined,
            type: x.type != null ? String(x.type) : undefined,
            tax_rate: x.tax_rate != null ? String(x.tax_rate) : undefined,
            cgst_rate: x.cgst_rate != null ? String(x.cgst_rate) : undefined,
            sgst_rate: x.sgst_rate != null ? String(x.sgst_rate) : undefined,
          })),
        );
        setTotalItems(Number(json.total));
      } else {
        const raw = json;
        const list: HsnItem[] = [];
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          for (const [code, v] of Object.entries(raw)) {
            const obj = (v as Record<string, unknown>) || {};
            const name = String(obj.name ?? obj.description ?? "").trim();
            list.push({
              code: String(code),
              description: name,
              name: name || undefined,
              type: obj.type != null ? String(obj.type) : undefined,
              tax_rate: obj.tax_rate != null ? String(obj.tax_rate) : undefined,
              cgst_rate:
                obj.cgst_rate != null ? String(obj.cgst_rate) : undefined,
              sgst_rate:
                obj.sgst_rate != null ? String(obj.sgst_rate) : undefined,
            });
          }
        }
        list.sort((a, b) => a.code.localeCompare(b.code));
        const start = (currentPage - 1) * rowsPerPage;
        setPageData(list.slice(start, start + rowsPerPage));
        setTotalItems(list.length);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) return;
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl, currentPage, rowsPerPage, searchDebounced, sortBy, sessionToken]);

  useEffect(() => {
    if (!sessionToken) return;
    fetchPage();
  }, [fetchPage, sessionToken]);

  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, totalItems);
  const currentData = pageData;

  const formatRate = (value: string | undefined): string => {
    if (value === undefined || value === "") return "—";
    const n = parseFloat(value);
    if (Number.isNaN(n)) return value;
    return n.toFixed(2);
  };

  const hasData = !isLoading && !fetchError && totalItems > 0;
  const hasSearch = searchDebounced.length > 0;

  if (userLoading) {
    return (
      <div className="min-h-[calc(100vh-70px)] bg-gray-50 flex items-center justify-center pt-24">
        <Loader2 className="animate-spin text-blue-500" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-70px)] bg-gray-50 flex flex-col pt-24">
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Tag className="text-blue-600" size={20} />
            </div>
            HSN Code Details With Tax Rates (w.e.f. 22-09-2025)
          </h1>

          {!isLoading && (
            <div className="flex flex-wrap items-center gap-3 md:gap-4 py-3 px-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by code or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-9 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  Sort by
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortByOption)}
                  className="h-10 px-3 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                >
                  <option value="code">HSN Code</option>
                  <option value="description">Name / Description</option>
                  <option value="type">Type</option>
                </select>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  Rows
                </span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="h-10 px-3 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {[25, 50, 100, 200].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-sm">
                {hasSearch ? (
                  <span className="text-gray-600">
                    <strong className="text-blue-600 font-semibold">
                      {totalItems.toLocaleString()}
                    </strong>{" "}
                    results found
                  </span>
                ) : (
                  <span className="text-gray-600">
                    <strong className="text-gray-800">
                      {totalItems > 0 ? totalItems.toLocaleString() : "0"}
                    </strong>{" "}
                    codes
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 py-4 flex flex-col">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-auto min-h-0 max-h-[63vh]">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-blue-500" size={36} />
                <p className="text-gray-500 text-sm">Loading HSN codes...</p>
              </div>
            ) : fetchError ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                  <Database className="text-red-400" size={28} />
                </div>
                <p className="text-gray-600 font-medium">Failed to load data</p>
                <button
                  onClick={fetchPage}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : currentData.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <Search className="text-gray-400" size={28} />
                </div>
                <p className="text-gray-600 font-medium">No results found</p>
                <p className="text-gray-400 text-sm">
                  Try a different search term
                </p>
              </div>
            ) : (
              <table className="w-full text-left min-w-[700px] border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[100px] md:w-[120px]">
                      HSN Code
                    </th>
                    <th className="px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                      Name / Description
                    </th>
                    <th className="px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[90px] hidden lg:table-cell">
                      Type
                    </th>
                    <th className="px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[70px] text-right hidden xl:table-cell whitespace-nowrap">
                      Tax %
                    </th>
                    <th className="px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[75px] text-right hidden xl:table-cell whitespace-nowrap">
                      CGST %
                    </th>
                    <th className="px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[75px] text-right hidden xl:table-cell whitespace-nowrap">
                      SGST %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentData.map((item, idx) => (
                    <tr
                      key={`${item.code}-${idx}`}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="px-4 md:px-6 py-3 text-sm">
                        <span className="font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {item.code || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm text-gray-700">
                        {item.description || item.name || "—"}
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm text-gray-600 hidden lg:table-cell">
                        {item.type || "—"}
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm text-gray-600 text-right hidden xl:table-cell tabular-nums">
                        {formatRate(item.tax_rate)}
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm text-gray-600 text-right hidden xl:table-cell tabular-nums">
                        {formatRate(item.cgst_rate)}
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm text-gray-600 text-right hidden xl:table-cell tabular-nums">
                        {formatRate(item.sgst_rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {hasData && (
            <div className="border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50 text-sm text-gray-600">
              <span>
                {totalItems > 0
                  ? `Showing ${startIndex}–${endIndex} of ${totalItems.toLocaleString()}${hasSearch ? " (filtered)" : ""}`
                  : "0 results"}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <ChevronsLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="px-3 py-1 font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Last page"
                  >
                    <ChevronsRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}
          {!hasData && !isLoading && !fetchError && totalItems === 0 && (
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 text-sm text-gray-500">
              No codes to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
