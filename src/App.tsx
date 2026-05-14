import { ParentProps, Show } from "solid-js";
import MainLayout from "./components/layout/MainLayout";
import { state, setState, setupPersistence } from "./store";
import AddIcon from "@suid/icons-material/Add";
import { useLocation } from "@solidjs/router";

const App = (props: ParentProps) => {
  // Initialize persistence inside the root component
  setupPersistence();
  const location = useLocation();
  const isStockPage = () => location.pathname.startsWith("/stock");

  return (
    <div class="relative h-screen">
      <MainLayout>
        {props.children}
      </MainLayout>

      {/* Global Add Button - Hidden on Stock pages */}
      <Show when={!isStockPage()}>
        <button 
          onClick={() => setState("ui", "showAddExpense", true)}
          class="fixed bottom-10 right-12 w-16 h-16 bg-spring text-white rounded-full flex items-center justify-center shadow-2xl transition-all z-40 group cursor-pointer hover:bg-forest duration-300"
          classList={{
            "right-10": !state.ui.insightsOpen
          }}
        >
          <AddIcon class="text-3xl group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </Show>
    </div>
  );
};

export default App;

