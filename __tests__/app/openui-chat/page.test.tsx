/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react"

import OpenUIChatPage from "@/app/openui-chat/page"

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
  }),
}))

jest.mock("@/hooks/use-api", () => ({
  useApi: () => ({
    data: { projects: [{ id: "project-1", name: "Apollo" }] },
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}))

describe("OpenUIChatPage", () => {
  test("renders project selection before chat is enabled", () => {
    render(<OpenUIChatPage />)

    expect(screen.getByText(/^select a project$/i)).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })
})