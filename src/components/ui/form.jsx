import * as React from "react";
import { Controller, FormProvider, useFormContext } from "react-hook-form";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Form = FormProvider;
const FormFieldContext = React.createContext({});
const FormItemContext = React.createContext({});

function FormField(props) {
  return <FormFieldContext.Provider value={{ name: props.name }}><Controller {...props} /></FormFieldContext.Provider>;
}

function useFormField() {
  const field = React.useContext(FormFieldContext);
  const item = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(field.name, formState);
  return {
    name: field.name,
    formItemId: `${item.id}-form-item`,
    formDescriptionId: `${item.id}-form-item-description`,
    formMessageId: `${item.id}-form-item-message`,
    ...fieldState
  };
}

function FormItem({ className, ...props }) {
  const id = React.useId();
  return <FormItemContext.Provider value={{ id }}><div className={cn("space-y-1.5", className)} {...props} /></FormItemContext.Provider>;
}

function FormLabel({ className, ...props }) {
  const { error, formItemId } = useFormField();
  return <Label htmlFor={formItemId} className={cn(error && "text-red-700", className)} {...props} />;
}

function FormControl(props) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return <Slot.Root id={formItemId} aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId} aria-invalid={Boolean(error)} {...props} />;
}

function FormDescription({ className, ...props }) {
  const { formDescriptionId } = useFormField();
  return <p id={formDescriptionId} className={cn("text-xs text-slate-600", className)} {...props} />;
}

function FormMessage({ className, children, ...props }) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message || "") : children;
  if (!body) return null;
  return <p id={formMessageId} role="alert" className={cn("text-sm font-medium text-red-700", className)} {...props}>{body}</p>;
}

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField };
