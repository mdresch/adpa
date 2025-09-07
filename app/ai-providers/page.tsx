"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Settings, Plus, Edit, Trash2, CheckCircle, AlertCircle, Zap, Eye, EyeOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import googleProviderStubRaw from "./google"

const googleProviderStub = {
  id: "2",
  name: "Google AI",
  type: "google",
  model: "gemini-pro",
  status: "active",
  apiKey: "*********************",
  endpoint: "https://generativelanguage.googleapis.com",
  priority: 2,
  enabled: true,
  lastUsed: "10 minutes ago",
  requestCount: 456,
  errorRate: 0.1,
  // You can spread googleProviderStubRaw if needed for additional properties
  ...googleProviderStubRaw,
}

export default function AIProviders() {
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [providers, setProviders] = useState([
    {
      id: "1",
      name: "OpenAI GPT-4",
      type: "openai",
      model: "gpt-4o",
      status: "active",
      apiKey: "sk-proj-*********************",
      endpoint: "https://api.openai.com/v1",
      priority: 1,
      enabled: true,
      lastUsed: "2 minutes ago",
      requestCount: 1234,
      errorRate: 0.2,
    },
    googleProviderStub,
    {
      id: "3",
      name: "Azure OpenAI",
      type: "azure-openai",
      model: "gpt-4",
      status: "active",
      apiKey: "*********************",
      endpoint: "https://your-resource.openai.azure.com",
      priority: 3,
      enabled: true,
      lastUsed: "30 minutes ago",
      requestCount: 789,
      errorRate: 0.5,
    },
  ])

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKey((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }))
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">AI Providers</h1>
                <p className="text-muted-foreground">Configure and manage AI providers for document generation</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Provider
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add AI Provider</DialogTitle>
                    <DialogDescription>Configure a new AI provider for document generation.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="provider-type" className="text-right">
                        Provider
                      </Label>
                      <Select>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="google">Google AI</SelectItem>
                          <SelectItem value="azure-openai">Azure OpenAI</SelectItem>
                          <SelectItem value="ollama">Ollama</SelectItem>
                          <SelectItem value="copilot">GitHub Copilot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input id="name" placeholder="Provider name" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="api-key" className="text-right">
                        API Key
                      </Label>
                      <Input id="api-key" type="password" placeholder="Enter API key" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="model" className="text-right">
                        Model
                      </Label>
                      <Input id="model" placeholder="e.g., gpt-4o" className="col-span-3" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Add Provider</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Tabs defaultValue="providers" className="space-y-4">
              <TabsList>
                <TabsTrigger value="providers">Providers</TabsTrigger>
                <TabsTrigger value="failover">Failover Settings</TabsTrigger>
                <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="providers" className="space-y-4">
                <div className="grid gap-4">
                  {providers.map((provider) => (
                    <Card key={provider.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Zap className="h-8 w-8 text-primary" />
                            <div>
                              <CardTitle className="flex items-center space-x-2">
                                <span>{provider.name}</span>
                                <Badge variant={provider.status === "active" ? "default" : "secondary"}>
                                  {provider.status}
                                </Badge>
                              </CardTitle>
                              <CardDescription>
                                Model: {provider.model} • Priority: {provider.priority} • Last used: {provider.lastUsed}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch checked={provider.enabled} />
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-medium">API Endpoint</Label>
                            <p className="text-sm text-muted-foreground mt-1">{provider.endpoint}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">API Key</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <p className="text-sm text-muted-foreground font-mono">
                                {showApiKey[provider.id]
                                  ? provider.apiKey ?? ""
                                  : (provider.apiKey ?? "").replace(/./g, "*")}
                              </p>
                              <Button variant="ghost" size="sm" onClick={() => toggleApiKeyVisibility(provider.id)}>
                                {showApiKey[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Performance</Label>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">{provider.requestCount} requests</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm">{provider.errorRate}% errors</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="failover" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Failover Configuration</CardTitle>
                    <CardDescription>
                      Configure automatic failover between AI providers when primary providers are unavailable
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Enable Automatic Failover</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically switch to backup providers when primary fails
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label>Failover Priority Order</Label>
                      <div className="space-y-2">
                        {providers
                          .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
                          .map((provider, index) => (
                            <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                                  {index + 1}
                                </span>
                                <span className="font-medium">{provider.name}</span>
                                <Badge variant="outline">{provider.model}</Badge>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Total Requests Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">2,479</div>
                      <p className="text-sm text-muted-foreground">+12% from yesterday</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Average Response Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">1.2s</div>
                      <p className="text-sm text-muted-foreground">-0.3s from yesterday</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">99.7%</div>
                      <p className="text-sm text-muted-foreground">+0.2% from yesterday</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
