"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Lock, 
  Key, 
  FileCheck,
  Globe,
  Loader2,
  Info
} from "lucide-react"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"

interface ComplianceSecurity {
  id: string
  project_id: string
  title: string
  category: 'compliance' | 'security' | 'legal' | 'standard'
  type?: string
  description?: string
  requirement_text?: string
  status?: 'applicable' | 'not_applicable' | 'partial' | 'compliant' | 'non_compliant'
  security_score?: number
  compliance_score?: number
  latest_breach?: string
  data_at_rest_encryption?: string
  multi_factor_authentication?: boolean
  ip_address_restriction?: boolean
  user_audit_trail?: boolean
  admin_audit_trail?: boolean
  data_audit_trail?: boolean
  user_can_upload_data?: boolean
  data_classification?: boolean
  remember_password?: boolean
  user_roles_support?: boolean
  file_sharing?: boolean
  valid_certificate_name?: string
  trusted_certificate?: boolean
  encryption_protocol?: string
  heartbleed_patched?: boolean
  http_security_headers?: boolean
  supports_saml?: boolean
  protected_against_drown?: boolean
  penetration_testing?: boolean
  requires_user_authentication?: boolean
  password_policy?: string
  // Compliance Standards
  iso_27001?: boolean
  iso_27018?: boolean
  iso_27017?: boolean
  iso_27002?: boolean
  finra?: boolean
  fisma?: boolean
  gaap?: boolean
  hipaa?: boolean
  isae_3402?: boolean
  itar?: boolean
  soc_1?: boolean
  soc_2?: boolean
  soc_3?: boolean
  sox?: boolean
  sp_800_53?: boolean
  ssae_18?: boolean
  safe_harbor?: boolean
  pci_dss_version?: string
  glba?: boolean
  fedramp_level?: string
  csa_star_level?: string
  certification?: boolean
  privacy_shield?: boolean
  ffiec?: boolean
  gapp?: boolean
  cobit?: boolean
  coppa?: boolean
  ferpa?: boolean
  hitrust_csf?: boolean
  jericho_forum_commandments?: boolean
  // Legal Requirements
  data_ownership?: string
  dmca?: boolean
  data_retention_policy?: string
  gdpr_readiness_statement?: string
  gdpr_right_to_erasure?: boolean
  gdpr_report_data_breaches?: boolean
  gdpr_data_protection?: boolean
  gdpr_user_ownership?: boolean
  other_standards?: Record<string, any>
  created_at: string
  updated_at: string
}

interface ComplianceSecurityTabProps {
  projectId: string
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'compliant':
      return 'bg-green-500'
    case 'non_compliant':
      return 'bg-red-500'
    case 'partial':
      return 'bg-yellow-500'
    case 'not_applicable':
      return 'bg-gray-500'
    default:
      return 'bg-blue-500'
  }
}

const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'compliant':
      return <Badge variant="default" className="bg-green-500">Compliant</Badge>
    case 'non_compliant':
      return <Badge variant="destructive">Non-Compliant</Badge>
    case 'partial':
      return <Badge variant="secondary" className="bg-yellow-500">Partial</Badge>
    case 'not_applicable':
      return <Badge variant="outline">N/A</Badge>
    default:
      return <Badge variant="outline">Applicable</Badge>
  }
}

