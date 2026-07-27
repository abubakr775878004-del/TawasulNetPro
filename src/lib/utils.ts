import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCY } from "@/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString("ar-YE")} ${CURRENCY}`;
};

export const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDateOnly = (iso: string): string => {
  return new Date(iso).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const getTodayDate = (): string => {
  return new Date().toISOString().substring(0, 10);
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

// Extract loan codes from PDF text (mock - filters phone numbers)
export const extractLoansFromText = (text: string): string[] => {
  const lines = text
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const phonePattern = /^[\+\s]?[0-9\s\-()]{9,15}$/;
  const extracted: string[] = [];

  for (const line of lines) {
    const cleaned = line.replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    if (phonePattern.test(cleaned.replace(/\s/g, ""))) continue;
    if (cleaned.length >= 6 && cleaned.length <= 50) {
      extracted.push(cleaned);
    }
  }

  return extracted;
};

export const PACKAGE_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  sky: { bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/30" },
  green: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  orange: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  pink: { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30" },
  yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
};
