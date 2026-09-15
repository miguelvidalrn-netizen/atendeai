import { type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

type BaseProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

type InputProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & { as?: "input" };

type TextareaProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & { as: "textarea" };

export function Field(props: InputProps | TextareaProps) {
  const { label, name, error, hint, as = "input", ...rest } = props;

  const baseClasses =
    "w-full rounded-xl border border-line bg-paper-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-violet focus:outline-none";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
      </label>
      {as === "textarea" ? (
        <textarea
          id={name}
          name={name}
          className={`${baseClasses} min-h-24 resize-y`}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={name}
          name={name}
          className={baseClasses}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {hint && !error && <p className="text-xs text-ink-soft">{hint}</p>}
      {error && <p className="text-xs font-medium text-coral-dark">{error}</p>}
    </div>
  );
}
