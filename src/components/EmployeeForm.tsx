'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const formSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  position: z.string().min(1, 'Position is required'),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  managerId: z.string().optional(),
  role: z.enum(['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN']).default('EMPLOYEE'),
})

type EmployeeFormValues = z.infer<typeof formSchema>

interface Employee {
  id: string
  firstName: string
  lastName: string
  position: string
  user: {
    email: string
  }
}

interface EmployeeFormProps {
  onSubmit: (data: EmployeeFormValues) => Promise<void>
  isLoading?: boolean
}

export function EmployeeForm({ onSubmit, isLoading = false }: EmployeeFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<EmployeeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      position: '',
      role: 'EMPLOYEE',
    },
  })

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees')
        if (response.ok) {
          const data = await response.json()
          setEmployees(data)
        }
      } catch (error) {
        console.error('Failed to fetch employees:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEmployees()
  }, [])

  const onFormSubmit = async (data: EmployeeFormValues) => {
    await onSubmit(data)
  }

  const selectedStartDate = watch('startDate')

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            {...register('firstName')}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...register('lastName')}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="john.doe@uptown6october.com"
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          placeholder="••••••"
        />
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="position">Position</Label>
        <Input
          id="position"
          {...register('position')}
          placeholder="Software Developer"
        />
        {errors.position && (
          <p className="text-sm text-red-500 mt-1">{errors.position.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="startDate">Start Date</Label>
        <DatePicker
          value={selectedStartDate}
          onChange={(date) => setValue('startDate', date as Date)}
        />
        {errors.startDate && (
          <p className="text-sm text-red-500 mt-1">{errors.startDate.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <Select onValueChange={(value) => setValue('role', value as any)} defaultValue="EMPLOYEE">
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EMPLOYEE">Employee</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && (
          <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="managerId">Manager (Optional)</Label>
        <Select onValueChange={(value) => setValue('managerId', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a manager" />
          </SelectTrigger>
          <SelectContent>
            {loading ? (
              <SelectItem value="loading" disabled>Loading managers...</SelectItem>
            ) : (
              employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} ({employee.user.email})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.managerId && (
          <p className="text-sm text-red-500 mt-1">{errors.managerId.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Employee'}
      </Button>
    </form>
  )
}