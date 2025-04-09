import { useFieldContext } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { allowedOriginSchema } from "@repo/api";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function AllowedOrigins() {
	const field = useFieldContext<string[]>();
	const [parent] = useAutoAnimate();

	return (
		<div className="col-span-2">
			<label
				htmlFor={field.name}
				className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
			>
				Allowed origins
			</label>
			<div className="relative mt-2" aria-required>
				<Input
					className="pe-11"
					placeholder="https://example.com or *"
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();

							// If value already contains "*", prevent adding other origins
							if (field.state.value?.includes("*")) {
								toast.warning(
									"Cannot add specific origins when all origins (*) is selected",
								);
								return;
							}

							const input = e.currentTarget.value.trim();

							const validationResult = allowedOriginSchema.safeParse(input);
							if (validationResult.success) {
								if (validationResult.data === "*") {
									field.handleChange(["*"]);
									e.currentTarget.value = "";
									return;
								}

								const parsedURL = new URL(validationResult.data);
								parsedURL.pathname = "";
								parsedURL.search = "";
								const parsedURLString = parsedURL.toString().replace(/\/$/, "");
								// Add to array if it's not already included
								if (!field.state.value?.includes(parsedURLString)) {
									field.handleChange([
										...(field.state.value || []),
										parsedURLString,
									]);
								}
								// Clear the input
								e.currentTarget.value = "";
							} else {
								field.setErrorMap({
									onChange: {
										allowed_origins:
											"Please enter a valid URL or use * to allow all origins",
									},
								});
							}
						}
					}}
				/>
				<div className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-2 text-muted-foreground">
					<kbd className="inline-flex h-5 max-h-full items-center rounded border border-border px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
						Enter
					</kbd>
				</div>
			</div>
			<div
				ref={parent}
				className={cn(
					"flex flex-wrap gap-3 mt-2",
					field.state.value?.length === 0 && "hidden",
				)}
			>
				{(field.state.value ?? []).map((origin, i) => (
					<div
						key={`allowed-origin-${i}`}
						className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-mono tracking-tight"
					>
						<span className="whitespace-nowrap">
							{origin === "*" ? "all origins [*]" : origin}
						</span>
						<Button
							variant="link"
							onClick={() => {
								field.handleChange(
									field.state.value?.filter((_, index) => index !== i) || [],
								);
							}}
							className="size-max p-0 [&_svg]:size-3"
							size="icon"
						>
							<XIcon />
						</Button>
					</div>
				))}
			</div>
			<p className="text-muted-foreground text-sm mt-2">
				Where your logs will be sent from (use * to allow all origins)
			</p>
			{field.state.meta.errors && (
				<p className="text-destructive text-sm mt-1">
					{field.state.meta.errors.join(", ")}
				</p>
			)}
		</div>
	);
}
