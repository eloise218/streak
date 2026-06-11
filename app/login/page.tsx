import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { signIn } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ check_email?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { check_email } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-6">
      <header className="mb-8 text-center">
        <h1 className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Streak
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Connexion</p>
      </header>

      {check_email && (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Vérifie ta boîte mail pour confirmer ton compte.
        </p>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <AuthForm mode="signin" action={signIn} />
      </div>

      <p className="mt-4 text-center text-sm text-zinc-500">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="text-zinc-200 underline-offset-4 hover:underline">
          Créer un compte
        </Link>
      </p>
    </main>
  );
}
