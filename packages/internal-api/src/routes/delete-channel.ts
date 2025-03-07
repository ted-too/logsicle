import type { ErrorResponse, FnResponse, Opts } from "@/types";
import type { ChannelType } from "./create-channels";

// Generic delete channel function
export async function deleteChannel(
	projectId: string,
	channelId: string,
	type: ChannelType,
	{ baseURL, ...opts }: Opts,
): Promise<FnResponse<void>> {
	const res = await fetch(
		`${baseURL}/v1/projects/${projectId}/channels/${type}/${channelId}`,
		{
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			...opts,
		},
	);

	// For successful deletion (204 No Content), return early
	if (res.status === 204) {
		return { data: undefined, error: null };
	}

	let resJSON: unknown;
	try {
		resJSON = await res.json();
	} catch (error) {
		return {
			data: null,
			error: {
				message: "Failed to delete channel",
				error: "Failed to parse JSON response",
			},
		};
	}

	if (!res.ok) {
		return { data: null, error: resJSON as ErrorResponse };
	}

	return { data: undefined, error: null };
}

// Type-specific delete functions
export async function deleteEventChannel(
	projectId: string,
	channelId: string,
	opts: Opts,
): Promise<FnResponse<void>> {
	return deleteChannel(projectId, channelId, "event", opts);
}

export async function deleteAppLogChannel(
	projectId: string,
	channelId: string,
	opts: Opts,
): Promise<FnResponse<void>> {
	return deleteChannel(projectId, channelId, "app", opts);
}

export async function deleteRequestChannel(
	projectId: string,
	channelId: string,
	opts: Opts,
): Promise<FnResponse<void>> {
	return deleteChannel(projectId, channelId, "request", opts);
}

export async function deleteTraceChannel(
	projectId: string,
	channelId: string,
	opts: Opts,
): Promise<FnResponse<void>> {
	return deleteChannel(projectId, channelId, "trace", opts);
}
