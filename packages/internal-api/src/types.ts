export interface Opts extends RequestInit {
  baseURL: string;
}

export interface ErrorResponse {
  message: string;
  error: string;
}

export type FnResponse<T> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: ErrorResponse;
    };

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    totalRowCount: number;
    totalFilteredRowCount: number;
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
  };
};

// Organization role type
export type Role = 'owner' | 'admin' | 'member';

// Organization interface
export interface Organization {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  created_by: string;
  members?: TeamMembership[];
  projects?: any[];
}

// Team membership interface
export interface TeamMembership {
  id: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  invited_by: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  organization?: Organization;
}
