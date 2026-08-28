interface FieldErrorsProps {
  errors?: string[];
}

export default function FieldErrors({ errors }: FieldErrorsProps) {
  if (!errors || errors.length === 0) return null;
  return (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {errors.join(' ')}
    </p>
  );
}
