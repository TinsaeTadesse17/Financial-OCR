"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Clock, CheckCircle, XCircle, Eye, RefreshCw } from "lucide-react"
import { apiService } from "@/lib/api"
import Link from "next/link"

interface Document {
  id: string
  task_id: string
  filename: string
  upload_timestamp: string
  status: "uploading" | "queued" | "processing" | "completed" | "failed"
  error_message?: string
  result?: {
    success: boolean
    document_type: string
    parsed_document: Array<{
      Date: string
      Name: string
      Amount: string
    }>
  }
}

export function ProcessingQueue() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchDocuments = async () => {
    try {
      const data = await apiService.getDocuments()
      setDocuments(data)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents")
    } finally {
      setLoading(false)
    }
  }

  const pollTaskStatus = async (document: Document) => {
    if (document.status === "completed" || document.status === "failed") {
      return document
    }

    try {
      const taskStatus = await apiService.getTaskStatus(document.task_id)
      return {
        ...document,
        status: taskStatus.status,
        result: taskStatus.result,
      }
    } catch (err) {
      console.error(`Failed to poll status for task ${document.task_id}:`, err)
      return document
    }
  }

  useEffect(() => {
    fetchDocuments()

    // Poll for status updates every 5 seconds
    const interval = setInterval(async () => {
      if (documents.length > 0) {
        const updatedDocuments = await Promise.all(documents.map((doc) => pollTaskStatus(doc)))
        setDocuments(updatedDocuments)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [documents.length])

  const getStatusIcon = (status: Document["status"]) => {
    switch (status) {
      case "uploading":
      case "queued":
        return <Clock className="h-4 w-4" />
      case "processing":
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: Document["status"]) => {
    switch (status) {
      case "uploading":
      case "queued":
        return "secondary"
      case "processing":
        return "default"
      case "completed":
        return "default"
      case "failed":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getItemCount = (document: Document) => {
    if (document.result?.parsed_document) {
      return document.result.parsed_document.length
    }
    return 0
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Processing Queue</CardTitle>
          <CardDescription>Track the status of your uploaded documents</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDocuments}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No documents uploaded yet</p>
            <p className="text-muted-foreground">Upload your first document to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">{doc.filename}</h3>
                    <p className="text-sm text-muted-foreground">
                      Uploaded {formatDate(doc.upload_timestamp)}
                      {doc.task_id && (
                        <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">Task: {doc.task_id}</span>
                      )}
                    </p>
                    {doc.error_message && <p className="text-sm text-destructive mt-1">{doc.error_message}</p>}
                    {doc.status === "completed" && doc.result?.parsed_document && (
                      <p className="text-sm text-green-600 mt-1">✓ Extracted {getItemCount(doc)} items</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Badge variant={getStatusColor(doc.status)} className="flex items-center space-x-1">
                    {getStatusIcon(doc.status)}
                    <span className="capitalize">{doc.status}</span>
                  </Badge>

                  {doc.status === "completed" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/results/${doc.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Results
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
