import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/sign-in")({
  beforeLoad: () => {
    // TODO: Handle redirect in qp
    window.location.href = `${import.meta.env.PUBLIC_API_URL}/api/v1/auth/sign-in`;
  },
});
