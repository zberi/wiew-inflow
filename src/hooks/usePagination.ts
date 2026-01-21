import { useState, useCallback, useMemo } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationReturn<T> {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  paginatedData: T[];
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

export function usePagination<T>(
  data: T[] | undefined,
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { initialPage = 1, initialPageSize = 20 } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = data?.length ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Reset to page 1 if current page is out of bounds
  const safePage = useMemo(() => {
    if (page > totalPages && totalPages > 0) {
      return totalPages;
    }
    return page;
  }, [page, totalPages]);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedData = useMemo(() => {
    if (!data) return [];
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  const handleSetPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages || 1)));
  }, [totalPages]);

  const handleSetPageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  }, []);

  return {
    page: safePage,
    pageSize,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
    paginatedData,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
  };
}
