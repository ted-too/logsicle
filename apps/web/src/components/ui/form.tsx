"use client";

import { ActionButton, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroupItem,
  RadioGroup as RadioGroupRoot,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  type SelectTriggerProps,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import type { ZodError } from "zod";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

export interface BaseFieldProps {
  label: string;
  className?: {
    root?: string;
    label?: string;
    input?: string;
    message?: string;
  };
}

export function FormErrorMessage({
  errors,
  className,
}: {
  errors: ZodError[] | string[];
  className?: string;
}) {
  if (!errors.length) return null;

  return (
    <p
      data-slot="form-message"
      className={cn("text-destructive text-sm", className)}
    >
      {errors
        .map((error) => (typeof error === "string" ? error : error.message))
        .join(", ")}
    </p>
  );
}

export function TextField(props: BaseFieldProps & { type?: string }) {
  const { label, className = {}, type = "text" } = props;
  const field = useFieldContext<string>();
  return (
    <div className={cn("grid gap-2", className.root)}>
      <Label htmlFor={field.name} className={className.label}>
        {label}
      </Label>
      <Input
        id={field.name}
        type={type}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        className={cn("w-full", className.input)}
      />
      <FormErrorMessage
        errors={field.state.meta.errors}
        className={className.message}
      />
    </div>
  );
}

export function NumberField(props: BaseFieldProps) {
  const { label, className = {} } = props;
  const field = useFieldContext<number>();
  return (
    <div className={cn("grid gap-2", className.root)}>
      <Label htmlFor={field.name} className={className.label}>
        {label}
      </Label>
      <Input
        id={field.name}
        value={field.state.value}
        type="number"
        onChange={(e) => field.handleChange(Number(e.target.value))}
        className={cn("w-full", className.input)}
      />
      <FormErrorMessage
        errors={field.state.meta.errors}
        className={className.message}
      />
    </div>
  );
}

interface RadioGroupProps extends BaseFieldProps {
  options: { label: string; value: string }[];
  orientation?: "horizontal" | "horizontal-inline" | "vertical";
  className?: BaseFieldProps["className"] & {
    itemInput?: string;
    itemRoot?: string;
    itemLabel?: string;
  };
}

export function RadioGroup(props: RadioGroupProps) {
  const { label, className = {}, options, orientation = "horizontal" } = props;
  const field = useFieldContext<string>();
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        orientation === "horizontal-inline" && "flex-row",
        className.root
      )}
    >
      <Label htmlFor={field.name} className={className.label}>
        {label}
      </Label>
      <RadioGroupRoot
        id={field.name}
        className={cn(
          "flex gap-2",
          orientation === "vertical" && "flex-col",
          className.input
        )}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
      >
        {options.map((option) => (
          <div
            key={option.value}
            className={cn(
              "flex items-center gap-1.5 space-y-0",
              className.itemRoot
            )}
          >
            <RadioGroupItem
              id={`${field.name}-${option.value}`}
              type="button"
              value={option.value}
              className={cn(className.itemInput)}
            />
            <Label
              htmlFor={`${field.name}-${option.value}`}
              className={cn("font-light", className.itemLabel)}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroupRoot>
      <FormErrorMessage
        errors={field.state.meta.errors}
        className={className.message}
      />
    </div>
  );
}

type SelectFieldProps = BaseFieldProps & {
  options: { label: string; value: string }[];
  placeholder?: string;
  triggerProps?: SelectTriggerProps;
  contentProps?: {
    align?: "start" | "center" | "end";
  };
};

export function SelectField(props: SelectFieldProps) {
  const {
    label,
    className = {},
    options,
    placeholder,
    triggerProps,
    contentProps,
  } = props;
  const field = useFieldContext<string>();
  return (
    <div className={cn("grid gap-2", className.root)}>
      <Label htmlFor={field.name} className={className.label}>
        {label}
      </Label>
      <Select
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
      >
        <SelectTrigger className={className.input} {...triggerProps}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent {...contentProps}>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FormErrorMessage
        errors={field.state.meta.errors}
        className={className.message}
      />
    </div>
  );
}

// type DatePickerFieldProps = BaseFieldProps & {
// 	disabled?: (date: Date) => boolean;
// };

// export function DatePickerSingleField(props: DatePickerFieldProps) {
// 	const { label, className = {}, disabled } = props;
// 	const field = useFieldContext<Date | undefined>();
// 	return (
// 		<div className={cn("grid gap-2", className.root)}>
// 			<Label htmlFor={field.name} className={className.label}>
// 				{label}
// 			</Label>
// 			<DatePickerSingle
// 				date={field.state.value}
// 				onDateChange={(date) => field.handleChange(date)}
// 				disabled={disabled}
// 				className={className.input}
// 			/>
// 			<FormErrorMessage
// 				errors={field.state.meta.errors}
// 				className={className.message}
// 			/>
// 		</div>
// 	);
// }

// export function DatePickerRangeField(props: DatePickerFieldProps) {
// 	const { label, className = {}, disabled } = props;
// 	const field = useFieldContext<DateRange | undefined>();
// 	return (
// 		<div className={cn("grid gap-2", className.root)}>
// 			<Label htmlFor={field.name} className={className.label}>
// 				{label}
// 			</Label>
// 			<DatePickerWithRange
// 				date={field.state.value}
// 				onDateChange={(date) => field.handleChange(date)}
// 				disabled={disabled}
// 				className={className.input}
// 			/>
// 			<FormErrorMessage
// 				errors={field.state.meta.errors}
// 				className={className.message}
// 			/>
// 		</div>
// 	);
// }

export function SubmitButton(props?: ButtonProps) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit]}>
      {([isSubmitting, canSubmit]) => (
        <ActionButton
          type="submit"
          isLoading={isSubmitting}
          disabled={!canSubmit}
          variant="caribbean"
          {...props}
        />
      )}
    </form.Subscribe>
  );
}

// Allow us to bind components to the form to keep type safety but reduce production boilerplate
// Define this once to have a generator of consistent form instances throughout your app
export const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    NumberField,
    RadioGroup,
    SelectField,
    // DatePickerSingleField,
    // DatePickerRangeField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
});
