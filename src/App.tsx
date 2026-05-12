import { ParentProps } from "solid-js";
import MainLayout from "./components/layout/MainLayout";
import { state, setState, setupPersistence } from "./store";
import AddIcon from "@suid/icons-material/Add";

const App = (props: ParentProps) => {
  // Initialize persistence inside the root component
  setupPersistence();

  return (
    <div class="relative h-screen">
      <MainLayout>
        {props.children}
      </MainLayout>

      {/* Global Add Button */}
      <button 
        onClick={() => setState("ui", "showAddExpense", true)}
        class="fixed bottom-10 right-12 w-16 h-16 bg-spring text-white rounded-full flex items-center justify-center shadow-2xl transition-all z-40 group cursor-pointer hover:bg-forest duration-300"
        classList={{
          "right-10": !state.ui.insightsOpen
        }}
      >
        <AddIcon class="text-3xl group-hover:rotate-90 transition-transform duration-500" />
      </button>
    </div>
  );
};

export default App;
