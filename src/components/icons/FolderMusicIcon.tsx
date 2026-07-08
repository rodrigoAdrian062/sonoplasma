interface FolderMusicIconProps {
  size?: number;
  className?: string;
}

// Pasta colorida com nota musical — usada para áudios baixados/locais
export function FolderMusicIcon({ size = 14, className }: FolderMusicIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#F4B400"
        d="M2 6a2 2 0 0 1 2-2h5.17a2 2 0 0 1 1.42.59L12 6h6a2 2 0 0 1 2 2v1H2V6z"
      />
      <path
        fill="#FBC02D"
        d="M2 8h20a1.5 1.5 0 0 1 1.48 1.76l-1.6 9A2 2 0 0 1 19.9 20.5H4.1a2 2 0 0 1-1.97-1.74l-1.6-9A1.5 1.5 0 0 1 2 8z"
      />
      <path
        fill="#5D4037"
        d="M15 11.2l-4 1v3.55a1.6 1.6 0 1 0 1 1.48V13.2l3-.75v2.35a1.6 1.6 0 1 0 1 1.48V11.2z"
      />
    </svg>
  );
}
