import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { setState, state } from "../../store";
import {
  TopBarDateControlsDesktop,
  TopBarDateControlsMobile,
} from "./TopBarDateControls";

describe("TopBarDateControls", () => {
  beforeEach(() => {
    setState("ui", "currentMonth", new Date(2026, 10, 1).toISOString());
    setState("ui", "datePeriod", "1-30");
  });

  it("renders the desktop period dropdown with resolved date ranges and updates datePeriod", async () => {
    const user = userEvent.setup();
    const { container } = render(() => (
      <TopBarDateControlsDesktop formattedDate={() => "November 2026"} />
    ));

    expect(container.querySelector("select")).toBeNull();

    const trigger = screen.getByRole("button", { name: /Select date period/i });
    expect(trigger).toHaveTextContent("1 - 30");
    expect(trigger.querySelector("svg.lucide-calendar-range")).toHaveClass(
      "[&_rect]:fill-forest",
    );

    await user.click(trigger);

    expect(await screen.findByText("Nov 1 – Nov 30")).toBeInTheDocument();
    expect(screen.getByText("Oct 21 – Nov 20")).toBeInTheDocument();
    expect(screen.getByText("Oct 26 – Nov 25")).toBeInTheDocument();

    const option2120 = screen.getByRole("option", { name: /21 - 20/ });
    await user.click(option2120);

    expect(state.ui.datePeriod).toBe("21-20");
    expect(trigger).toHaveTextContent("21 - 20");
  });

  it("renders the compact mobile period dropdown and switches to 25-25", async () => {
    const user = userEvent.setup();
    render(() => (
      <TopBarDateControlsMobile formattedDate={() => "November 2026"} />
    ));

    const trigger = screen.getByRole("button", { name: /Select date period/i });
    expect(trigger).toHaveTextContent("1 - 30");
    expect(trigger.querySelector("svg.lucide-calendar-range")).toHaveClass(
      "[&_rect]:fill-forest",
    );

    await user.click(trigger);

    const option2525 = await screen.findByRole("option", { name: /25 - 25/ });
    await user.click(option2525);

    expect(state.ui.datePeriod).toBe("25-25");
    expect(trigger).toHaveTextContent("25 - 25");
  });
});
