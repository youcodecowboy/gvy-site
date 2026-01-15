'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function useNodes(orgId?: string) {
  const nodes = useQuery(api.nodes.list, { orgId })
  return nodes ?? []
}

export function usePersonalNodes() {
  const nodes = useQuery(api.nodes.listPersonal)
  return nodes ?? []
}

export function useOrganizationNodes(orgId: string | undefined) {
  const nodes = useQuery(api.nodes.listOrganization, orgId ? { orgId } : 'skip')
  return nodes ?? []
}

export function useNode(id: Id<'nodes'> | undefined) {
  const node = useQuery(api.nodes.get, id ? { id } : 'skip')
  return node
}

export function useCreateNode() {
  return useMutation(api.nodes.create)
}

export function useUpdateTitle() {
  return useMutation(api.nodes.updateTitle)
}

export function useUpdateContent() {
  return useMutation(api.nodes.updateContent)
}

export function useUpdateTags() {
  return useMutation(api.nodes.updateTags)
}

export function useUpdateStatus() {
  return useMutation(api.nodes.updateStatus)
}

export function useUpdateIcon() {
  return useMutation(api.nodes.updateIcon)
}

export function useRemoveNode() {
  return useMutation(api.nodes.remove)
}

export function useMoveNode() {
  return useMutation(api.nodes.move)
}

export function useReorderNode() {
  return useMutation(api.nodes.reorder)
}

export function useToggleSharing() {
  return useMutation(api.nodes.toggleSharing)
}
