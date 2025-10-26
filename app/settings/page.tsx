"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiClient } from "@/lib/api"
import { Loader2, Save, Key, CheckCircle, AlertCircle } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // AI Gateway Settings
  const [gatewayApiKey, setGatewayApiKey] = useState("")
  const [gatewayEnabled, setGatewayEnabled] = useState(false)
  const [currentKeyMasked, setCurrentKeyMasked] = useState("")

  // Password Change Settings
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get('/settings/ai-gateway')
      setGatewayEnabled(data.enabled || false)
      setCurrentKeyMasked(data.api_key_masked || "Not configured")
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveGatewaySettings = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      await apiClient.post('/settings/ai-gateway', {
        api_key: gatewayApiKey,
        enabled: gatewayEnabled
      })

      setMessage({ type: 'success', text: 'AI Gateway settings saved successfully!' })
      setGatewayApiKey("") // Clear input
      await loadSettings() // Reload to show masked key
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to save settings'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'All fields are required' })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters long' })
      return
    }

    try {
      setChangingPassword(true)
      
      await apiClient.request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to change password'
      setPasswordMessage({ type: 'error', text: errorMessage })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">
          Configure application settings and integrations
        </p>

        <Tabs defaultValue="ai-gateway" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai-gateway">AI Gateway</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="ai-gateway" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Vercel AI Gateway Configuration
                </CardTitle>
                <CardDescription>
                  Configure your Vercel AI Gateway API key to enable AI-powered document generation.
                  The AI Gateway provides unified access to multiple AI providers (OpenAI, Google, Anthropic, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {message && (
                  <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                    {message.type === 'success' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Status</Label>
                    <div className="flex items-center gap-2">
                      {gatewayEnabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-sm">
                        {gatewayEnabled ? 'AI Gateway Enabled' : 'AI Gateway Disabled'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Current API Key</Label>
                    <Input
                      value={currentKeyMasked}
                      disabled
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your API key is encrypted and securely stored
                    </p>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-4">Update AI Gateway Key</h4>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="gateway-key">
                          AI Gateway API Key
                        </Label>
                        <Input
                          id="gateway-key"
                          type="password"
                          placeholder="Enter your Vercel AI Gateway API key"
                          value={gatewayApiKey}
                          onChange={(e) => setGatewayApiKey(e.target.value)}
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          Get your API key from{' '}
                          <a 
                            href="https://sdk.vercel.ai/dashboard" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Vercel AI Gateway Dashboard
                          </a>
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="gateway-enabled"
                          checked={gatewayEnabled}
                          onChange={(e) => setGatewayEnabled(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="gateway-enabled" className="cursor-pointer">
                          Enable AI Gateway
                        </Label>
                      </div>

                      <Button
                        onClick={saveGatewaySettings}
                        disabled={saving || !gatewayApiKey}
                        className="w-full sm:w-auto"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Gateway Settings
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mt-6">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      How AI Gateway Works
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>AI Gateway routes requests to multiple providers (OpenAI, Google, Anthropic, etc.)</li>
                      <li>Configure provider settings in your Vercel AI Gateway dashboard</li>
                      <li>ADPA uses this single key to access all configured providers</li>
                      <li>Automatic failover and load balancing across providers</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure general application settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  General settings coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your account password for enhanced security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  {passwordMessage && (
                    <Alert variant={passwordMessage.type === 'error' ? 'destructive' : 'default'}>
                      {passwordMessage.type === 'success' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>{passwordMessage.text}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                        placeholder="Enter your current password"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        placeholder="Enter your new password (min 8 characters)"
                        required
                        minLength={8}
                      />
                    </div>

                    <div>
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                        placeholder="Confirm your new password"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full sm:w-auto"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Change Password
                      </>
                    )}
                  </Button>
                </form>

                <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg mt-6">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    Password Security Tips
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Use at least 8 characters (12+ recommended)</li>
                    <li>Include uppercase, lowercase, numbers, and symbols</li>
                    <li>Avoid common words or personal information</li>
                    <li>Don't reuse passwords from other accounts</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
