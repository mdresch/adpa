"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api"
import { Loader2, Mail, User, Shield, Briefcase } from "lucide-react"

interface TeamMember {
    id: string
    name: string | null
    email: string | null
    role: string | null
    avatar_url: string | null
}

interface ProjectTeamViewProps {
    projectId: string
}

export function ProjectTeamView({ projectId }: ProjectTeamViewProps) {
    const [members, setMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!projectId) return

        const fetchMembers = async () => {
            try {
                setLoading(true)
                setError(null)
                const response = await apiClient.get<{ success: boolean; data: TeamMember[] }>(
                    `/projects/${projectId}/team-members`
                )
                setMembers(response.data)
            } catch (err: any) {
                console.error("Failed to fetch team members:", err)
                setError(err.message || "Failed to load team members")
            } finally {
                setLoading(false)
            }
        }

        fetchMembers()
    }, [projectId])

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-red-700">
                        <User className="h-5 w-5" />
                        <p>Error loading team: {error}</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Team Management</h2>
                    <p className="text-muted-foreground">
                        Manage project team members and their roles.
                    </p>
                </div>
                {/* Future: Add Invite Member button */}
                <Button variant="outline" disabled>
                    Invite Member (Coming Soon)
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map((member) => (
                    <Card key={member.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={member.avatar_url || ""} />
                                <AvatarFallback>{member.name?.charAt(0) || <User className="h-4 w-4" />}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <CardTitle className="text-base">{member.name || "Unknown User"}</CardTitle>
                                <CardDescription className="flex items-center gap-1 text-xs">
                                    <Mail className="h-3 w-3" />
                                    {member.email}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-2 mt-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Shield className="h-3 w-3" /> Role
                                    </span>
                                    <Badge variant={member.role === 'admin' || member.role === 'project_manager' ? "default" : "secondary"}>
                                        {member.role ? member.role.replace('_', ' ') : 'Member'}
                                    </Badge>
                                </div>
                                {/* Placeholder for future availability/status */}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Briefcase className="h-3 w-3" /> Status
                                    </span>
                                    <span className="text-green-600 font-medium text-xs">Active</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {members.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No team members found for this project.
                    </div>
                )}
            </div>
        </div>
    )
}
