import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/sign-out")({
  beforeLoad: () => {
    window.location.href = `${import.meta.env.PUBLIC_API_URL}/v1/auth/sign-out`;
  },
});