export function ComplianceSecurityTab({ projectId }: ComplianceSecurityTabProps) {
  const [data, setData] = useState<ComplianceSecurity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    loadComplianceSecurity()
  }, [projectId])

  const loadComplianceSecurity = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/projects/${projectId}/compliance-security`)
      setData(response.data || [])
    } catch (error) {
      console.error('Error loading compliance security:', error)
      toast.error('Failed to load compliance and security data')
    } finally {
      setLoading(false)
    }
  }

  const filteredData = selectedCategory === 'all' 
    ? data 
    : data.filter(item => item.category === selectedCategory)

  // Calculate aggregate scores
  const avgSecurityScore = data.length > 0
    ? Math.round(data.reduce((sum, item) => sum + (item.security_score || 0), 0) / data.length)
    : 0

  const avgComplianceScore = data.length > 0
    ? Math.round(data.reduce((sum, item) => sum + (item.compliance_score || 0), 0) / data.length)
    : 0

  // Count compliance standards
  const complianceStandards = [
    { name: 'ISO 27001', value: data.some(d => d.iso_27001) },
    { name: 'ISO 27018', value: data.some(d => d.iso_27018) },
    { name: 'ISO 27017', value: data.some(d => d.iso_27017) },
    { name: 'ISO 27002', value: data.some(d => d.iso_27002) },
    { name: 'FINRA', value: data.some(d => d.finra) },
    { name: 'FISMA', value: data.some(d => d.fisma) },
    { name: 'GAAP', value: data.some(d => d.gaap) },
    { name: 'HIPAA', value: data.some(d => d.hipaa) },
    { name: 'ISAE 3402', value: data.some(d => d.isae_3402) },
    { name: 'ITAR', value: data.some(d => d.itar) },
    { name: 'SOC 1', value: data.some(d => d.soc_1) },
    { name: 'SOC 2', value: data.some(d => d.soc_2) },
    { name: 'SOC 3', value: data.some(d => d.soc_3) },
    { name: 'SOX', value: data.some(d => d.sox) },
    { name: 'SP 800-53', value: data.some(d => d.sp_800_53) },
    { name: 'SSAE 18', value: data.some(d => d.ssae_18) },
    { name: 'Safe Harbor', value: data.some(d => d.safe_harbor) },
    { name: 'PCI DSS', value: data.some(d => d.pci_dss_version) },
    { name: 'GLBA', value: data.some(d => d.glba) },
    { name: 'FedRAMP', value: data.some(d => d.fedramp_level) },
    { name: 'CSA STAR', value: data.some(d => d.csa_star_level) },
    { name: 'Privacy Shield', value: data.some(d => d.privacy_shield) },
    { name: 'FFIEC', value: data.some(d => d.ffiec) },
    { name: 'GAPP', value: data.some(d => d.gapp) },
    { name: 'COBIT', value: data.some(d => d.cobit) },
    { name: 'COPPA', value: data.some(d => d.coppa) },
    { name: 'FERPA', value: data.some(d => d.ferpa) },
    { name: 'HITRUST CSF', value: data.some(d => d.hitrust_csf) },
    { name: 'Jericho Forum', value: data.some(d => d.jericho_forum_commandments) },
  ].filter(s => s.value)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No compliance or security data extracted yet. Run AI extraction to populate this data.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgSecurityScore}/10</div>
            <Progress value={avgSecurityScore * 10} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgComplianceScore}/10</div>
            <Progress value={avgComplianceScore * 10} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Standards Applied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{complianceStandards.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Compliance standards</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All ({data.length})
        </button>
        <button
          onClick={() => setSelectedCategory('security')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            selectedCategory === 'security'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Security ({data.filter(d => d.category === 'security').length})
        </button>
        <button
          onClick={() => setSelectedCategory('compliance')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            selectedCategory === 'compliance'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Compliance ({data.filter(d => d.category === 'compliance').length})
        </button>
        <button
          onClick={() => setSelectedCategory('legal')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            selectedCategory === 'legal'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Legal ({data.filter(d => d.category === 'legal').length})
        </button>
      </div>

      {/* Detailed View */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="security">Security Details</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Standards</TabsTrigger>
          <TabsTrigger value="legal">Legal Requirements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {filteredData.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    {item.type && (
                      <CardDescription className="mt-1">{item.type}</CardDescription>
                    )}
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {item.security_score !== undefined && item.security_score !== null && (
                    <div>
                      <div className="text-xs text-muted-foreground">Security Score</div>
                      <div className="text-lg font-semibold">{item.security_score}/10</div>
                    </div>
                  )}
                  {item.compliance_score !== undefined && item.compliance_score !== null && (
                    <div>
                      <div className="text-xs text-muted-foreground">Compliance Score</div>
                      <div className="text-lg font-semibold">{item.compliance_score}/10</div>
                    </div>
                  )}
                  {item.latest_breach && (
                    <div>
                      <div className="text-xs text-muted-foreground">Latest Breach</div>
                      <div className="text-sm">{new Date(item.latest_breach).toLocaleDateString()}</div>
                    </div>
                  )}
                  {item.data_at_rest_encryption && (
                    <div>
                      <div className="text-xs text-muted-foreground">Encryption</div>
                      <div className="text-sm font-medium">{item.data_at_rest_encryption}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          {filteredData.filter(d => d.category === 'security' || selectedCategory !== 'all').map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {item.multi_factor_authentication !== undefined && (
                    <div className="flex items-center gap-2">
                      {item.multi_factor_authentication ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Multi-factor Authentication</span>
                    </div>
                  )}
                  {item.ip_address_restriction !== undefined && (
                    <div className="flex items-center gap-2">
                      {item.ip_address_restriction ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">IP Address Restriction</span>
                    </div>
                  )}
                  {item.user_audit_trail !== undefined && (
                    <div className="flex items-center gap-2">
                      {item.user_audit_trail ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">User Audit Trail</span>
                    </div>
                  )}
                  {item.admin_audit_trail !== undefined && (
                    <div className="flex items-center gap-2">
                      {item.admin_audit_trail ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Admin Audit Trail</span>
                    </div>
                  )}
                  {item.data_audit_trail !== undefined && (
                    <div className="flex items-center gap-2">
                      {item.data_audit_trail ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Data Audit Trail</span>
                    </div>
                  )}
                  {item.encryption_protocol && (
                    <div>
                      <div className="text-xs text-muted-foreground">Encryption Protocol</div>
                      <div className="text-sm font-medium">{item.encryption_protocol}</div>
                    </div>
                  )}
                  {item.password_policy && (
                    <div className="col-span-full">
                      <div className="text-xs text-muted-foreground">Password Policy</div>
                      <div className="text-sm">{item.password_policy}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Standards</CardTitle>
              <CardDescription>Standards applicable to this project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {complianceStandards.map((standard) => (
                  <div key={standard.name} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{standard.name}</span>
                  </div>
                ))}
                {complianceStandards.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full">
                    No compliance standards extracted yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="space-y-4">
          {filteredData.filter(d => d.category === 'legal' || selectedCategory !== 'all').map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.data_retention_policy && (
                  <div>
                    <div className="text-xs text-muted-foreground">Data Retention Policy</div>
                    <div className="text-sm font-medium">{item.data_retention_policy}</div>
                  </div>
                )}
                {item.gdpr_readiness_statement && (
                  <div>
                    <div className="text-xs text-muted-foreground">GDPR Readiness Statement</div>
                    <div className="text-sm">{item.gdpr_readiness_statement}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {item.dmca !== undefined && (
                    <div className="flex items-center gap-2">
                      {item.dmca ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">DMCA</span>
                    </div>
                  )}
                  {item.gdpr_right_to_erasure !== undefined && (
                    <div className="flex items-center gap-2">
                      {item.gdpr_right_to_erasure ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">GDPR Right to Erasure</span>
                    </div>
                  )}
                  {item.gdpr_report_data_breaches !== undefined && (
                    <div className="flex items-center gap-2">
                      {item.gdpr_report_data_breaches ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">GDPR Report Breaches</span>
                    </div>
                  )}
                  {item.gdpr_data_protection !== undefined && (
                    <div className="flex items-center gap-2">
                      {item.gdpr_data_protection ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">GDPR Data Protection</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

