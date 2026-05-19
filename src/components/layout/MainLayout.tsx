import { ParentProps, createEffect } from "solid-js";
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
    <div class="flex h-screen overflow-hidden bg-page-bg">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <TopBar />
        
        <main 
          ref={mainRef}
          onScroll={handleScroll}
          class="flex-1 overflow-y-auto p-6 custom-scrollbar"
        >
          <div class="max-w-[1400px] mx-auto">
            {props.children}
          </div>
        </main>

        <AddExpenseSlideOver />
      </div>

      {/* Collapsible Right Sidebar */}
      <InsightsSidebar />
    </div>
  );
};

export default MainLayout;
