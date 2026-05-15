import { createSignal, createMemo, Show, For } from "solid-js";
import { portfolioState, createPortfolio, addTransactionToPortfolio, addCapitalToPortfolio, setActivePortfolioId, deletePortfolio, deleteAssetFromPortfolio } from "../store/portfolioStore";
import { PortfolioHero } from "../components/portfolio/PortfolioHero";
import { PortfolioCharts } from "../components/portfolio/PortfolioCharts";
import { PortfolioAssetsList } from "../components/portfolio/PortfolioAssetsList";
import { AssetDetailsSlideOver } from "../components/portfolio/AssetDetailsSlideOver";
import { PortfolioAsset, PortfolioTransactionType } from "../types";
import { formatPortfolioValue } from "../utils/format";
import AddIcon from "@suid/icons-material/Add";
import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";

const Portfolio = () => {
  const [selectedAsset, setSelectedAsset] = createSignal<PortfolioAsset | null>(null);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [showAddAssetModal, setShowAddAssetModal] = createSignal(false);
  const [showAddCapitalModal, setShowAddCapitalModal] = createSignal(false);
  
  // Create Portfolio Form State
  const [pName, setPName] = createSignal("");
  const [pCash, setPCash] = createSignal(0);

  // Add Asset Form State
  const [ticker, setTicker] = createSignal("");
  const [shares, setShares] = createSignal(0);
  const [price, setPrice] = createSignal(0);
  const [type, setType] = createSignal<PortfolioTransactionType>('BUY');

  // Add Capital State
  const [capitalAmount, setCapitalAmount] = createSignal(0);
  const [isAdjustment, setIsAdjustment] = createSignal(false);

  const activePortfolio = createMemo(() => {
    return portfolioState.portfolios.find(p => p.id === portfolioState.activePortfolioId) || null;
  });

  const currency = () => portfolioState.currencyView;

  const assetTransactions = createMemo(() => {
    const asset = selectedAsset();
    const portfolio = activePortfolio();
    if (!asset || !portfolio) return [];
    return portfolio.transactions.filter(t => t.ticker === asset.ticker);
  });

  const handleCreatePortfolio = (e: Event) => {
    e.preventDefault();
    if (pName() && pCash() >= 0) {
      createPortfolio(pName(), pCash());
      setShowCreateModal(false);
    }
  };

  const handleAddAsset = (e: Event) => {
    e.preventDefault();
    const portfolio = activePortfolio();
    if (portfolio && ticker() && shares() > 0 && price() > 0) {
      addTransactionToPortfolio(portfolio.id, {
        ticker: ticker().toUpperCase(),
        shares: shares(),
        pricePerShare: price(),
        totalAmount: shares() * price(),
        type: type(),
        date: new Date().toISOString()
      });
      setShowAddAssetModal(false);
      // Reset form
      setTicker("");
      setShares(0);
      setPrice(0);
    }
  };

  const handleAddCapital = (e: Event) => {
    e.preventDefault();
    const portfolio = activePortfolio();
    if (portfolio && capitalAmount() >= 0) {
      addCapitalToPortfolio(portfolio.id, capitalAmount(), isAdjustment());
      setShowAddCapitalModal(false);
      setCapitalAmount(0);
      setIsAdjustment(false);
    }
  };


  return (
    <div class="p-8 max-w-[1400px] mx-auto min-h-screen">
      <div class="flex justify-between items-center mb-10">
        <div class="flex items-center gap-4">
          <Show when={activePortfolio()}>
            <button 
              onClick={() => setActivePortfolioId(null)}
              class="w-10 h-10 rounded-xl hover:bg-forest/5 flex items-center justify-center text-forest transition-all border border-forest/10 cursor-pointer"
            >
              <ChevronLeftIcon />
            </button>
          </Show>
          <div>
            <h1 class="text-4xl font-cormorant text-forest font-bold tracking-tight mb-1">
              {activePortfolio() ? activePortfolio()?.name : 'My Portfolios'}
            </h1>
            <p class="text-earth font-outfit tracking-wide uppercase text-[10px] font-bold">
              {activePortfolio() ? 'Detailed Portfolio Breakdown' : 'Select or create a portfolio to begin'}
            </p>
          </div>
        </div>
        
        <div class="flex gap-4">
            <button 
             class="premium-card px-6 py-3 flex items-center gap-2 hover:bg-forest/5 transition-all text-forest font-outfit font-bold cursor-pointer"
             onClick={() => {
               if (activePortfolio()) {
                 setShowAddAssetModal(true);
               } else {
                 setPName("");
                 setPCash(0);
                 setShowCreateModal(true);
               }
             }}
            >
               <AddIcon class="text-xl" />
               <span>{activePortfolio() ? 'Add Assets' : 'Create Portfolio'}</span>
            </button>
        </div>
      </div>

      <Show 
        when={activePortfolio()} 
        fallback={
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <For each={portfolioState.portfolios} fallback={
              <div class="col-span-full flex flex-col items-center justify-center py-32 text-center">
                <div class="w-24 h-24 bg-sage/20 rounded-3xl flex items-center justify-center text-forest mb-8">
                  <span class="material-icons text-5xl">account_balance_wallet</span>
                </div>
                <h2 class="text-3xl font-cormorant text-forest mb-4">No Portfolios Yet</h2>
                <p class="text-earth font-outfit mb-10 max-w-md mx-auto">
                  Start your investment journey by creating your first portfolio. 
                </p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  class="bg-forest text-white px-10 py-4 rounded-2xl font-outfit font-bold shadow-xl hover:bg-forest/90 transition-all transform hover:-translate-y-1 cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            }>
              {(p) => (
                <div 
                  onClick={() => setActivePortfolioId(p.id)}
                  class="premium-card p-6 cursor-pointer hover:border-forest/30 transition-all group relative overflow-hidden"
                >
                  <div class="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span class="material-icons text-forest/20">arrow_forward</span>
                  </div>
                  <div class="w-12 h-12 bg-forest/5 rounded-2xl flex items-center justify-center text-forest mb-4 group-hover:bg-forest group-hover:text-white transition-all">
                    <span class="material-icons">pie_chart</span>
                  </div>
                  <h3 class="text-xl font-cormorant font-bold text-forest mb-4">{p.name}</h3>
                  <div class="space-y-3">
                    <div class="flex justify-between items-end">
                      <span class="text-[10px] uppercase tracking-widest text-earth font-bold">Total Value</span>
                      <span class="text-lg font-outfit font-bold text-forest">{formatPortfolioValue(p.totalValue, currency())}</span>
                    </div>
                    <div class="flex justify-between items-end">
                      <span class="text-[10px] uppercase tracking-widest text-earth font-bold">All-Time Gain</span>
                      <span class={`text-sm font-outfit font-bold ${p.allTimeGain >= 0 ? 'text-spring' : 'text-red-500'}`}>
                        {p.allTimeGain >= 0 ? '+' : ''}{formatPortfolioValue(p.allTimeGain, currency(), true)}
                      </span>
                    </div>
                  </div>
                  
                  <div class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete the portfolio "${p.name}"?`)) {
                          deletePortfolio(p.id);
                        }
                      }}
                      class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                      title="Delete Portfolio"
                    >
                      <span class="material-icons text-sm">delete</span>
                    </button>
                  </div>
                </div>
              )}
            </For>
            
            <Show when={portfolioState.portfolios.length > 0}>
              <button 
                onClick={() => setShowCreateModal(true)}
                class="premium-card p-6 border-dashed border-2 border-forest/10 flex flex-col items-center justify-center gap-3 hover:bg-forest/5 transition-all text-forest/40 hover:text-forest cursor-pointer"
              >
                <AddIcon class="text-3xl" />
                <span class="font-outfit font-bold">Add New Portfolio</span>
              </button>
            </Show>
          </div>
        }
      >
        {(portfolio) => (
          <>
            <PortfolioHero 
              portfolio={portfolio()} 
              onAddAsset={() => setShowAddAssetModal(true)} 
              onAddCapital={() => setShowAddCapitalModal(true)}
            />
            <PortfolioCharts portfolio={portfolio()} />
            <PortfolioAssetsList 
              assets={portfolio().assets} 
              onSelectAsset={(a) => setSelectedAsset(a)} 
              onAddAsset={() => setShowAddAssetModal(true)}
              onDeleteAsset={(assetId) => {
                if (confirm("Are you sure you want to delete this asset? All related transactions will be removed and cash will be adjusted.")) {
                  deleteAssetFromPortfolio(portfolio().id, assetId);
                }
              }}
            />
          </>
        )}
      </Show>

      {/* Detail SlideOver */}
      <AssetDetailsSlideOver 
        asset={selectedAsset()} 
        transactions={assetTransactions()} 
        isOpen={!!selectedAsset()} 
        onClose={() => setSelectedAsset(null)} 
        onDeleteAsset={(assetId) => {
          const portfolio = activePortfolio();
          if (portfolio && confirm("Are you sure you want to delete this asset? All related transactions will be removed and cash will be adjusted.")) {
            deleteAssetFromPortfolio(portfolio.id, assetId);
            setSelectedAsset(null);
          }
        }}
      />

      {/* Add Asset Modal */}
      <Show when={showAddAssetModal()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6" onClick={() => setShowAddAssetModal(false)}>
          <div class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div class="absolute top-0 left-0 w-full h-1 bg-spring"></div>
            <h3 class="text-2xl font-cormorant text-forest font-bold mb-6">Add Transaction</h3>
            <form onSubmit={handleAddAsset} class="space-y-4">
              <div class="flex bg-forest/5 p-1 rounded-xl mb-4">
                <button 
                  type="button"
                  class={`flex-1 py-2 rounded-lg font-outfit font-bold text-xs transition-all cursor-pointer ${type() === 'BUY' ? 'bg-white text-forest shadow-sm' : 'text-earth hover:text-forest'}`}
                  onClick={() => setType('BUY')}
                >BUY</button>
                <button 
                  type="button"
                  class={`flex-1 py-2 rounded-lg font-outfit font-bold text-xs transition-all cursor-pointer ${type() === 'SELL' ? 'bg-white text-red-600 shadow-sm' : 'text-earth hover:text-red-500'}`}
                  onClick={() => setType('SELL')}
                >SELL</button>
              </div>
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">Ticker Symbol</label>
                <input 
                  type="text" 
                  value={ticker()} 
                  onInput={(e) => setTicker(e.currentTarget.value)}
                  placeholder="e.g., AAPL"
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">Shares</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={shares()} 
                    onInput={(e) => setShares(Number(e.currentTarget.value))}
                    class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                    required
                  />
                </div>
                <div>
                  <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">Price per Share</label>
                  <input 
                    type="number" 
                    value={price()} 
                    onInput={(e) => setPrice(Number(e.currentTarget.value))}
                    class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                    required
                  />
                </div>
              </div>
              <div class="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddAssetModal(false)}
                  class="flex-1 px-6 py-3 rounded-xl font-outfit font-bold text-earth hover:bg-forest/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  class="flex-1 bg-forest text-white px-6 py-3 rounded-xl font-outfit font-bold shadow-lg hover:bg-forest/90 transition-all cursor-pointer"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* Create Portfolio Modal */}
      <Show when={showCreateModal()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6" onClick={() => setShowCreateModal(false)}>
          <div class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div class="absolute top-0 left-0 w-full h-1 bg-forest"></div>
            <h3 class="text-2xl font-cormorant text-forest font-bold mb-6">Create New Portfolio</h3>
            <form onSubmit={handleCreatePortfolio} class="space-y-6">
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">Portfolio Name</label>
                <input 
                  type="text" 
                  value={pName()} 
                  onInput={(e) => setPName(e.currentTarget.value)}
                  placeholder="e.g., Retirement Fund"
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
              </div>
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">Initial Cash (IDR)</label>
                <input 
                  type="number" 
                  value={pCash()} 
                  onInput={(e) => setPCash(Number(e.currentTarget.value))}
                  placeholder="0"
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
              </div>
              <div class="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  class="flex-1 px-6 py-3 rounded-xl font-outfit font-bold text-earth hover:bg-forest/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  class="flex-1 bg-forest text-white px-6 py-3 rounded-xl font-outfit font-bold shadow-lg hover:bg-forest/90 transition-all cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* Add Capital Modal */}
      <Show when={showAddCapitalModal()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6" onClick={() => setShowAddCapitalModal(false)}>
          <div class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div class="absolute top-0 left-0 w-full h-1 bg-spring"></div>
            <h3 class="text-2xl font-cormorant text-forest font-bold mb-6">Manage Capital</h3>
            <p class="text-earth text-sm mb-6">
              {isAdjustment() 
                ? "Set the total initial capital for this portfolio. This will not change your cash balance but will update your gain percentage."
                : "Add new funds to this portfolio. This increases both your cash balance and your capital basis."}
            </p>
            <form onSubmit={handleAddCapital} class="space-y-6">
              <div class="flex bg-forest/5 p-1 rounded-xl mb-4">
                <button 
                  type="button"
                  class={`flex-1 py-2 rounded-lg font-outfit font-bold text-xs transition-all cursor-pointer ${!isAdjustment() ? 'bg-white text-forest shadow-sm' : 'text-earth hover:text-forest'}`}
                  onClick={() => setIsAdjustment(false)}
                >ADD FUNDS</button>
                <button 
                  type="button"
                  class={`flex-1 py-2 rounded-lg font-outfit font-bold text-xs transition-all cursor-pointer ${isAdjustment() ? 'bg-white text-forest shadow-sm' : 'text-earth hover:text-forest'}`}
                  onClick={() => setIsAdjustment(true)}
                >ADJUST BASIS</button>
              </div>
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                  {isAdjustment() ? "Initial Capital Basis (IDR)" : "Amount to Add (IDR)"}
                </label>
                <input 
                  type="number" 
                  value={capitalAmount()} 
                  onInput={(e) => setCapitalAmount(Number(e.currentTarget.value))}
                  placeholder="0"
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
              </div>
              <div class="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddCapitalModal(false)}
                  class="flex-1 px-6 py-3 rounded-xl font-outfit font-bold text-earth hover:bg-forest/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  class="flex-1 bg-forest text-white px-6 py-3 rounded-xl font-outfit font-bold shadow-lg hover:bg-forest/90 transition-all cursor-pointer"
                >
                  Add Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default Portfolio;
