import type { Table as TTable } from "@tanstack/react-table";

export function getFacetedUniqueValues<TData>(
  facets?: Record<string, FacetMetadataSchema>
) {
  return (_: TTable<TData>, columnId: string): Map<string, number> => {
    return new Map(
      facets?.[columnId]?.rows?.map(({ value, total }) => [value, total]) || []
    );
  };
}

export type FacetMetadataSchema = {
  total: number;
  rows: {
    total: number;
    value?: any;
  }[];
  max?: number | undefined;
  min?: number | undefined;
};

export function getFacetedMinMaxValues<TData>(
  facets?: Record<string, FacetMetadataSchema>
) {
  return (_: TTable<TData>, columnId: string): [number, number] | undefined => {
    const min = facets?.[columnId]?.min;
    const max = facets?.[columnId]?.max;
    if (min && max) return [min, max];
    if (min) return [min, min];
    if (max) return [max, max];
    return undefined;
  };
}
