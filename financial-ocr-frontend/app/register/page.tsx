"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Eye, EyeOff, FileText, Check, X } from "lucide-react"

export default function RegisterPage() {
  const [username, setUsername] = useState("testuser")
  const [email, setEmail] = useState("test@example.com")
  const [password, setPassword] = useState("TestPassword123!")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  const getPasswordStrength = (password: string) => {
    let strength = 0
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }

    Object.values(checks).forEach((check) => {
      if (check) strength += 20
    })

    return { strength, checks }
  }

  const { strength, checks } = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!username || !email || !password) {
      setError("Please fill in all fields")
      setLoading(false)
      return
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    if (strength < 60) {
      setError("Password is too weak. Please choose a stronger password.")
      setLoading(false)
      return
    }

    try {
      await register(username, email, password)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <FileText className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join Financial OCR Service today</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Progress value={strength} className="flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {strength < 40 ? "Weak" : strength < 80 ? "Good" : "Strong"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className={`flex items-center space-x-1 ${checks.length ? "text-green-600" : "text-red-500"}`}>
                      {checks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      <span>8+ characters</span>
                    </div>
                    <div
                      className={`flex items-center space-x-1 ${checks.uppercase ? "text-green-600" : "text-red-500"}`}
                    >
                      {checks.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      <span>Uppercase</span>
                    </div>
                    <div
                      className={`flex items-center space-x-1 ${checks.lowercase ? "text-green-600" : "text-red-500"}`}
                    >
                      {checks.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      <span>Lowercase</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${checks.number ? "text-green-600" : "text-red-500"}`}>
                      {checks.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      <span>Number</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </form>
        <div className="px-6 pb-6">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Pre-filled Test Data:</p>
            <p className="text-xs text-muted-foreground">Username: testuser</p>
            <p className="text-xs text-muted-foreground">Email: test@example.com</p>
            <p className="text-xs text-muted-foreground">Password: TestPassword123!</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
