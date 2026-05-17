import { test, expect } from '@playwright/test'

test.describe('OpenUI chat report flow', () => {
  test('loads project threads and renders a report response end to end', async ({ page }) => {
    test.slow()

    await page.goto('/auth/login')
    await page.getByRole('button', { name: 'Demo Login' }).click()
    await page.waitForURL(/\/$/, { timeout: 30000 })

    await page.goto('/openui-chat')

    await expect(page.getByRole('heading', { name: 'OpenUI chat' })).toBeVisible()

    const projectSelector = page.getByRole('combobox')
    await expect(projectSelector).toBeVisible()
    await projectSelector.click()

    const firstProject = page.getByRole('option').first()
    await expect(firstProject).toBeVisible({ timeout: 20000 })
    const selectedProjectName = (await firstProject.textContent())?.trim() || 'Selected project'
    await firstProject.click()

    await expect(page.getByText(selectedProjectName, { exact: false }).first()).toBeVisible({ timeout: 20000 })

    const prompt = 'Create a project charter report with objectives, risks, milestones, and recommended next actions.'
    await page.getByPlaceholder(/ask a project question or request a report/i).fill(prompt)

    const chatRequest = page.waitForResponse(
      (response) => response.url().includes('/api/v1/openui-chat/chat') && response.request().method() === 'POST'
    )

    await page.getByRole('button', { name: /^send$/i }).click()

    const chatResponse = await chatRequest
    expect(chatResponse.ok()).toBeTruthy()

    await expect(page.getByText('Report mode').first()).toBeVisible({ timeout: 30000 })
    await expect(page.getByText('Project charter report', { exact: true }).first()).toBeVisible({ timeout: 30000 })
    await expect(page.getByText(/sources/i).first()).toBeVisible({ timeout: 30000 })

    await expect(page.getByRole('button', { name: /create a project charter report/i }).first()).toBeVisible({ timeout: 30000 })
  })
})