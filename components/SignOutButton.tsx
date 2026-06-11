import { signOut } from "@/app/auth/actions";

type Props = {
  email?: string;
};

export default function SignOutButton({ email }: Props) {
  return (
    <form action={signOut} className="flex items-center gap-2">
      {email && (
        <span className="hidden text-xs text-zinc-500 sm:inline">{email}</span>
      )}
      <button
        type="submit"
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/10"
      >
        Déconnexion
      </button>
    </form>
  );
}
