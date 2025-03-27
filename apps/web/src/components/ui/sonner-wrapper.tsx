import { type ExternalToast, toast as internalToast } from "sonner";

export const toast = {
	success: (text: string, data?: ExternalToast) =>
		internalToast.success(text, data),
	warning: (text: string, data?: ExternalToast) =>
		internalToast.warning(text, data),
	// APIError: (error: unknown) => {
	//   const title = (error as any)?.message
	//     ? (error as any)?.message
	//     : "Failed to create project";
	//   const message = (error as any)?.error
	//     ? (error as any)?.error
	//     : "Something went wrong!";
	//   internalToast.error(`${title} - ${message}`);
	// },
	APIError: (error: unknown, data?: ExternalToast) => {
		const title = (error as any)?.message
			? (error as any)?.message
			: "Failed to create project";
		const message = (error as any)?.error
			? (error as any)?.error
			: "Something went wrong!";
		internalToast.error(title, {
			description: message,
			...data,
		});
	},
};
