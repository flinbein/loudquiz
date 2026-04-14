import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSwitcher } from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("renders current language", () => {
    render(<LanguageSwitcher currentLang="ru" onChangeLang={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("ru");
  });

  it("toggles from ru to en", async () => {
    const onChange = vi.fn();
    render(<LanguageSwitcher currentLang="ru" onChangeLang={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("en");
  });

  it("toggles from en to ru", async () => {
    const onChange = vi.fn();
    render(<LanguageSwitcher currentLang="en" onChangeLang={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("ru");
  });
});
