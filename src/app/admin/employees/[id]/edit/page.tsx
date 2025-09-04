'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Employee {
  id: string
  firstName: string
  lastName: string
  position: string
  managerId: string | null
  user: {
    id: string
    email: string
    role: string
  }
}

interface Manager {
  id: string
  firstName: string
  lastName: string
  user: {
    email: string
  }
}

export default function EditEmployeePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [managers, setManagers] = useState<Manager[]>([])
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch employee data
        const employeeResponse = await fetch(`/api/employees/${params.id}`)
        if (employeeResponse.ok) {
          const employeeData = await employeeResponse.json()
          setEmployee(employeeData)
        }

        // Fetch managers for dropdown
        const managersResponse = await fetch('/api/employees')
        if (managersResponse.ok) {
          const managersData = await managersResponse.json()
          setManagers(managersData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      role: formData.get('role') as string,
      managerId: formData.get('managerId') as string || null,
    }

    try {
      const response = await fetch(`/api/employees/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/admin/employees')
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to update employee')
      }
    } catch (error) {
      console.error('Error updating employee:', error)
      alert('Failed to update employee')
    } finally {
      setIsLoading(false)
    }
  }

  if (!employee) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Employee</CardTitle>
          <CardDescription>
            Update employee role and manager assignment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={employee.user.email}
                disabled
              />
            </div>

            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={`${employee.firstName} ${employee.lastName}`}
                disabled
              />
            </div>

            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={employee.position}
                disabled
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue={employee.user.role}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="managerId">Manager (Optional)</Label>
              <Select name="managerId" defaultValue={employee.managerId || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Manager</SelectItem>
                  {managers
                    .filter(manager => manager.id !== params.id) // Don't allow self as manager
                    .map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.firstName} {manager.lastName} ({manager.user.email})
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Employee'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}