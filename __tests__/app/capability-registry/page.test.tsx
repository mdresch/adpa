/**
 * @jest-environment jsdom
 */
import { readFileSync } from "fs"
import { join } from "path"
import { render, screen, waitFor } from "@testing-library/react"

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", role: "member" },
    isAuthenticated: true,
    loading: false,
  }),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const mockGetCapabilityRegistry = jest.fn()
jest.mock("@/lib/api", () => ({
  apiClient: {
    getCapabilityRegistry: (...args: unknown[]) => mockGetCapabilityRegistry(...args),
  },
}))

jest.mock("@/lib/notify", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}))

jest.mock("@/components/sidebar", () => ({ Sidebar: () => <div data-testid="sidebar" /> }))
jest.mock("@/components/header", () => ({ Header: () => <div data-testid="header" /> }))
jest.mock("@/components/page-transition", () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
jest.mock("@/components/animated-layout", () => ({
  AnimatedLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import CapabilityRegistryPage from "@/app/capability-registry/page"

const readWorkspaceFile = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8")

const sampleCapability = {
  id: "cap-1",
  moduleId: "risk-management",
  portfolioId: "portfolio-1",
  platformOperator: "adpa",
  functionalOwnerType: "department",
  functionalOwnerDepartment: "Risk",
  controlDefinitionOwnerDepartment: "Compliance",
  activationStatus: "active",
}

describe("CapabilityRegistryPage (ADR-012 Action Item 7)", () => {
  it("contains no write-capable HTTP calls -- discovery only, never mutates state", () => {
    const source = readWorkspaceFile("app/capability-registry/page.tsx")

    expect(source).not.toMatch(/apiClient\.(post|put|patch|delete)\(/i)
    expect(source).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)['"]/i)
  })

  beforeEach(() => {
    mockGetCapabilityRegistry.mockReset()
  })

  it("renders fetched capabilities read-only, with no write action buttons", async () => {
    mockGetCapabilityRegistry.mockResolvedValue({ capabilities: [sampleCapability] })

    render(<CapabilityRegistryPage />)

    await waitFor(() => expect(screen.getByText("risk-management")).toBeInTheDocument())
    expect(screen.getByText(/active/i)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /promote|approve|deny|withdraw|request/i })
    ).not.toBeInTheDocument()
  })

  it("links out to the Governor Portal instead of exposing its own write actions", async () => {
    const previousOrchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL
    process.env.NEXT_PUBLIC_ORCHESTRATOR_URL = "http://localhost:5091"
    mockGetCapabilityRegistry.mockResolvedValue({ capabilities: [sampleCapability] })

    try {
      render(<CapabilityRegistryPage />)

      const link = await screen.findByRole("link", { name: /governor portal/i })
      expect(link).toHaveAttribute("href", "http://localhost:5091/capabilities")
    } finally {
      process.env.NEXT_PUBLIC_ORCHESTRATOR_URL = previousOrchestratorUrl
    }
  })
})
