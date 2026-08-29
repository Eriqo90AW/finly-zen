import { ParentProps, Show, onMount, createSignal, createEffect } from "solid-js";
import MainLayout from "./components/layout/MainLayout";
import { state, setState, setupPersistence } from "./store";
import { setupPortfolioPersistence, loadPortfolios } from "./store/portfolioStore";
import { setupPriceAlertPersistence } from "./store/priceAlertStore";
import { setupIntelligencePersistence } from "./store/intelligenceStore";
import { fetchUsdRate } from "./data/portfolioData";
import { resolveUserId } from "./lib/userContext";
import { setUsdRateOnce } from "./utils/format";
import AddIcon from "@suid/icons-material/Add";
import { useLocation } from "@solidjs/router";
import { AuthProvider, useAuth } from "./context/authContext";
import { getAccounts } from "./data/expenseData";
import FirstTimeSetupModal from "./components/auth/FirstTimeSetupModal";

import {
  openCreateTransaction,
  initializeTransactions,
  setupTransactionListener,
} from "./store/transactionStore";

const AppContent = (props: ParentProps) => {
  setupPersistence();
  setupPortfolioPersistence();
  setupPriceAlertPersistence();
  setupIntelligencePersistence();

  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = createSignal(false);

  onMount(async () => {
    const rate = await fetchUsdRate();
    setUsdRateOnce(rate);
  });

  createEffect(() => {
    if (isAuthenticated() && !isLoading()) {
      initializeTransactions();
      setupTransactionListener();
    }
  });

  createEffect(() => {
    const u = user();
    if (u && !isLoading()) {
      checkUserAccounts(u.id);
    } else {
      setNeedsOnboarding(false);
    }
  });

  const checkUserAccounts = async (uid: string) => {
    try {
      const accs = await getAccounts();
      if (accs.length === 0) {
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(false);
      }
    } catch (e) {
      console.error("Failed to check user accounts:", e);
    }
  };

  const handleOnboardingComplete = async () => {
    setNeedsOnboarding(false);
    await resolveUserId();
    await loadPortfolios();
    await initializeTransactions(true);
  };

  const isPublicPage = () => {
    const p = location.pathname;
    if (p === "/login" || p === "/register") return true;
    if (p === "/" && !isAuthenticated()) return true;
    return false;
  };

  const shouldHideAddButton = () =>
    state.ui.insightsOpen ||
    location.pathname.startsWith("/stock") ||
    location.pathname.startsWith("/markets") ||
    location.pathname.startsWith("/portfolio") ||
    location.pathname.startsWith("/quick-portfolio") ||
    location.pathname.startsWith("/dividend") ||
    location.pathname.startsWith("/trading-journal");

  return (
    <div class="relative min-h-dvh bg-page-bg">
      <Show
        when={!isPublicPage()}
        fallback={
          <main class="min-h-dvh">
            {props.children}
          </main>
        }
      >
        <MainLayout>
          {props.children}
        </MainLayout>

        {/* First Time Onboarding Wizard */}
        <Show when={needsOnboarding() && user()}>
          <FirstTimeSetupModal
            userId={user()!.id}
            onComplete={handleOnboardingComplete}
          />
        </Show>

        {/* Global Add Button - Hidden on Stock / Management pages */}
        <Show when={!shouldHideAddButton()}>
          <button
            onClick={() => openCreateTransaction()}
            class="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 lg:bottom-10 lg:right-12 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-spring text-white rounded-full flex items-center justify-center shadow-2xl transition-all z-40 group cursor-pointer hover:bg-forest duration-300 active:scale-95"
            classList={{
              "right-4 sm:right-8 lg:right-10": !state.ui.insightsOpen,
            }}
            aria-label="Add transaction"
          >
            <AddIcon class="text-2xl lg:text-3xl group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </Show>
      </Show>
    </div>
  );
};

const App = (props: ParentProps) => {
  return (
    <AuthProvider>
      <AppContent>{props.children}</AppContent>
    </AuthProvider>
  );
};

export default App;
