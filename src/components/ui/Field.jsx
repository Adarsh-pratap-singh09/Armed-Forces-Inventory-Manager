/**
 * Field UI Component
 * Form control wrapper with consistent uppercase mono label, optional hint,
 * and error messaging for command console forms.
 */
export default function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className = '',
  children
}) {
  return (
    <div className={`console-form-field ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="field-label font-mono">
          <span>{label}</span>
          {required && <span className="field-required-star text-brick">*</span>}
        </label>
      )}
      <div className="field-control-wrap">{children}</div>
      {hint && !error && <span className="field-hint-text font-mono">{hint}</span>}
      {error && <span className="field-error-text font-mono text-brick">{error}</span>}
    </div>
  );
}
