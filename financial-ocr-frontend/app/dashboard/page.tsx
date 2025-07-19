"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { FileUpload } from "@/components/dashboard/file-upload"
import { ProcessingQueue } from "@/components/dashboard/processing-queue"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Upload and process your financial documents with AI-powered OCR</p>
          </div>

          <FileUpload />
          <ProcessingQueue />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
