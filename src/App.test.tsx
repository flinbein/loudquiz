import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders home page by default", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("Вечеринка, наушники, жесты")).toBeInTheDocument();
  });

  it("renders constructor page", () => {
    render(
      <MemoryRouter initialEntries={["/constructor"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("Редактор вопросов")).toBeInTheDocument();
  });

  it("renders rules page", () => {
    render(
      <MemoryRouter initialEntries={["/rules"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("Правила игры")).toBeInTheDocument();
  });

  it("renders play page with entry form", () => {
    render(
      <MemoryRouter initialEntries={["/play"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("Loud Quiz")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("000-000-000")).toBeInTheDocument();
  });

  it("renders setup page", () => {
    render(
      <MemoryRouter initialEntries={["/setup"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("Новая игра")).toBeInTheDocument();
  });
});
