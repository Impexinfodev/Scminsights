"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Globe02Icon,
  Building02Icon,
  Loading03Icon,
  Cancel01Icon,
  LinkSquare01Icon,
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import axios from "axios";
import {
  validatePageSize,
  getRateLimiter,
  sanitizeSearchInput,
  validateHsCode,
  formatNumber,
} from "@/lib/api-security";
import { useUser } from "@/hooks/useUser";

interface Supplier {
  Name?: string;
  name?: string;
  Country?: string;
  country?: string;
  Frequency?: number;
  frequency?: number;
  TotalWeight?: number;
  totalWeight?: number;
  total_weight?: number;
  TotalQuantity?: number;
  totalQuantity?: number;
  total_quantity?: number;
  TotalPrice?: number;
  totalPrice?: number;
  total_price?: number;
}

interface HsCodeItem {
  code: string;
  description: string;
}

// Toast Component
function Toast({
  message,
  type,
  onClose
}: {
  message: string;
  type: "error" | "success" | "info" | "warning";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    error: "bg-red-50 border-red-200 text-red-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
  };

  const icons = {
    error: Cancel01Icon,
    success: CheckmarkCircle02Icon,
    info: AlertCircleIcon,
    warning: AlertCircleIcon,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 20 }}
      className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl border shadow-lg max-w-sm ${styles[type]}`}
    >
      <div className="flex items-center gap-3">
        <HugeiconsIcon icon={icons[type]} size={18} />
        <span className="text-sm font-medium flex-1">{message}</span>
        <button onClick={onClose} className="opacity-60 hover:opacity-100">
          <HugeiconsIcon icon={Cancel01Icon} size={14} />
        </button>
      </div>
    </motion.div>
  );
}

export default function BuyerPageClient() {
  const { sessionToken, isLoading: userLoading, isLoggedIn } = useUser({ redirectTo: "/login" });
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Country dropdown state
  const [countryData, setCountryData] = useState<string[]>([]);
  const [isCountryLoading, setIsCountryLoading] = useState(false);
  const [country, setCountry] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
  const countryRef = useRef<HTMLDivElement>(null);

  // HS Code dropdown state
  const [hsCodeData, setHsCodeData] = useState<HsCodeItem[]>([]);
  const [isHsCodeLoading, setIsHsCodeLoading] = useState(false);
  const [hsCode, setHsCode] = useState("");
  const [isHsCodeDropdownOpen, setIsHsCodeDropdownOpen] = useState(false);
  const [filteredHsCodes, setFilteredHsCodes] = useState<HsCodeItem[]>([]);
  const hsCodeRef = useRef<HTMLDivElement>(null);

  // Year filter (trade API)
  const [year, setYear] = useState<number | "">("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isYearsLoading, setIsYearsLoading] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearRef = useRef<HTMLDivElement>(null);

  // Sort By dropdown state — values match /api/trade/top sort_by
  const [sortBy, setSortBy] = useState("total_price");
  const [isSortByDropdownOpen, setIsSortByDropdownOpen] = useState(false);
  const sortByRef = useRef<HTMLDivElement>(null);
  const sortByOptions = [
    { value: "total_price", label: "Total Value" },
    { value: "frequency", label: "Frequency" },
    { value: "total_quantity", label: "Quantity" },
    { value: "total_weight", label: "Weight" },
    { value: "total_container_quantity", label: "Containers" },
    { value: "percentage", label: "Share %" },
  ];

  // Pagination
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" | "warning" } | null>(null);

  const pageSizeOptions = [10, 20, 30, 50];

  // Handle page navigation (totalPages from API meta)
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || isLoading) return;
    fetchSuppliers(newPage, pageSize);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
      if (hsCodeRef.current && !hsCodeRef.current.contains(event.target as Node)) {
        setIsHsCodeDropdownOpen(false);
      }
      if (sortByRef.current && !sortByRef.current.contains(event.target as Node)) {
        setIsSortByDropdownOpen(false);
      }
      if (yearRef.current && !yearRef.current.contains(event.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch countries and HS codes on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!sessionToken) return;

      const config = { headers: { "Session-Token": sessionToken } };

      // Fetch Countries
      setIsCountryLoading(true);
      try {
        const response = await axios.get(`${BACKEND_URL}/supplier-countries`, config);
        const countries = Array.isArray(response.data) ? response.data.filter(Boolean).sort() : [];
        setCountryData(countries);
        setFilteredCountries(countries);
      } catch (error) {
        console.error("Error fetching countries:", error);
      } finally {
        setIsCountryLoading(false);
      }

      // Fetch HS Codes
      setIsHsCodeLoading(true);
      try {
        const response = await axios.get(`${BACKEND_URL}/hscodes-descriptions`, config);
        let data = response.data;
        let parsedCodes: HsCodeItem[] = [];

        if (typeof data === "object" && !Array.isArray(data)) {
          if (Array.isArray(data.data)) data = data.data;
          else if (Array.isArray(data.codes)) data = data.codes;
          else {
            // API shape: { "007123": { "name": "MUSHROOMS...", ... } }
            parsedCodes = Object.entries(data).map(([key, value]) => {
              let description = "";
              if (value !== null && typeof value === "object" && "name" in value && typeof (value as { name?: string }).name === "string") {
                description = (value as { name: string }).name;
              } else {
                description = typeof value === "string" ? value : "";
              }
              return { code: key, description };
            });
          }
        }

        if (Array.isArray(data)) {
          parsedCodes = data
            .map((item: any) => {
              if (typeof item === "string" || typeof item === "number") {
                return { code: String(item), description: "" };
              }
              if (!item) return null;
              const code = item.code || item.hsn_code || item.hscode || item.hs_code || item.HSCode || item.hsn || item.id;
              const desc = item.description || item.desc || item.Description || item.name || "";
              return code ? { code: String(code), description: String(desc) } : null;
            })
            .filter((item): item is HsCodeItem => item !== null);
        }

        setHsCodeData(parsedCodes);
        setFilteredHsCodes(parsedCodes.slice(0, 100));
      } catch (error) {
        console.error("Error fetching HS codes:", error);
      } finally {
        setIsHsCodeLoading(false);
      }
    };

    if (!userLoading) {
      fetchInitialData();
    }
  }, [sessionToken, userLoading, BACKEND_URL]);

  // Handle session errors
  const handleSessionError = (error: unknown) => {
    const axiosError = error as { response?: { data?: { code?: string; error?: string }; status?: number } };
    if (
      axiosError.response?.status === 401 ||
      axiosError.response?.data?.code === "SESSION_EXPIRED" ||
      axiosError.response?.data?.code === "SESSION_ABSENT"
    ) {
      setToast({ message: "Session expired. Please login again.", type: "error" });
      setTimeout(() => router.push("/login"), 1500);
    } else {
      setToast({ message: axiosError.response?.data?.error || "An error occurred. Please try again.", type: "error" });
    }
  };

  // Ref to skip setState when effect has re-run or unmounted (avoids AbortController which can throw in some runtimes)
  const yearsCancelledRef = useRef(false);

  const fetchAvailableYears = useCallback(
    async (cancelledRef: React.MutableRefObject<boolean>) => {
      const code = validateHsCode(hsCode);
      if (code.length < 2) {
        setAvailableYears([]);
        return;
      }
      if (!BACKEND_URL) return;
      const url = `${BACKEND_URL}/api/trade/years?${new URLSearchParams({ trade_type: "importer", hs_code: code })}`;
      setIsYearsLoading(true);
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (cancelledRef.current) return;
        if (!res.ok) throw new Error(json?.error || "Failed to load years");
        setAvailableYears(Array.isArray(json?.data) ? json.data : []);
      } catch (e) {
        if (cancelledRef.current) return;
        setAvailableYears([]);
        setToast({ message: "Could not load years. Check HS code and try again.", type: "warning" });
      } finally {
        if (!cancelledRef.current) setIsYearsLoading(false);
      }
    },
    [hsCode, BACKEND_URL]
  );

  useEffect(() => {
    const code = validateHsCode(hsCode);
    if (code.length < 2) {
      setAvailableYears([]);
      return;
    }
    yearsCancelledRef.current = false;
    fetchAvailableYears(yearsCancelledRef);
    return () => {
      yearsCancelledRef.current = true;
    };
  }, [hsCode, fetchAvailableYears]);

  // Fetch top buyers from trade API (GET /api/trade/top)
  const fetchSuppliers = async (newPageIndex: number, newPageSize = pageSize) => {
    if (!sessionToken) {
      setToast({ message: "Please login to search buyers", type: "info" });
      router.push("/login");
      return;
    }

    const validatedHsCode = validateHsCode(hsCode);
    if (validatedHsCode.length < 2) {
      setToast({ message: "Enter a valid HS code (2–10 digits)", type: "warning" });
      return;
    }

    const rateLimiter = getRateLimiter();
    if (!rateLimiter.canMakeRequest()) {
      const waitTime = Math.ceil(rateLimiter.getTimeUntilReset() / 1000);
      setToast({ message: `Too many requests. Please wait ${waitTime} seconds.`, type: "warning" });
      return;
    }

    setIsLoading(true);
    try {
      const validatedPageSize = Math.min(validatePageSize(newPageSize, 50), 100);
      const params = new URLSearchParams({
        trade_type: "importer",
        hs_code: validatedHsCode,
        sort_by: sortBy,
        sort_order: "desc",
        page: String(newPageIndex),
        page_size: String(validatedPageSize),
      });
      if (country.trim()) params.set("country", sanitizeSearchInput(country.trim()));
      if (year !== "") params.set("year", String(year));

      const res = await fetch(`${BACKEND_URL}/api/trade/top?${params}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Search failed");
      }

      const list = Array.isArray(json?.data) ? json.data : [];
      setSuppliers(
        list.map((row: { enterprise?: string; data_country?: string; frequency?: number; total_price?: number; total_quantity?: number; total_weight?: number }) => ({
          Name: row.enterprise ?? "",
          Country: row.data_country ?? "",
          Frequency: row.frequency ?? 0,
          TotalPrice: row.total_price ?? 0,
          TotalQuantity: row.total_quantity ?? 0,
          TotalWeight: row.total_weight ?? 0,
        }))
      );
      const meta = json?.meta ?? {};
      setTotalResults(meta.total_items ?? 0);
      setTotalPages(meta.total_pages ?? 0);
      setHasNext(!!meta.has_next);
      setHasPrev(!!meta.has_prev);
      setPageIndex(newPageIndex);
      setPageSize(validatedPageSize);
    } catch (e) {
      setSuppliers([]);
      setTotalResults(0);
      setTotalPages(0);
      setHasNext(false);
      setHasPrev(false);
      setToast({ message: (e as Error).message || "Failed to load buyers", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSuppliers(1);
  };

  // Handle country input change
  const handleCountryChange = (value: string) => {
    setCountry(value);
    const sanitized = sanitizeSearchInput(value).toLowerCase();
    if (sanitized) {
      setFilteredCountries(countryData.filter((c) => c.toLowerCase().includes(sanitized)));
    } else {
      setFilteredCountries(countryData);
    }
    setIsCountryDropdownOpen(true);
  };

  // Handle HS Code input change
  const handleHsCodeChange = (value: string) => {
    setHsCode(value);
    const sanitized = sanitizeSearchInput(value).toLowerCase();
    if (sanitized) {
      setFilteredHsCodes(
        hsCodeData
          .filter((item) => item.code.toLowerCase().includes(sanitized) || item.description.toLowerCase().includes(sanitized))
          .slice(0, 100)
      );
    } else {
      setFilteredHsCodes(hsCodeData.slice(0, 100));
    }
    setIsHsCodeDropdownOpen(true);
  };

  // Handle row click
  const handleRowClick = (supplier: Supplier) => {
    const name = supplier.Name || supplier.name || "";
    const countryName = supplier.Country || supplier.country || "";
    const searchQuery = `${name} ${countryName} company buyer importer`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, "_blank");
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    const validated = validatePageSize(newSize, 50);
    setPageSize(validated);
    setPageIndex(1);
    fetchSuppliers(1, validated);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-linear-to-b from-blue-50/50 to-white border-b border-gray-100 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Search Buyers</h1>
            <p className="text-gray-600">Find verified importers by country and HS code with real-time data</p>
          </motion.div>
        </div>
      </div>

      {/* Search Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.form
          ref={formRef}
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 1. HS Code (first so years can load while user fills rest) */}
            <div className="relative" ref={hsCodeRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">HS Code</label>
              <div className="relative">
                <input
                  type="text"
                  value={hsCode}
                  onChange={(e) => handleHsCodeChange(e.target.value)}
                  onFocus={() => setIsHsCodeDropdownOpen(true)}
                  placeholder={isHsCodeLoading ? "Loading..." : "Enter HS code"}
                  autoComplete="off"
                  className="w-full h-11 px-4 pr-10 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setIsHsCodeDropdownOpen(!isHsCodeDropdownOpen)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <HugeiconsIcon icon={ArrowDown01Icon} size={16} className={`transition-transform ${isHsCodeDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isHsCodeDropdownOpen && filteredHsCodes.length > 0 && (
                    <motion.ul
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto mt-1"
                    >
                      {filteredHsCodes.slice(0, 50).map((item, index) => (
                        <li
                          key={index}
                          onClick={() => {
                            setHsCode(item.code);
                            setIsHsCodeDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-sm transition-colors border-b border-gray-50 last:border-0 ${hsCode === item.code ? "bg-blue-50" : ""
                            }`}
                        >
                          <span className="font-medium text-blue-600">{item.code}</span>
                          {item.description && (
                            <span className="text-gray-500 ml-2 text-xs">- {item.description.length > 50 ? `${item.description.substring(0, 50)}...` : item.description}</span>
                          )}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 2. Country */}
            <div className="relative" ref={countryRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
                  <HugeiconsIcon icon={Globe02Icon} size={16} />
                </div>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  onFocus={() => setIsCountryDropdownOpen(true)}
                  placeholder={isCountryLoading ? "Loading..." : "Select country"}
                  autoComplete="off"
                  className="w-full h-11 pl-10 pr-10 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <HugeiconsIcon icon={ArrowDown01Icon} size={16} className={`transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isCountryDropdownOpen && filteredCountries.length > 0 && (
                    <motion.ul
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto mt-1"
                    >
                      {filteredCountries.slice(0, 50).map((c, index) => (
                        <li
                          key={index}
                          onClick={() => {
                            setCountry(c);
                            setIsCountryDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-sm text-gray-700 transition-colors ${country === c ? "bg-blue-50 text-blue-600 font-medium" : ""
                            }`}
                        >
                          {c}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 3. Sort By */}
            <div className="relative" ref={sortByRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSortByDropdownOpen(!isSortByDropdownOpen)}
                  className="w-full h-11 px-4 pr-10 text-sm text-left bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                >
                  {sortByOptions.find(opt => opt.value === sortBy)?.label || "Select"}
                </button>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <HugeiconsIcon icon={ArrowDown01Icon} size={16} className={`transition-transform ${isSortByDropdownOpen ? "rotate-180" : ""}`} />
                </div>

                <AnimatePresence>
                  {isSortByDropdownOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 mt-1 overflow-hidden"
                    >
                      {sortByOptions.map((option) => (
                        <li
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setIsSortByDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-sm text-gray-700 transition-colors ${sortBy === option.value ? "bg-blue-50 text-blue-600 font-medium" : ""
                            }`}
                        >
                          {option.label}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 4. Year (custom dropdown; years load when HS code has 2+ digits) */}
            <div className="relative" ref={yearRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                  className="w-full h-11 px-4 pr-10 text-sm text-left bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer flex items-center justify-between"
                >
                  <span className={!year && !isYearsLoading ? "text-gray-500" : ""}>
                    {isYearsLoading ? "Loading years..." : year === "" ? "All years" : String(year)}
                  </span>
                  <HugeiconsIcon icon={ArrowDown01Icon} size={16} className={`text-gray-400 shrink-0 ml-2 transition-transform ${isYearDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isYearDropdownOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 mt-1 overflow-hidden max-h-56 overflow-y-auto"
                    >
                      <li
                        onClick={() => { setYear(""); setIsYearDropdownOpen(false); }}
                        className="px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-sm text-gray-700 border-b border-gray-100"
                      >
                        All years
                      </li>
                      {validateHsCode(hsCode).length < 2 && (
                        <li className="px-4 py-2.5 text-sm text-gray-400 italic">
                          Enter HS code (2+ digits) to load years
                        </li>
                      )}
                      {!isYearsLoading && availableYears.map((y) => (
                        <li
                          key={y}
                          onClick={() => { setYear(y); setIsYearDropdownOpen(false); }}
                          className={`px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-sm ${year === y ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"}`}
                        >
                          {y}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 5. Search Button */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isLoading || userLoading}
                className="btn-primary w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={Search01Icon} size={16} />
                    Search Buyers
                  </>
                )}
              </button>
            </div>
          </div>

          {/* HS Code description and years loading hint */}
          {hsCode && (() => {
            const selected = hsCodeData.find((item) => item.code === hsCode.trim());
            return selected?.description ? (
              <div className="mt-3 w-full text-xs text-gray-600 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                <span className="font-medium text-blue-600">{selected.code}</span>
                <span className="ml-1.5">– {selected.description}</span>
              </div>
            ) : null;
          })()}
          {isYearsLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin text-blue-500" />
              <span>Loading available years for this HS code…</span>
            </div>
          )}
        </motion.form>

        {/* Results Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card overflow-hidden"
        >
          {/* Results Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-gray-50">
            <span className="text-gray-600 text-sm">
              <span className="font-semibold text-gray-900">{totalResults.toLocaleString()}</span> buyers found
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="text-sm bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto max-h-[55vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600 w-16">#</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Country</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Frequency</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Weight</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Qty</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Value</th>
                  <th className="px-5 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && pageIndex === 1 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <HugeiconsIcon icon={Loading03Icon} size={32} className="mx-auto mb-3 text-blue-500 animate-spin" />
                      <p className="text-gray-500">Searching for buyers...</p>
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <HugeiconsIcon icon={Building02Icon} size={40} className="mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 mb-1">No buyers found</p>
                      <p className="text-gray-400 text-xs">Try adjusting your search filters</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {suppliers.map((supplier, index) => (
                      <tr
                        key={`${supplier.Name || supplier.name}-${index}`}
                        onClick={() => handleRowClick(supplier)}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3.5 text-gray-500">{((pageIndex - 1) * pageSize) + index + 1}</td>
                        <td className="px-5 py-3.5 font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {supplier.Name || supplier.name || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">{supplier.Country || supplier.country || "—"}</td>
                        <td className="px-5 py-3.5 text-gray-600">
                          {formatNumber(supplier.Frequency ?? supplier.frequency)}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">
                          {formatNumber(supplier.TotalWeight ?? supplier.totalWeight ?? supplier.total_weight)}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">
                          {formatNumber(supplier.TotalQuantity ?? supplier.totalQuantity ?? supplier.total_quantity)}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-gray-900">
                          {formatNumber(supplier.TotalPrice ?? supplier.totalPrice ?? supplier.total_price)}
                        </td>
                        <td className="px-5 py-3.5">
                          <HugeiconsIcon icon={LinkSquare01Icon} size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!isLoading && suppliers.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-gray-50">
              <span className="text-sm text-gray-600">
                Showing {((pageIndex - 1) * pageSize) + 1} - {Math.min(pageIndex * pageSize, totalResults)} of {totalResults.toLocaleString()} buyers
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={pageIndex === 1 || isLoading}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(pageIndex - 1)}
                  disabled={pageIndex === 1 || isLoading}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-blue-50 border border-blue-200 rounded-lg">
                  Page {pageIndex} of {totalPages || 1}
                </span>
                <button
                  onClick={() => handlePageChange(pageIndex + 1)}
                  disabled={(totalPages ? pageIndex >= totalPages : true) || isLoading}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={(totalPages ? pageIndex >= totalPages : true) || isLoading}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
