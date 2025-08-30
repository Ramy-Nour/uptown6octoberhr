"use client" 
 
import { useState } from "react" 
import { useRouter } from "next/navigation" 
import { Button } from "@/components/ui/button" 
import { Input } from "@/components/ui/input" 
import { Label } from "@/components/ui/label" 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card" 
import { Loader2 } from "lucide-react" 
 
export default function LoginPage() { 
  const [email, setEmail] = useState("") 
  const [password, setPassword] = useState("") 
  const [error, setError] = useState("") 
  const [isLoading, setIsLoading] = useState(false) 
  const router = useRouter() 
 
  const handleSubmit = async (e: React.FormEvent) =
    e.preventDefault() 
    setIsLoading(true) 
    setError("") 
 
    try { 
      const response = await fetch("/api/auth/login", { 
        method: "POST", 
        headers: { 
          "Content-Type": "application/json", 
        }, 
        body: JSON.stringify({ email, password }), 
      }) 
 
      const data = await response.json() 
 
      if (response.ok) { 
        localStorage.setItem("token", data.token) 
        localStorage.setItem("user", JSON.stringify(data.user)) 
        router.push("/") 
      } else { 
      } 
    } catch (err) { 
      setError("An error occurred. Please try again.") 
    } finally { 
      setIsLoading(false) 
    } 
  } 
 
  return ( 
            Enter your credentials to access the leave management system 
                id="email" 
                type="email" 
                placeholder="Enter your email" 
                value={email} 
                onChange={(e) =
                required 
                id="password" 
                type="password" 
                placeholder="Enter your password" 
                value={password} 
                onChange={(e) =
                required 
              {isLoading ? "Signing in..." : "Sign in"} 
  ) 
} 
