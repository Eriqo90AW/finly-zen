import { createSignal, Show, onMount } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { useAuth } from "../context/authContext";

export const Register = () => {
  const { signUpWithEmail, signInWithGoogle, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = createSignal(false);
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
        fullName().trim()
      );

      if (error) {
        setErrorMessage(error.message || "Failed to create account.");
      } else if (data?.user && !data?.session) {
        // Email confirmation is required by Supabase
        setIsEmailConfirmationPending(true);
      } else {
        // Direct session established
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleSubmitting(true);
    setErrorMessage(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(error.message || "Google signup failed.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Google signup failed.");
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div class="min-h-dvh bg-page-bg flex flex-col md:flex-row">
      {/* Left Editorial Panel */}
      <div class="hidden md:flex md:w-5/12 lg:w-1/2 bg-forest text-white p-8 lg:p-16 flex-col justify-between relative overflow-hidden">
        <div class="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
        <div class="absolute right-10 top-10 w-40 h-40 rounded-full bg-spring/10 pointer-events-none" />

        <div class="relative z-10">
          <A href="/" class="flex items-center gap-3 text-white group">
            <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <span class="material-icons text-2xl text-spring">eco</span>
            </div>
            <span class="text-2xl font-cormorant font-bold tracking-tight">
              Finly Zen
            </span>
          </A>
        </div>

        <div class="relative z-10 my-auto py-12">
          <span class="text-[10px] font-bold text-spring uppercase tracking-widest block mb-4">
            Plant Your Financial Roots
          </span>
          <h2 class="text-3xl lg:text-4xl font-cormorant font-bold leading-tight mb-6">
            "Order is the foundation of prosperity. Track mindfully, invest systematically."
          </h2>
          <p class="text-xs text-white/70 font-outfit max-w-md leading-relaxed">
            Create an account to track expenses, calculate IDX dividend timelines, and maintain a disciplined trading journal.
          </p>
        </div>

        <div class="relative z-10 text-xs text-white/50">
          Finly Zen • Light-Mode Financial Architecture
        </div>
      </div>

      {/* Right Form Panel */}
      <div class="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div class="w-full max-w-md bg-white rounded-3xl p-6 sm:p-10 border border-forest/10 shadow-2xl">
          {/* Mobile Logo */}
          <div class="md:hidden flex items-center gap-2.5 mb-6">
            <div class="w-8 h-8 bg-forest rounded-xl flex items-center justify-center text-white">
              <span class="material-icons text-lg">eco</span>
            </div>
            <span class="text-xl font-cormorant font-bold text-forest">Finly Zen</span>
          </div>

          <Show
            when={!isEmailConfirmationPending()}
            fallback={
              /* Email Confirmation State */
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

            {/* Google OAuth Button (Disabled / Coming Soon) */}
            <div class="relative mb-6">
              <button
                type="button"
                disabled={true}
                class="w-full flex items-center justify-center gap-3 bg-sage/30 border border-forest/10 text-forest/40 font-outfit font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-none cursor-not-allowed opacity-75"
              >
                <svg class="w-4 h-4 opacity-50 grayscale" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Sign Up with Google</span>
              </button>
              <span class="absolute -top-2.5 right-3 bg-ochre-dark text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                Coming Soon
              </span>
            </div>

            {/* Divider */}
            <div class="relative flex items-center justify-center mb-6">
              <div class="w-full border-t border-forest/10" />
              <span class="bg-white px-3 text-[10px] font-bold text-earth/60 uppercase tracking-widest absolute">
                Or with email
              </span>
            </div>

            {/* Registration Form */}
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
                disabled={isSubmitting() || isGoogleSubmitting()}
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

export default Register;
