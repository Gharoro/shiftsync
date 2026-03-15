function getInitials(fullName: string | undefined): string {
  if (!fullName?.trim()) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return fullName.slice(0, 2).toUpperCase();
}

interface UserAvatarProps {
  fullName: string | undefined;
  className?: string;
}

export function UserAvatar({ fullName, className = '' }: UserAvatarProps) {
  const initials = getInitials(fullName);
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-slate-600 text-white text-sm font-medium shrink-0 ${className}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}
