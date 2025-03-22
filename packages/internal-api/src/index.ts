import { createFetch, createSchema } from "@better-fetch/fetch";
import {
  addMemberSchema,
  createOrganizationSchema,
  createProjectSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
  updateUserSchema,
} from "./routes";

export * from "./types";
export * from "./routes";
export * from "./validations";

export const BASE_URL = import.meta.env.VITE_API_URL;
export const createClient = () =>
  createFetch({ baseURL: BASE_URL, credentials: "include" });

export const betterFetchSchema = createSchema({
  "@get/v1/me": {},
  "@patch/v1/me": {
    input: updateUserSchema,
  },
  "@post/v1/organizations": {
    input: createOrganizationSchema,
  },
  "@patch/v1/organizations/:id": {
    input: updateOrganizationSchema,
  },
  "@get/v1/organizations": {},
  "@get/v1/organizations/:id": {},
  "@delete/v1/organizations/:id": {},
  "@get/v1/organizations/:id/members": {},
  "@post/v1/organizations/:id/members": {
    input: addMemberSchema,
  },
  "@patch/v1/organizations/:id/members/:memberId": {
    input: updateMemberRoleSchema,
  },
  "@delete/v1/organizations/:id/members/:memberId": {},
  "@post/v1/projects": {
    input: createProjectSchema,
  },
  "@patch/v1/projects/:id": {
    input: createProjectSchema.partial(),
  },
  "@get/v1/projects": {},
  "@get/v1/projects/:id": {},
});
