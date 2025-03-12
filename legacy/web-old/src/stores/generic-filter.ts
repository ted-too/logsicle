import { atom } from "jotai";

export const totalResultsAtom = atom(0);
export const filteredResultsAtom = atom(0);
export const isFetchingAtom = atom(false);
export const searchAtom = atom("");

export const syncCountAtom = atom(
  null,
  (
    _get,
    set,
    {
      totalRowCount,
      totalFilteredRowCount,
    }: { totalRowCount: number; totalFilteredRowCount: number }
  ) => {
    set(totalResultsAtom, totalRowCount);
    set(filteredResultsAtom, totalFilteredRowCount);
  }
);
