import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { createSignal } from "solid-js";
import { beforeEach, describe, expect, it } from "vitest";
import { setSelectedAccount, state } from "../../../store";
import { AccountFilterDropdown } from "./AccountFilterDropdown";
import { CategoryFilterDropdown } from "./CategoryFilterDropdown";

describe("RecentTransactions shadcn dropdowns", () => {
  beforeEach(() => {
    setSelectedAccount(null, null);
  });

  it("lets users pick an account via Kobalte DropdownMenu radio items and updates store state", async () => {
    const user = userEvent.setup();
    render(() => (
      <AccountFilterDropdown
        accounts={[
          { name: "All Accounts", color: "#2d7d46" },
          { name: "BCA Main", color: "#2c5364" },
          { name: "GoPay", color: "#52c278" },
        ]}
      />
    ));

    const trigger = screen.getByRole("button", {
      name: "Filter transactions by account",
    });
    expect(trigger).toHaveTextContent(/All Accounts/);

    await user.click(trigger);

    const bcaItem = await screen.findByRole("menuitemradio", {
      name: /BCA Main/,
    });
    await user.click(bcaItem);

    expect(state.ui.selectedAccount).toBe("BCA Main");
    expect(state.ui.selectedAccountColor).toBe("#2c5364");
    expect(trigger).toHaveTextContent(/BCA Main/);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Re-selecting the active account also closes the dropdown
    await user.click(trigger);
    const activeBcaItem = await screen.findByRole("menuitemradio", {
      name: /BCA Main/,
    });
    await user.click(activeBcaItem);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("keeps CategoryFilterDropdown open while toggling multiple categories and supports Clear", async () => {
    const user = userEvent.setup();
    const [selected, setSelected] = createSignal<Set<string>>(new Set());

    const toggleCategory = (cat: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(cat)) next.delete(cat);
        else next.add(cat);
        return next;
      });
    };

    render(() => (
      <CategoryFilterDropdown
        categories={[
          { name: "Food", icon: "restaurant", color: "#d47b5a" },
          { name: "Transport", icon: "directions_car", color: "#2c5364" },
        ]}
        selectedCategories={selected()}
        onToggleCategory={toggleCategory}
        onClear={() => setSelected(new Set<string>())}
      />
    ));

    const trigger = screen.getByRole("button", {
      name: "Filter transactions by category",
    });
    await user.click(trigger);

    const foodItem = await screen.findByRole("menuitemcheckbox", {
      name: /Food/,
    });
    await user.click(foodItem);

    expect(selected().has("Food")).toBe(true);
    expect(trigger).toHaveTextContent("1");

    // Menu remains open for multi-select
    const transportItem = screen.getByRole("menuitemcheckbox", {
      name: /Transport/,
    });
    await user.click(transportItem);

    expect(selected().size).toBe(2);
    expect(trigger).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(selected().size).toBe(0);
    expect(screen.getByText("All shown")).toBeInTheDocument();
  });
});
