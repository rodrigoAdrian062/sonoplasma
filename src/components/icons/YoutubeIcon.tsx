interface YoutubeIconProps {
  size?: number;
  className?: string;
}

export function YoutubeIcon({ size = 14, className }: YoutubeIconProps) {
  return (
    <svg
      width={size}
      height={size * (24 / 34)}
      viewBox="0 0 34 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#FF0000"
        d="M33.28 3.75c-.39-1.47-1.54-2.62-3-3.01C27.63 0 17 0 17 0S6.37 0 3.72.74c-1.46.39-2.61 1.54-3 3.01C0 6.4 0 12 0 12s0 5.6.72 8.25c.39 1.47 1.54 2.62 3 3.01C6.37 24 17 24 17 24s10.63 0 13.28-.74c1.46-.39 2.61-1.54 3-3.01C34 17.6 34 12 34 12s0-5.6-.72-8.25z"
      />
      <path fill="#FFFFFF" d="M13.6 17.14V6.86L22.5 12l-8.9 5.14z" />
    </svg>
  );
}
