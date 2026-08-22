import { ParentProps, createEffect, createSignal, Show } from "solid-js";
import { useLocation } from "@solidjs/router";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import InsightsSidebar from "../screen-dashboard/InsightsSidebar";
import AddExpenseSlideOver from "../screen-dashboard/modules/AddExpenseSlideOver";

// Keep a map of pathnames to scroll positions
const scrollPositions: Record<string, number> = {};

const MainLayout = (props: ParentProps) => {
  const location = useLocation();
  let mainRef: HTMLDivElement | undefined;
  const [sidebarOpen, setSidebarOpen] = createSignal(false);

  // Close mobile sidebar on route change
  createEffect(() => {
    location.pathname;
    setSidebarOpen(false);
  });

  // Track the scroll position of the main element per path
  const handleScroll = () => {
    if (mainRef) {
      scrollPositions[location.pathname] = mainRef.scrollTop;
    }
  };

  // Restore the scroll position when pathname changes
  createEffect(() => {
    const path = location.pathname;
    
    // Use requestAnimationFrame to ensure the DOM has updated with the new route content
    requestAnimationFrame(() => {
      if (mainRef) {
        mainRef.scrollTop = scrollPositions[path] || 0;
      }
    });
  });

  return (
    <div class="flex h-dvh overflow-hidden bg-page-bg relative">
      {/* Desktop Fixed Left Sidebar */}
      <div class="hidden lg:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Drawer Modal */}
      <Show when={sidebarOpen()}>
        <div class="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            class="fixed inset-0 bg-forest/40 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer Content */}
          <div class="relative z-10 w-[280px] max-w-[80vw] h-dvh bg-white shadow-2xl animate-slide-in-left">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      </Show>

      {/* Main Content Area */}
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen())} />
        
        <main 
          ref={mainRef}
          onScroll={handleScroll}
          class="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 custom-scrollbar"
        >
          <div class="max-w-[1400px] mx-auto w-full">
            {props.children}
          </div>
        </main>

        <AddExpenseSlideOver />
      </div>

      {/* Right Insights Sidebar */}
      <InsightsSidebar />
    </div>
  );
};

export default MainLayout;
