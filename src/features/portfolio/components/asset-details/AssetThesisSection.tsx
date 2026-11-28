import { createEffect, createSignal, Show } from "solid-js";
import { getAssetThesis, updateAssetThesis } from "../../../../data/portfolioData";

interface AssetThesisSectionProps {
  isOpen: boolean;
  portfolioId: string;
  ticker: string;
}

export const AssetThesisSection = (props: AssetThesisSectionProps) => {
  const [thesisNotes, setThesisNotes] = createSignal("");
  const [notesLastUpdated, setNotesLastUpdated] = createSignal<string | null>(
    null,
  );
  const [loadingNotes, setLoadingNotes] = createSignal(false);
  const [savingNotes, setSavingNotes] = createSignal(false);
  const [activeTxId, setActiveTxId] = createSignal<string | null>(null);
  const [saveStatus, setSaveStatus] = createSignal<string | null>(null);
  const [notesExpanded, setNotesExpanded] = createSignal(false);

  createEffect(() => {
    if (props.isOpen && props.ticker && props.portfolioId) {
      setLoadingNotes(true);
      setSaveStatus(null);
      getAssetThesis(props.portfolioId, props.ticker)
        .then((data) => {
          if (data) {
            setThesisNotes(data.notes || "");
            setNotesLastUpdated(data.updated_at);
            setActiveTxId(data.id);
            setNotesExpanded(Boolean(data.notes?.trim()));
          } else {
            setThesisNotes("");
            setNotesLastUpdated(null);
            setActiveTxId(null);
            setNotesExpanded(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load thesis notes:", err);
        })
        .finally(() => {
          setLoadingNotes(false);
        });
    }
  });

  const handleSaveNotes = async () => {
    const txId = activeTxId();
    if (!txId || !props.ticker) return;
    setSavingNotes(true);
    setSaveStatus(null);
    try {
      await updateAssetThesis(txId, thesisNotes());

      const freshData = await getAssetThesis(props.portfolioId, props.ticker);
      if (freshData) {
        setThesisNotes(freshData.notes || "");
        setNotesLastUpdated(freshData.updated_at);
        setActiveTxId(freshData.id);
      } else {
        setNotesLastUpdated(new Date().toISOString());
      }

      setSaveStatus("Saved ✓");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error("Failed to save thesis notes:", err);
      setSaveStatus("Error!");
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div class="p-6 border-b border-forest/5">
      <div
        onClick={() => setNotesExpanded(!notesExpanded())}
        class="flex items-center justify-between cursor-pointer hover:bg-sage/5 p-2 -m-2 rounded-xl transition-colors select-none"
      >
        <div class="flex items-center gap-1.5">
          <span class="material-icons !text-[16px] text-earth">edit</span>
          <h4 class="font-outfit font-bold text-forest text-xs uppercase tracking-widest">
            Investment Thesis / Notes
          </h4>
        </div>
        <div class="flex items-center gap-2">
          <Show when={saveStatus()}>
            <span
              class={`text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full ${
                saveStatus() === "Saved ✓"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {saveStatus()}
            </span>
          </Show>
          <span
            class="material-icons text-earth transition-transform duration-300 transform"
            style={{
              transform: notesExpanded() ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            expand_more
          </span>
        </div>
      </div>

      {/* Truncated Notes Preview */}
      <Show when={!notesExpanded() && thesisNotes().trim()}>
        <p class="text-xs text-earth/60 italic truncate mt-3 pl-5 border-l-2 border-forest/10">
          {thesisNotes()}
        </p>
      </Show>

      {/* Expandable Notes Editor Content */}
      <div
        class={`grid transition-all duration-300 ease-in-out ${
          notesExpanded()
            ? "grid-rows-[1fr] opacity-100 mt-4"
            : "grid-rows-[0fr] opacity-0 overflow-hidden"
        }`}
      >
        <div class="overflow-hidden space-y-3">
          <Show
            when={!loadingNotes()}
            fallback={
              <div class="h-32 rounded-2xl bg-sage/5 animate-pulse flex items-center justify-center">
                <p class="text-xs text-earth/50 font-outfit italic">
                  Loading notes...
                </p>
              </div>
            }
          >
            <textarea
              value={thesisNotes()}
              onInput={(e) => setThesisNotes(e.currentTarget.value)}
              placeholder={
                activeTxId()
                  ? "Write your thesis or notes on why you are holding this asset..."
                  : "No transactions found to save notes onto."
              }
              disabled={!activeTxId()}
              class="w-full h-32 p-4 border border-forest/10 rounded-2xl font-outfit text-sm text-forest placeholder-earth/40 focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest bg-sage/5/30 hover:bg-sage/5/50 transition-colors disabled:opacity-50 resize-none"
            />

            <div class="flex items-center justify-between">
              <div class="text-[10px] text-earth/60 font-outfit">
                <Show when={notesLastUpdated()}>
                  {(updated) => (
                    <span>
                      Last updated:{" "}
                      {new Date(updated()).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </Show>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveNotes();
                }}
                disabled={!activeTxId() || savingNotes()}
                class="flex items-center gap-1.5 px-4 py-2 bg-forest text-white rounded-xl text-xs font-outfit font-bold hover:brightness-95 transition-all shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50 disabled:scale-100 cursor-pointer"
              >
                <Show
                  when={!savingNotes()}
                  fallback={
                    <div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  }
                >
                  <span class="material-icons !text-[13px] text-white">
                    save
                  </span>
                </Show>
                {savingNotes() ? "Saving..." : "Save Thesis"}
              </button>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};
