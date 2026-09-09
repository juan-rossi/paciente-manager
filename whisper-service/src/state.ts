export type ServiceStatus = "starting" | "downloading_model" | "ok" | "error";

export const serviceState: { status: ServiceStatus; errorMessage: string | null } = {
  status: "starting",
  errorMessage: null,
};
