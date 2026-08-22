import { A } from "@solidjs/router";
import { createSignal } from "solid-js";
import { useAuth } from "../context/authContext";

export const Landing = () => {
  const { isAuthenticated } = useAuth();
  const [currencyPreview, setCurrencyPreview] = createSignal<"IDR" | "USD">("IDR");

  return (
    <div class="min-h-screen bg-page-bg text-near-black flex flex-col selection:bg-spring/30">
      {/* Top Navigation */}
      <header class="h-20 bg-white/80 backdrop-blur-md border-b border-forest/10 sticky top-0 z-40 px-6 lg:px-16 flex items-center justify-between transition-all">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-forest rounded-xl flex items-center justify-center text-white shadow-sm">
            <span class="material-icons text-2xl">eco</span>
          </div>
          <span class="text-2xl font-cormorant font-bold text-forest tracking-tight">
            Finly Zen
          </span>
        </div>

        <nav class="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-earth">
          <a href="#features" class="hover:text-forest transition-colors">Features</a>
          <a href="#dividends" class="hover:text-forest transition-colors">IDX Dividends</a>
          <a href="#journal" class="hover:text-forest transition-colors">Trading Journal</a>
          <a href="#philosophy" class="hover:text-forest transition-colors">Philosophy</a>
        </nav>

        <div class="flex items-center gap-4">
          {isAuthenticated() ? (
            <A
              href="/dashboard"
              class="flex items-center gap-2 bg-forest hover:bg-forest/90 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
            >
              <span>Go to App</span>
              <span class="material-icons text-base">arrow_forward</span>
            </A>
          ) : (
            <>
              <A
                href="/login"
                class="text-xs font-bold text-forest hover:text-forest/80 px-4 py-2.5 rounded-xl hover:bg-sage/40 transition-colors"
              >
                Sign In
              </A>
              <A
                href="/register"
                class="bg-forest hover:bg-forest/90 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                Get Started
              </A>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section class="relative px-6 lg:px-16 pt-16 pb-24 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sage border border-forest/10 text-forest text-[11px] font-bold uppercase tracking-widest mb-8 animate-fade-in">
          <span class="w-2 h-2 rounded-full bg-spring animate-pulse" />
          Personal Wealth & IDX Equity Intelligence
        </div>

        <h1 class="text-4xl sm:text-6xl lg:text-7xl font-cormorant font-bold text-forest max-w-4xl tracking-tight leading-[1.08] mb-6">
          A Zen Garden for Your Wealth & Cash Flow.
        </h1>

        <p class="text-base sm:text-lg text-earth/90 max-w-2xl font-outfit font-normal leading-relaxed mb-10">
          Unify everyday expense tracking with deep Indonesian Stock Exchange (IDX) dividends, portfolio valuations, and day trading journals in an ultra-clean, light-mode desktop experience.
        </p>

        <div class="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <A
            href="/register"
            class="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-forest hover:bg-forest/90 text-white font-bold text-sm px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all cursor-pointer active:scale-95"
          >
            <span>Start Your Financial Garden</span>
            <span class="material-icons text-lg">arrow_forward</span>
          </A>
          <A
            href="/login"
            class="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-sage/30 text-forest border border-forest/15 font-bold text-sm px-7 py-4 rounded-xl transition-all shadow-sm"
          >
            <span>Explore Demo Account</span>
          </A>
        </div>

        {/* Hero Preview Card */}
        <div class="w-full max-w-5xl rounded-3xl bg-white border border-forest/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left">
          {/* Mock Top bar */}
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-forest/10 pb-5">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-terracotta/60" />
              <div class="w-3 h-3 rounded-full bg-ochre/60" />
              <div class="w-3 h-3 rounded-full bg-spring" />
              <span class="text-xs font-mono text-earth/60 ml-2">finly-zen.app/dashboard</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-xs text-earth font-medium">Currency View:</span>
              <div class="bg-sage/40 p-0.5 rounded-lg flex border border-forest/5">
                <button
                  type="button"
                  onClick={() => setCurrencyPreview("IDR")}
                  class={`px-2.5 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                    currencyPreview() === "IDR" ? "bg-forest text-white" : "text-forest/70"
                  }`}
                >
                  IDR
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyPreview("USD")}
                  class={`px-2.5 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                    currencyPreview() === "USD" ? "bg-forest text-white" : "text-forest/70"
                  }`}
                >
                  USD
                </button>
              </div>
            </div>
          </div>

          {/* Mock Hero Content Grid */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            {/* Metric 1 */}
            <div class="p-5 rounded-2xl bg-sage/20 border border-forest/5 flex flex-col justify-between">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-widest text-earth/80">
                  Total Liquid Wealth
                </span>
                <div class="text-3xl font-cormorant font-bold text-forest mt-1">
                  {currencyPreview() === "IDR" ? "Rp 248.500.000" : "$15,245.40"}
                </div>
              </div>
              <div class="flex items-center gap-2 mt-4 text-xs font-semibold text-forest">
                <span class="w-2 h-2 rounded-full bg-spring" />
                <span>+4.8% vs last month</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div class="p-5 rounded-2xl bg-sage/20 border border-forest/5 flex flex-col justify-between">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-widest text-earth/80">
                  Upcoming IDX Dividends
                </span>
                <div class="text-3xl font-cormorant font-bold text-forest mt-1">
                  {currencyPreview() === "IDR" ? "Rp 12.450.000" : "$763.80"}
                </div>
              </div>
              <div class="flex items-center gap-2 mt-4 text-xs font-semibold text-earth">
                <span class="bg-forest text-white text-[9px] px-1.5 py-0.5 rounded font-bold">BBCA</span>
                <span>Cum-date in 4 days</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div class="p-5 rounded-2xl bg-sage/20 border border-forest/5 flex flex-col justify-between">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-widest text-earth/80">
                  Monthly Budget Pacing
                </span>
                <div class="text-3xl font-cormorant font-bold text-forest mt-1">
                  42% Spent
                </div>
              </div>
              <div class="w-full bg-forest/10 h-2 rounded-full mt-4 overflow-hidden">
                <div class="bg-forest h-full w-[42%] rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars Section */}
      <section id="features" class="py-20 px-6 lg:px-16 max-w-7xl mx-auto w-full">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <span class="text-[10px] font-bold text-earth uppercase tracking-widest">
            Three Balanced Pillars
          </span>
          <h2 class="text-3xl sm:text-5xl font-cormorant font-bold text-forest mt-2">
            Everything You Need, Nothing You Don't.
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <div class="bg-white rounded-3xl p-8 border border-forest/10 shadow-lg flex flex-col justify-between hover:shadow-xl transition-shadow">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-sage flex items-center justify-center text-forest mb-6">
                <span class="material-icons text-2xl">account_balance_wallet</span>
              </div>
              <h3 class="text-2xl font-cormorant font-bold text-forest mb-3">
                Cash Flow & Expense Tracking
              </h3>
              <p class="text-sm text-earth leading-relaxed font-outfit">
                Categorize daily expenses, track budgets with pacing forecasts, and manage seamless inter-account transfers between bank and cash accounts.
              </p>
            </div>
            <div class="mt-8 pt-6 border-t border-forest/10 flex items-center gap-2 text-xs font-bold text-forest">
              <span class="material-icons text-sm">check</span>
              <span>Visual monthly budget pacing</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div id="dividends" class="bg-white rounded-3xl p-8 border border-forest/10 shadow-lg flex flex-col justify-between hover:shadow-xl transition-shadow">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-sage flex items-center justify-center text-forest mb-6">
                <span class="material-icons text-2xl">calendar_month</span>
              </div>
              <h3 class="text-2xl font-cormorant font-bold text-forest mb-3">
                IDX Dividend Intelligence
              </h3>
              <p class="text-sm text-earth leading-relaxed font-outfit">
                Stay ahead of Indonesian Stock Exchange corporate actions. Interactive dividend calendar, yield forecasts, and automatic payout tracking.
              </p>
            </div>
            <div class="mt-8 pt-6 border-t border-forest/10 flex items-center gap-2 text-xs font-bold text-forest">
              <span class="material-icons text-sm">check</span>
              <span>Authentic 2025-2026 IDX data</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div id="journal" class="bg-white rounded-3xl p-8 border border-forest/10 shadow-lg flex flex-col justify-between hover:shadow-xl transition-shadow">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-sage flex items-center justify-center text-forest mb-6">
                <span class="material-icons text-2xl">insights</span>
              </div>
              <h3 class="text-2xl font-cormorant font-bold text-forest mb-3">
                Portfolios & Trading Journal
              </h3>
              <p class="text-sm text-earth leading-relaxed font-outfit">
                Log day trades with planned R:R, bandarmology notes, psychology checklists, and track multi-asset portfolios in both IDR and USD.
              </p>
            </div>
            <div class="mt-8 pt-6 border-t border-forest/10 flex items-center gap-2 text-xs font-bold text-forest">
              <span class="material-icons text-sm">check</span>
              <span>Disciplined win-rate analytics</span>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section id="philosophy" class="py-20 bg-sage/40 border-y border-forest/10 px-6 lg:px-16">
        <div class="max-w-4xl mx-auto text-center flex flex-col items-center">
          <div class="w-12 h-12 rounded-2xl bg-forest flex items-center justify-center text-white mb-6">
            <span class="material-icons text-2xl">nature_people</span>
          </div>
          <span class="text-[10px] font-bold text-earth uppercase tracking-widest">
            The Zen Philosophy
          </span>
          <h2 class="text-3xl sm:text-5xl font-cormorant font-bold text-forest mt-3 mb-6">
            Finance without Anxiety.
          </h2>
          <p class="text-base sm:text-lg text-earth leading-relaxed font-outfit max-w-2xl mb-8">
            Most financial apps shout with flashy notifications, dark mode neon charts, and cognitive overload. Finly Zen is designed like a calm garden: light-mode only, soothing greens, and editorial typography that honors your focus.
          </p>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full pt-6 border-t border-forest/10">
            <div>
              <div class="text-2xl font-cormorant font-bold text-forest">Light Mode</div>
              <div class="text-xs text-earth mt-1">Calm & clear</div>
            </div>
            <div>
              <div class="text-2xl font-cormorant font-bold text-forest">IDR & USD</div>
              <div class="text-xs text-earth mt-1">Dual currencies</div>
            </div>
            <div>
              <div class="text-2xl font-cormorant font-bold text-forest">100% Private</div>
              <div class="text-xs text-earth mt-1">Supabase security</div>
            </div>
            <div>
              <div class="text-2xl font-cormorant font-bold text-forest">Zero Ads</div>
              <div class="text-xs text-earth mt-1">Focused experience</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section class="py-24 px-6 lg:px-16 max-w-5xl mx-auto text-center">
        <div class="bg-forest text-white rounded-3xl p-10 sm:p-16 relative overflow-hidden shadow-2xl">
          <div class="relative z-10 flex flex-col items-center">
            <span class="text-[10px] font-bold text-spring uppercase tracking-widest mb-3">
              Begin Today
            </span>
            <h2 class="text-3xl sm:text-5xl font-cormorant font-bold max-w-xl leading-tight mb-6">
              Cultivate Peace in Your Personal Finances.
            </h2>
            <p class="text-sm sm:text-base text-white/80 max-w-lg mb-8 font-outfit">
              Join retail investors and finance managers who organize their money with quiet clarity.
            </p>
            <A
              href="/register"
              class="bg-spring hover:bg-spring/90 text-forest font-bold text-sm px-8 py-4 rounded-xl shadow-xl transition-all active:scale-95"
            >
              Create Your Free Account
            </A>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer class="mt-auto border-t border-forest/10 bg-white py-8 px-6 lg:px-16 text-center sm:text-left">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2 text-forest">
            <span class="material-icons text-lg">eco</span>
            <span class="font-cormorant font-bold text-lg">Finly Zen</span>
            <span class="text-xs text-earth ml-2">© 2026. All rights reserved.</span>
          </div>

          <div class="flex items-center gap-6 text-xs text-earth font-medium">
            <A href="/login" class="hover:text-forest">Sign In</A>
            <A href="/register" class="hover:text-forest">Register</A>
            <a href="#philosophy" class="hover:text-forest">Design Principles</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
