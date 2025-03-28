import type { AppLog, PaginationMeta } from "@repo/api";
import type { RequestLog } from "@repo/api";
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

export interface Facets {
  [k: string]: {
    rows: {
      value: any;
      total: number;
    }[];
    total: number;
    min: number | undefined;
    max: number | undefined;
  };
}

// TODO: Move to server
export function getFacetsFromData(data: RequestLog[] | AppLog[]): Facets {
  const valuesMap = data.reduce((prev, curr) => {
    for (const [key, value] of Object.entries(curr)) {
      if (key === "level" || key === "region" || key === "latency") {
        // Convert array values (like regions) to string
        const _value = Array.isArray(value) ? value.toString() : value;
        const total = prev.get(key)?.get(_value) || 0;
        if (prev.has(key) && _value) {
          prev.get(key)?.set(_value, total + 1);
        } else if (_value) {
          prev.set(key, new Map([[_value, 1]]));
        }
      }
    }
    return prev;
  }, new Map<string, Map<any, number>>());

  const facets = Object.fromEntries(
    Array.from(valuesMap.entries()).map(([key, valueMap]) => {
      let min: number | undefined;
      let max: number | undefined;
      const rows = Array.from(valueMap.entries()).map(([value, total]) => {
        if (typeof value === "number") {
          if (!min) min = value;
          else min = value < min ? value : min;
          if (!max) max = value;
          else max = value > max ? value : max;
        }
        return {
          value,
          total,
        };
      });
      const total = Array.from(valueMap.values()).reduce((a, b) => a + b, 0);
      return [key, { rows, total, min, max }];
    })
  );

  return facets satisfies Record<string, FacetMetadataSchema>;
}

export function combineFacets(facets: Facets[]): Facets {
  // If no facets provided, return empty object
  if (!facets.length) return {};

  // Combine all facet keys
  const allKeys = new Set(facets.flatMap((f) => Object.keys(f)));

  return Array.from(allKeys).reduce((combined, key) => {
    const relevantFacets = facets.filter((f) => key in f).map((f) => f[key]);

    if (!relevantFacets.length) return combined;

    // Combine rows by merging value maps
    const valueMap = new Map<any, number>();
    let min: number | undefined;
    let max: number | undefined;

    for (const facet of relevantFacets) {
      for (const row of facet.rows) {
        const currentTotal = valueMap.get(row.value) || 0;
        valueMap.set(row.value, currentTotal + row.total);

        if (typeof row.value === "number") {
          if (!min || row.value < min) min = row.value;
          if (!max || row.value > max) max = row.value;
        }
      }
    }

    const rows = Array.from(valueMap.entries()).map(([value, total]) => ({
      value,
      total,
    }));

    const total = Array.from(valueMap.values()).reduce((a, b) => a + b, 0);

    combined[key] = {
      rows,
      total,
      min,
      max,
    };

    return combined;
  }, {} as Facets);
}

export type InfiniteQueryResponse<TData = AppLog[] | RequestLog[]> = {
  data: TData;
  meta: { pagination: PaginationMeta; facets: Facets };
};
