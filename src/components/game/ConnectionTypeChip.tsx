/** Category chip for mixed-connection modes (Harry Potter, Taylor Swift). */

type ConnectionTypeChipProps = {
  label: string;
  className?: string;
};

export function ConnectionTypeChip({
  label,
  className = "",
}: ConnectionTypeChipProps) {
  return (
    <span
      className={`inline-flex w-fit max-w-full items-center rounded-md border border-course/35 bg-course-soft px-2 py-0.5 text-[11px] font-semibold leading-snug tracking-wide text-course ${className}`}
    >
      {label}
    </span>
  );
}
