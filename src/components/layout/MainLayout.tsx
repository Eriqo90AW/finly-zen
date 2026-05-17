import { ParentProps } from "solid-js";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import InsightsSidebar from "../screen-dashboard/InsightsSidebar";
import AddExpenseSlideOver from "../screen-dashboard/modules/AddExpenseSlideOver";

const MainLayout = (props: ParentProps) => {
  return (
    <div class="flex h-screen overflow-hidden bg-page-bg">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <TopBar />
        
        <main class="flex-1 overflow-y-auto p-6 custom-scrollbar">
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
