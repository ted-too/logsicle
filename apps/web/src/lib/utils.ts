import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const API_KEY_STORAGE_KEY = 'temp_api_key';

export const tempApiKeyStorage = {
  set: (apiKey: string) => {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  },
  get: () => {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  },
  remove: () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  },
};