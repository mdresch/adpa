"use client";
import React from "react"
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react"
import { EntityPill } from "@/components/documents/EntityPill"

export function EntityPillNodeView(props: NodeViewProps) {
  const { node } = props
  const entityType = node.attrs.entityType || "unknown"
  const jsonStr = node.attrs.jsonStr || "{}"
  
  let entityData = {}
  try {
    entityData = JSON.parse(jsonStr)
  } catch (e) {
    console.warn("Failed to parse Entity Pill JSON in NodeView:", e)
  }

  return (
    <NodeViewWrapper className="inline-block" data-drag-handle>
      <EntityPill type={entityType} data={entityData} />
    </NodeViewWrapper>
  )
}
