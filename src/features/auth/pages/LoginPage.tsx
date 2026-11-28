import { createSignal, Show, onMount } from "solid-js";
import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { useAuth } from "../../../context/authContext";
import { AuthEditorialPanel, GoogleComingSoonButton } from "../components/AuthEditorialPanel";
import { getAuthErrorMessage } from "../utils/authError";

export const LoginPage = () => {
  const { signInWithEmail, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  onMount(() => {
    if (!isLoading() && isAuthenticated()) {
      const redirect = (searchParams.redirectTo as string) || "/";
      navigate(redirect, { replace: true });
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!email() || !password()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await signInWithEmail(email().trim(), password());
      if (error) {
        setErrorMessage(error.message || "Failed to sign in. Please verify your credentials.");
      } else {
        const redirect = (searchParams.redirectTo as string) || "/";
        navigate(redirect, { replace: true });
      }
    } catch (err: unknown) {
      setErrorMessage(getAuthErrorMessage(err, "An unexpected error occurred."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="min-h-dvh bg-page-bg flex flex-col md:flex-row">
      <AuthEditorialPanel
        eyebrow="Master Gardener Mindset"
        quote='"A disciplined trader and a mindful spender creates a garden that flourishes through every market season."'
        description="Gain total peace of mind over Indonesian equities, cash flow pacing, and multi-asset investments."
      />

      <div class="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div class="w-full max-w-md bg-white rounded-3xl p-6 sm:p-10 border border-forest/10 shadow-2xl">
          <div class="md:hidden flex items-center gap-2.5 mb-6">
            <div class="w-8 h-8 bg-forest rounded-xl flex items-center justify-center text-white">
              <span class="material-icons text-lg">eco</span>
            </div>
            <span class="text-xl font-cormorant font-bold text-forest">Finly Zen</span>
          </div>

          <div class="mb-8">
            <h1 class="text-2xl sm:text-3xl font-cormorant font-bold text-forest leading-tight">
              Welcome Back
            </h1>
            <p class="text-xs sm:text-sm text-earth mt-1 font-outfit">
              Enter your credentials to access your financial sanctuary.
            </p>
          </div>

          <Show when={errorMessage()}>
            <div class="mb-6 p-3.5 bg-terracotta/10 border border-terracotta/20 rounded-xl text-terracotta text-xs flex items-center gap-2">
              <span class="material-icons text-base shrink-0">error_outline</span>
              <span>{errorMessage()}</span>
            </div>
          </Show>

          <GoogleComingSoonButton label="Continue with Google" />

          <div class="relative flex items-center justify-center mb-6">
            <div class="w-full border-t border-forest/10" />
            <span class="bg-white px-3 text-[10px] font-bold text-earth/60 uppercase tracking-widest absolute">
              Or with email
            </span>
          </div>

          <form onSubmit={handleSubmit} class="space-y-4">
            <div>
              <label class="block text-xs font-bold font-outfit text-forest uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                class="w-full bg-sage/20 border border-forest/10 rounded-xl px-4 py-3 font-outfit text-sm text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all placeholder:text-forest/30"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-xs font-bold font-outfit text-forest uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div class="relative">
                <input
                  type={showPassword() ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  class="w-full bg-sage/20 border border-forest/10 rounded-xl pl-4 pr-11 py-3 font-outfit text-sm text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all placeholder:text-forest/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword())}
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-forest/50 hover:text-forest transition-colors p-1"
                >
                  <span class="material-icons text-lg">
                    {showPassword() ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting()}
              class="w-full flex items-center justify-center gap-2 bg-forest hover:bg-forest/90 text-white font-outfit font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99] mt-6"
            >
              <Show when={isSubmitting()}>
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </Show>
              <span>{isSubmitting() ? "Signing in..." : "Sign In"}</span>
            </button>
          </form>

          <div class="text-center mt-6 pt-6 border-t border-forest/10">
            <p class="text-xs text-earth font-outfit">
              Don't have an account yet?{" "}
              <A href="/register" class="font-bold text-forest hover:underline">
                Create one now
              </A>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
