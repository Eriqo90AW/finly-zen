import { useLocation, useParams } from "@solidjs/router";
import { createMemo, onMount, Show } from "solid-js";
import { loadPortfolios, portfolioState } from "../../../store/portfolioStore";
import { PortfolioOverview } from "../components/overview/PortfolioOverview";
import { PortfolioDetails } from "../components/PortfolioDetails";
import { TradeHistory } from "../components/trade-history/TradeHistory";

export const PortfolioPage = () => {
  const params = useParams();
  const location = useLocation();
  const activePortfolio = createMemo(() => {
    if (!params.id) return null;
    return portfolioState.portfolios.find((p) => p.id === params.id) || null;
  });

  onMount(async () => {
    await loadPortfolios();
  });

  return (
    <div class="max-w-[1400px] mx-auto min-h-screen">
      <Show when={params.id} fallback={<PortfolioOverview />}>
        <Show
          when={!portfolioState.isLoading}
          fallback={<PortfolioDetails portfolio={undefined} />}
        >
          <Show when={activePortfolio()} fallback={<PortfolioOverview />}>
            {(portfolio) => (
              <Show
                when={location.pathname.endsWith("/trades")}
                fallback={<PortfolioDetails portfolio={portfolio()} />}
              >
                <TradeHistory portfolio={portfolio()} />
              </Show>
            )}
          </Show>
        </Show>
      </Show>
    </div>
  );
};
