import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from 'lucide-react'

interface CreateTriggerRuleDialogProps {
  onCreate: (rule: any) => Promise<boolean>
}

export function CreateTriggerRuleDialog({ onCreate }: CreateTriggerRuleDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState('')
  const [triggerType, setTriggerType] = useState('state_change')
  const [templateId, setTemplateId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const ruleConfig = {
      // Simplified rule config: just match asset_type
      conditions: assetType ? { asset_type: assetType } : {}
    }

    const success = await onCreate({
      name,
      trigger_type: triggerType,
      rule_config: ruleConfig,
      template_id: templateId || null,
      generation_params: {
        prompt: "Generate a standard maintenance report."
      },
      is_active: true
    })

    setLoading(false)
    if (success) {
      setOpen(false)
      // Reset form
      setName('')
      setAssetType('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Automation Rule</DialogTitle>
          <DialogDescription>
            Trigger document generation based on Digital Twin events.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Pump Maintenance"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="trigger-type" className="text-right">
                Event
              </Label>
              <div className="col-span-3">
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creation">Asset Created</SelectItem>
                    <SelectItem value="state_change">State Change</SelectItem>
                    <SelectItem value="attribute_change">Attribute Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="asset-type" className="text-right">
                Asset Type
              </Label>
              <Input
                id="asset-type"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Pump, Sensor (Optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="template-id" className="text-right">
                Template ID
              </Label>
              <Input
                id="template-id"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="col-span-3"
                placeholder="UUID of Document Template"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
