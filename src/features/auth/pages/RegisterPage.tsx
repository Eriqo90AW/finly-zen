import { createSignal, Show, onMount } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { useAuth } from "../../../context/authContext";
import { AuthEditorialPanel, GoogleComingSoonButton } from "../components/AuthEditorialPanel";
import { getAuthErrorMessage } from "../utils/authError";

export const RegisterPage = () => {
  const { signUpWithEmail, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [isEmailConfirmationPending, setIsEmailConfirmationPending] = createSignal(false);

  onMount(() => {
    if (!isLoading() && isAuthenticated()) {
      navigate("/", { replace: true });
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!email() || !password()) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    if (password().length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password() !== confirmPassword()) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { data, error } = await signUpWithEmail(
        email().trim(),
        password(),
        fullName().trim(),
      );

      if (error) {
        setErrorMessage(error.message || "Failed to create account.");
      } else if (data?.user && !data?.session) {
        setIsEmailConfirmationPending(true);
      } else {
        navigate("/", { replace: true });
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
        eyebrow="Plant Your Financial Roots"
        quote='"Order is the foundation of prosperity. Track mindfully, invest systematically."'
        description="Create an account to track expenses, calculate IDX dividend timelines, and maintain a disciplined trading journal."
      />

      <div class="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div class="w-full max-w-md bg-white rounded-3xl p-6 sm:p-10 border border-forest/10 shadow-2xl">
          <div class="md:hidden flex items-center gap-2.5 mb-6">
            <div class="w-8 h-8 bg-forest rounded-xl flex items-center justify-center text-white">
              <span class="material-icons text-lg">eco</span>
            </div>
            <span class="text-xl font-cormorant font-bold text-forest">Finly Zen</span>
          </div>

          <Show
            when={!isEmailConfirmationPending()}
            fallback={
              <div class="text-center py-6 flex flex-col items-center">
                <div class="w-16 h-16 rounded-2xl bg-sage flex items-center justify-center text-forest mb-6 shadow-sm">
                  <span class="material-icons text-3xl text-forest">mark_email_read</span>
                </div>
                <h2 class="text-2xl font-cormorant font-bold text-forest mb-3">
                  Verification Link Sent
                </h2>
                <p class="text-xs sm:text-sm text-earth leading-relaxed font-outfit mb-8 max-w-xs">
                  We sent a confirmation link to <strong class="text-forest">{email()}</strong>. Please check your inbox to activate your account.
                </p>
                <A
                  href="/login"
                  class="w-full flex items-center justify-center bg-forest hover:bg-forest/90 text-white font-outfit font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-95"
                >
                  Return to Sign In
                </A>
              </div>
            }
          >
            <div class="mb-8">
              <h1 class="text-2xl sm:text-3xl font-cormorant font-bold text-forest leading-tight">
                Create Account
              </h1>
              <p class="text-xs sm:text-sm text-earth mt-1 font-outfit">
                Start your journey towards calm and disciplined wealth management.
              </p>
            </div>

            <Show when={errorMessage()}>
              <div class="mb-6 p-3.5 bg-terracotta/10 border border-terracotta/20 rounded-xl text-terracotta text-xs flex items-center gap-2">
                <span class="material-icons text-base shrink-0">error_outline</span>
                <span>{errorMessage()}</span>
              </div>
            </Show>

            <GoogleComingSoonButton label="Sign Up with Google" />

            <div class="relative flex items-center justify-center mb-6">
              <div class="w-full border-t border-forest/10" />
              <span class="bg-white px-3 text-[10px] font-bold text-earth/60 uppercase tracking-widest absolute">
                Or with email
              </span>
            </div>

            <form onSubmit={handleSubmit} class="space-y-3.5">
              <div>
                <label class="block text-xs font-bold font-outfit text-forest uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Master Gardener"
                  value={fullName()}
                  onInput={(e) => setFullName(e.currentTarget.value)}
                  class="w-full bg-sage/20 border border-forest/10 rounded-xl px-4 py-2.5 font-outfit text-sm text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all placeholder:text-forest/30"
                />
              </div>

              <div>
                <label class="block text-xs font-bold font-outfit text-forest uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email()}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  class="w-full bg-sage/20 border border-forest/10 rounded-xl px-4 py-2.5 font-outfit text-sm text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all placeholder:text-forest/30"
                />
              </div>

              <div>
                <label class="block text-xs font-bold font-outfit text-forest uppercase tracking-wider mb-1">
                  Password
                </label>
                <div class="relative">
                  <input
                    type={showPassword() ? "text" : "password"}
                    required
                    placeholder="Min. 6 characters"
                    value={password()}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                    class="w-full bg-sage/20 border border-forest/10 rounded-xl pl-4 pr-11 py-2.5 font-outfit text-sm text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all placeholder:text-forest/30"
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

              <div>
                <label class="block text-xs font-bold font-outfit text-forest uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword()}
                  onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                  class="w-full bg-sage/20 border border-forest/10 rounded-xl px-4 py-2.5 font-outfit text-sm text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all placeholder:text-forest/30"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting()}
                class="w-full flex items-center justify-center gap-2 bg-forest hover:bg-forest/90 text-white font-outfit font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99] mt-6"
              >
                <Show when={isSubmitting()}>
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </Show>
                <span>{isSubmitting() ? "Creating Account..." : "Create Account"}</span>
              </button>
            </form>

            <div class="text-center mt-6 pt-6 border-t border-forest/10">
              <p class="text-xs text-earth font-outfit">
                Already have an account?{" "}
                <A href="/login" class="font-bold text-forest hover:underline">
                  Sign in
                </A>
              </p>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
