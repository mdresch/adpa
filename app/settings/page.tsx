"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Separator } from "@/components/ui/separator"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout } from "@/components/animated-layout"
import { Save, RefreshCw, Shield, Database, Bell, Globe, Server, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"

export default function Settings() {
  const { user, hasRole } = useAuth()
  const { isConnected } = useWebSocket()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const saveSettings = async () => {
    try {
      setSaving(true)
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success("Settings saved successfully!")
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (!hasRole(["admin"])) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                  <p className="text-muted-foreground">You need administrator privileges to access system settings.</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatedLayout>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">System Settings</h1>
                    <p className="text-muted-foreground">Configure global system settings and preferences</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm text-muted-foreground">
                        {isConnected ? 'Connected' : 'Offline'}
                      </span>
                    </div>
                    <Button onClick={saveSettings} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>

            <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="backup">Backup</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="h-5 w-5" />
                      <span>General Configuration</span>
                    </CardTitle>
                    <CardDescription>Basic system configuration and preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="system-name">System Name</Label>
                        <Input id="system-name" defaultValue="ADPA Production" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="admin-email">Administrator Email</Label>
                        <Input id="admin-email" type="email" defaultValue="admin@company.com" className="mt-1" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="timezone">Default Timezone</Label>
                        <select id="timezone" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" aria-label="Default Timezone">
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="language">Default Language</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                          aria-label="Default Language"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish (Future)</option>
                          <option value="fr">French (Future)</option>
                        </select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">System Behavior</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Auto-save Configurations</Label>
                            <p className="text-sm text-muted-foreground">Automatically save configuration changes</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Enable Debug Mode</Label>
                            <p className="text-sm text-muted-foreground">Show detailed error messages and logs</p>
                          </div>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Maintenance Mode</Label>
                            <p className="text-sm text-muted-foreground">Temporarily disable system for maintenance</p>
                          </div>
                          <Switch />
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset to Defaults
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Security Settings</span>
                    </CardTitle>
                    <CardDescription>Configure authentication, authorization, and security policies</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium mb-3">Authentication</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Require Multi-Factor Authentication</Label>
                            <p className="text-sm text-muted-foreground">Enforce MFA for all user accounts</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                            <Input id="session-timeout" type="number" defaultValue="60" className="mt-1" />
                          </div>
                          <div>
                            <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                            <Input id="max-login-attempts" type="number" defaultValue="5" className="mt-1" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-medium mb-3">API Security</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="rate-limit">Rate Limit (requests/minute)</Label>
                            <Input id="rate-limit" type="number" defaultValue="1000" className="mt-1" />
                          </div>
                          <div>
                            <Label htmlFor="api-key-expiry">API Key Expiry (days)</Label>
                            <Input id="api-key-expiry" type="number" defaultValue="90" className="mt-1" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Enable CORS</Label>
                            <p className="text-sm text-muted-foreground">Allow cross-origin requests</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-medium mb-3">Compliance</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">GDPR Compliance Mode</Label>
                            <p className="text-sm text-muted-foreground">Enable GDPR data protection features</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">SOX Audit Logging</Label>
                            <p className="text-sm text-muted-foreground">Enhanced logging for SOX compliance</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div>
                          <Label htmlFor="audit-retention">Audit Log Retention (days)</Label>
                          <Input id="audit-retention" type="number" defaultValue="2555" className="mt-1" />
                          <p className="text-xs text-muted-foreground mt-1">7 years for SOX compliance</p>
                        </div>
                      </div>
                    </div>

                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Security Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="h-5 w-5" />
                      <span>Notification Settings</span>
                    </CardTitle>
                    <CardDescription>Configure system notifications and alerts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium mb-3">Email Notifications</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="smtp-server">SMTP Server</Label>
                            <Input id="smtp-server" placeholder="smtp.company.com" className="mt-1" />
                          </div>
                          <div>
                            <Label htmlFor="smtp-port">SMTP Port</Label>
                            <Input id="smtp-port" type="number" defaultValue="587" className="mt-1" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="smtp-username">Username</Label>
                            <Input id="smtp-username" placeholder="notifications@company.com" className="mt-1" />
                          </div>
                          <div>
                            <Label htmlFor="smtp-password">Password</Label>
                            <Input id="smtp-password" type="password" className="mt-1" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-medium mb-3">Alert Types</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">System Health Alerts</Label>
                            <p className="text-sm text-muted-foreground">Notify when system health degrades</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">AI Provider Failover</Label>
                            <p className="text-sm text-muted-foreground">Alert when AI providers fail over</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Integration Failures</Label>
                            <p className="text-sm text-muted-foreground">Notify on integration connection issues</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Job Completion</Label>
                            <p className="text-sm text-muted-foreground">Notify when document generation completes</p>
                          </div>
                          <Switch />
                        </div>
                      </div>
                    </div>

                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Notification Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Server className="h-5 w-5" />
                      <span>Performance Settings</span>
                    </CardTitle>
                    <CardDescription>Configure system performance and resource usage</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium mb-3">Resource Limits</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="max-concurrent-jobs">Max Concurrent Jobs</Label>
                          <Input id="max-concurrent-jobs" type="number" defaultValue="100" className="mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="job-timeout">Job Timeout (seconds)</Label>
                          <Input id="job-timeout" type="number" defaultValue="300" className="mt-1" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-medium mb-3">Caching</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Enable Redis Caching</Label>
                            <p className="text-sm text-muted-foreground">Use Redis for improved performance</p>
                          </div>
                          <Switch />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="cache-ttl">Cache TTL (seconds)</Label>
                            <Input id="cache-ttl" type="number" defaultValue="3600" className="mt-1" />
                          </div>
                          <div>
                            <Label htmlFor="max-cache-size">Max Cache Size (MB)</Label>
                            <Input id="max-cache-size" type="number" defaultValue="512" className="mt-1" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Performance Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="backup" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5" />
                      <span>Backup & Recovery</span>
                    </CardTitle>
                    <CardDescription>Configure data backup and recovery settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium mb-3">Automated Backups</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Enable Automated Backups</Label>
                            <p className="text-sm text-muted-foreground">Automatically backup system data</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="backup-frequency">Backup Frequency</Label>
                            <select
                              id="backup-frequency"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                              aria-label="Backup Frequency"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="backup-retention">Retention Period (days)</Label>
                            <Input id="backup-retention" type="number" defaultValue="30" className="mt-1" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-medium mb-3">Backup Location</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="backup-path">Local Backup Path</Label>
                          <Input id="backup-path" defaultValue="/var/backups/adpa" className="mt-1" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Cloud Backup</Label>
                            <p className="text-sm text-muted-foreground">Store backups in cloud storage</p>
                          </div>
                          <Switch />
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button>
                        <Save className="h-4 w-4 mr-2" />
                        Save Backup Settings
                      </Button>
                      <Button variant="outline">Create Backup Now</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Configuration</CardTitle>
                    <CardDescription>Advanced system settings for experienced administrators</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium mb-3">System Tuning</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="worker-processes">Worker Processes</Label>
                          <Input id="worker-processes" type="number" defaultValue="4" className="mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="memory-limit">Memory Limit (MB)</Label>
                          <Input id="memory-limit" type="number" defaultValue="2048" className="mt-1" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-medium mb-3">Feature Flags</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Beta Features</Label>
                            <p className="text-sm text-muted-foreground">Enable experimental features</p>
                          </div>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Real-time Collaboration</Label>
                            <p className="text-sm text-muted-foreground">Enable collaborative editing (Q3 2025)</p>
                          </div>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Advanced Analytics</Label>
                            <p className="text-sm text-muted-foreground">Enable detailed usage analytics</p>
                          </div>
                          <Switch />
                        </div>
                      </div>
                    </div>

                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Advanced Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
              </div>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
