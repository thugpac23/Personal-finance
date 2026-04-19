import Image from "next/image";

interface Props { userName: string; avatarUrl: string | null; currency: string; }

export function TopBar({ userName, avatarUrl, currency }: Props) {
  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <p className="text-sm text-gray-500">Currency: <span className="font-semibold text-gray-900">{currency}</span></p>
      <div className="flex items-center gap-3">
        {avatarUrl
          ? <Image src={avatarUrl} alt={userName} width={32} height={32} className="rounded-full" />
          : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{initials}</div>
        }
        <span className="text-sm font-medium text-gray-700">{userName}</span>
      </div>
    </header>
  );
}
