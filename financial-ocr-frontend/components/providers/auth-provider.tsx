"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { apiService } from "@/lib/api"

interface User {
  id: string
  username: string
  email: string
  is_admin: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (token) {
      apiService
        .getCurrentUser()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("auth_token")
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await apiService.login(email, password)
    localStorage.setItem("auth_token", response.access_token)
    const userData = await apiService.getCurrentUser()
    setUser(userData)
  }

  const register = async (username: string, email: string, password: string) => {
    await apiService.register(username, email, password)
    await login(email, password)
  }

  const logout = () => {
    localStorage.removeItem("auth_token")
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
