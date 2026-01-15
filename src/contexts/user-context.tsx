"use client"

import { getAvatar } from "@/lib/tiptap-collab-utils"
import { useUser as useClerkUser } from "@clerk/nextjs"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type User = {
  id: string
  name: string
  color: string
  avatar: string
}

export type UserContextValue = {
  user: User
}

export const UserContext = createContext<UserContextValue>({
  user: { color: "", id: "", name: "", avatar: "" },
})

export const USER_COLORS = [
  "#fb7185",
  "#fdba74",
  "#d9f99d",
  "#a7f3d0",
  "#a5f3fc",
  "#a5b4fc",
  "#f0abfc",
  "#fda58d",
  "#f2cc8f",
  "#9ae6b4",
]

// Generate a consistent color from user ID
const getColorFromUserId = (userId: string): string => {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }
  const index = Math.abs(hash) % USER_COLORS.length
  return USER_COLORS[index] ?? "#9ae6b4"
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useClerkUser()
  
  const user = useMemo<User>(() => {
    if (!isLoaded || !clerkUser) {
      // Return placeholder while loading
      return {
        id: "",
        name: "Loading...",
        color: "#9ae6b4",
        avatar: "",
      }
    }
    
    const name = clerkUser.fullName || clerkUser.username || clerkUser.firstName || "Anonymous"
    const id = clerkUser.id
    
    return {
      id,
      name,
      color: getColorFromUserId(id),
      avatar: clerkUser.imageUrl || getAvatar(name),
    }
  }, [clerkUser, isLoaded])

  return (
    <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
  )
}

export const useTiptapUser = () => useContext(UserContext)
