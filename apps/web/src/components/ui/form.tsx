"use client";

import { ActionButton, Button, type ButtonProps } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  type SelectPrimitiveProps,
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
  description?: string;
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

export function TextField(
  props: BaseFieldProps & {
    type?: string;
    placeholder?: string;
    required?: boolean;
  }
) {
  const {
    label,
    className = {},
    type = "text",
    placeholder,
    description,
    required,
  } = props;
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
        placeholder={placeholder}
        required={required}
      />
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <FormErrorMessage
        errors={field.state.meta.errors}
        className={className.message}
      />
    </div>
  );
}

export function NumberField(
  props: BaseFieldProps & { placeholder?: string; required?: boolean }
) {
  const { label, className = {}, placeholder, required, description } = props;
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
        placeholder={placeholder}
        required={required}
      />
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
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
  primitiveProps?: SelectPrimitiveProps;
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
    primitiveProps,
    description,
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
        {...primitiveProps}
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
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <FormErrorMessage
        errors={field.state.meta.errors}
        className={className.message}
      />
    </div>
  );
}

interface MultipleCheckboxFieldProps extends BaseFieldProps {
  options: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
  selectAllLabel?: string;
}

export function MultipleCheckboxField(props: MultipleCheckboxFieldProps) {
  const { label, className = {}, options, selectAllLabel, description } = props;
  const field = useFieldContext<string[]>();

  return (
    <div className={cn("grid gap-2", className.root)}>
      <div className="flex items-center gap-4">
        <Label htmlFor={field.name} className={className.label}>
          {label}
        </Label>
        {selectAllLabel && (
          <Button
            type="button"
            variant="link"
            className="h-max p-0 text-xs"
            onClick={() => field.handleChange(options.map((opt) => opt.value))}
          >
            {selectAllLabel}
          </Button>
        )}
      </div>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <div className="flex flex-col gap-4">
        {options.map((option) => (
          <div
            key={option.value}
            className="flex flex-row items-center space-x-3 space-y-0"
          >
            <Checkbox
              id={`${field.name}-${option.value}`}
              checked={field.state.value?.includes(option.value)}
              onCheckedChange={(checked) => {
                if (checked) {
                  field.handleChange([
                    ...(field.state.value || []),
                    option.value,
                  ]);
                } else {
                  field.handleChange(
                    field.state.value?.filter(
                      (value) => value !== option.value
                    ) || []
                  );
                }
              }}
              className={cn("mt-1 rounded-lg", className.input)}
            />
            <Label
              htmlFor={`${field.name}-${option.value}`}
              className={cn("text-sm font-normal", className.label)}
            >
              {option.label}
            </Label>
            {option.description && (
              <p className="text-sm text-muted-foreground">
                {option.description}
              </p>
            )}
          </div>
        ))}
      </div>
      <FormErrorMessage
        errors={field.state.meta.errors}
        className={className.message}
      />
    </div>
  );
}

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
    MultipleCheckboxField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
});
