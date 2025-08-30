"use client" 
 
import { useEffect, useState } from "react" 
import { useRouter } from "next/navigation" 
import { Button } from "@/components/ui/button" 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" 
import { LogOut } from "lucide-react" 
 
interface User { 
  id: string 
  email: string 
  name: string 
  role: string 
} 
 
export default function Dashboard() { 
  const [loading, setLoading] = useState(true) 
  const router = useRouter() 
 
  useEffect(() => { 
    const token = localStorage.getItem("token") 
    const userData = localStorage.getItem("user") 
 
    if (!token || !userData) { 
      router.push("/login") 
      return 
    } 
 
    try { 
      const parsedUser = JSON.parse(userData) 
      setUser(parsedUser) 
    } catch (error) { 
      console.error("Error parsing user data:", error) 
      router.push("/login") 
    } finally { 
      setLoading(false) 
    } 
  }, [router]) 
 
  const handleLogout = () => { 
    localStorage.removeItem("token") 
    localStorage.removeItem("user") 
    router.push("/login") 
  } 
 
  if (loading) { 
    return ( 
      <div className="flex items-center justify-center min-h-screen"> 
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div> 
      </div> 
    ) 
  } 
 
  if (!user) { 
    return null 
  } 
 
  return ( 
    <div className="min-h-screen bg-gray-50"> 
      <header className="bg-white shadow-sm border-b"> 
        <div className="max-w-7xl mx-auto px-4 py-4"> 
          <div className="flex justify-between items-center"> 
            <div> 
              <h1 className="text-2xl font-bold text-gray-900">UPTOWN6OCToberHR</h1> 
              <p className="text-sm text-gray-600">Leave Management System</p> 
            </div> 
            <div className="flex items-center space-x-4"> 
              <div className="text-right"> 
                <p className="text-sm font-medium text-gray-900">{user.name}</p> 
                <p className="text-xs text-gray-500">{user.email}</p> 
              </div> 
              <Button variant="outline" size="sm" onClick={handleLogout}> 
                <LogOut className="h-4 w-4 mr-2" /> 
                Logout 
              </Button> 
            </div> 
          </div> 
        </div> 
      </header> 
      <main className="max-w-7xl mx-auto px-4 py-8"> 
        <div className="mb-8"> 
          <h2 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h2> 
          <p className="text-gray-600 mt-2">Your leave management system is ready.</p> 
        </div> 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
          <Card> 
            <CardHeader> 
              <CardTitle>Request Leave</CardTitle> 
            </CardHeader> 
            <CardContent> 
              <Button className="w-full">Submit New Request</Button> 
            </CardContent> 
          </Card> 
          <Card> 
            <CardHeader> 
              <CardTitle>View Calendar</CardTitle> 
            </CardHeader> 
            <CardContent> 
              <Button variant="outline" className="w-full">View Team Calendar</Button> 
            </CardContent> 
          </Card> 
        </div> 
      </main> 
    </div> 
  ) 
} 
