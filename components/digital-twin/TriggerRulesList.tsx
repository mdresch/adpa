import React from 'react'
import { DigitalTwinTriggerRule } from '@/lib/digital-twin-types'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Trash2 } from 'lucide-react'

interface TriggerRulesListProps {
    rules: DigitalTwinTriggerRule[]
    onDelete: (id: string) => void
}

export function TriggerRulesList({ rules, onDelete }: TriggerRulesListProps) {
    if (!rules || rules.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Automation Rules</CardTitle>
                    <CardDescription>
                        Define rules to automatically generate documents when assets change.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed rounded-md">
                        <p>No rules defined.</p>
                        <p className="text-sm">Create a rule to automate document generation.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Automation Rules</CardTitle>
                <CardDescription>
                    Active rules for document generation.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rule Name</TableHead>
                            <TableHead>Trigger Type</TableHead>
                            <TableHead>Conditions</TableHead>
                            <TableHead>Template</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules.map((rule) => (
                            <TableRow key={rule.id}>
                                <TableCell className="font-medium">{rule.name}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{rule.trigger_type}</Badge>
                                </TableCell>
                                <TableCell className="text-sm font-mono text-muted-foreground">
                                    {rule.rule_config ? JSON.stringify(rule.rule_config).substring(0, 30) + '...' : '-'}
                                </TableCell>
                                <TableCell>{rule.template_id?.substring(0, 8) || 'N/A'}</TableCell>
                                <TableCell>
                                    <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                                        {rule.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete(rule.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
