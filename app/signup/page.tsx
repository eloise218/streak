import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { signUp } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-6">
      <header className="mb-8 text-center">
        <h1 className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Streak
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Créer un compte</p>
      </header>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <AuthForm mode="signup" action={signUp} />
      </div>

      <p className="mt-4 text-center text-sm text-zinc-500">
        Déjà inscrit ?{" "}
        <Link href="/login" className="text-zinc-200 underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
