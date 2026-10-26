import { useT } from "@/i18n";
import React from "react";

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function getPaginationRange(currentPage: number, totalPages: number, siblingCount = 1): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "...", totalPages];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1);
    return [1, "...", ...rightRange];
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [1, "...", ...middleRange, "...", totalPages];
  }

  return Array.from({ length: totalPages }, (_, i) => i + 1);
}

export function PaginationControl({
  currentPage,
  totalPages,
  onPageChange,
  className = "pagination-controls",
}: PaginationControlProps) {
  const t = useT();
  if (totalPages <= 1) return null;

  const range = getPaginationRange(currentPage, totalPages);

  return (
    <div className={className} aria-label={t("Pagination")}>
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        {t("Previous")}
      </button>

      {range.map((item, idx) => {
        if (typeof item === "string") {
          return (
            <span key={`dots-${idx}`} className="pagination-ellipsis" aria-hidden="true">
              ...
            </span>
          );
        }
        return (
          <button
            key={item}
            type="button"
            className={currentPage === item ? "active" : ""}
            onClick={() => onPageChange(item)}
            aria-label={t("Page {number}", { number: item })}
            aria-current={currentPage === item ? "page" : undefined}
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        {t("Next")}
      </button>
    </div>
  );
}
