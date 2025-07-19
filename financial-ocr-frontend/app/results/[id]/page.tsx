"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Copy, Download, RefreshCw, FileText, Calendar, User, DollarSign } from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ParsedDocumentItem {
  Date: string
  Name: string
  Amount: string
}

interface TaskResult {
  success: boolean
  document_type: "image" | "pdf"
  parsed_document: ParsedDocumentItem[]
}

interface DocumentResult {
  id: string
  task_id: string
  filename: string
  status: string
  result: TaskResult | null
  original_image_url?: string
  upload_timestamp: string
}

export default function ResultsPage() {
  const params = useParams()
  const [doc, setDoc] = useState<DocumentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const data = await apiService.getDocument(params.id as string)
        setDoc(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch document")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchDocument()
    }
  }, [params.id])

  const copyToClipboard = async () => {
    if (doc?.result?.parsed_document) {
      try {
        const textData = doc.result.parsed_document
          .map((item) => `Date: ${item.Date}, Name: ${item.Name}, Amount: ${item.Amount}`)
          .join("\n")

        await navigator.clipboard.writeText(textData)
        toast({
          title: "Copied to clipboard",
          description: "The parsed document data has been copied to your clipboard.",
        })
      } catch (err) {
        toast({
          title: "Failed to copy",
          description: "Could not copy data to clipboard.",
          variant: "destructive",
        })
      }
    }
  }

  const downloadAsText = () => {
    if (doc?.result?.parsed_document) {
      const textData = doc.result.parsed_document
        .map((item) => `Date: ${item.Date}\nName: ${item.Name}\nAmount: ${item.Amount}\n---`)
        .join("\n")

      const blob = new Blob([textData], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement("a")
      a.href = url
      a.download = `${doc.filename}_parsed.txt`
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const downloadAsJson = () => {
    if (doc?.result) {
      const jsonData = {
        filename: doc.filename,
        document_type: doc.result.document_type,
        success: doc.result.success,
        parsed_document: doc.result.parsed_document,
        upload_timestamp: doc.upload_timestamp,
      }
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement("a")
      a.href = url
      a.download = `${doc.filename}_parsed.json`
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const downloadAsCSV = () => {
    if (doc?.result?.parsed_document) {
      const csvHeader = "Date,Name,Amount\n"
      const csvData = doc.result.parsed_document
        .map((item) => `"${item.Date}","${item.Name}","${item.Amount}"`)
        .join("\n")

      const blob = new Blob([csvHeader + csvData], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement("a")
      a.href = url
      a.download = `${doc.filename}_parsed.csv`
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const calculateTotal = () => {
    if (!doc?.result?.parsed_document) return "0.00"
    return doc.result.parsed_document.reduce((total, item) => {
      const raw = (item as any).Amount ?? (item as any).amount
      const num = typeof raw === 'string'
        ? parseFloat(raw.replace(/[$,]/g, "")) || 0
        : typeof raw === 'number'
          ? raw
          : 0
      return total + num
    }, 0).toFixed(2)
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (error || !doc) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Alert variant="destructive">
            <AlertDescription>{error || "Document not found"}</AlertDescription>
          </Alert>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!doc.result || !doc.result.success) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Alert variant="destructive">
            <AlertDescription>
              {doc.status === "failed" ? "Document processing failed" : "Document is still being processed"}
            </AlertDescription>
          </Alert>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Document Results</h1>
              <div className="flex items-center space-x-4 mt-2">
                <p className="text-muted-foreground">{doc.filename}</p>
                <Badge variant="outline">
                  <FileText className="h-3 w-3 mr-1" />
                  {doc.result.document_type.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Data
              </Button>
              <Button variant="outline" onClick={downloadAsText}>
                <Download className="h-4 w-4 mr-2" />
                TXT
              </Button>
              <Button variant="outline" onClick={downloadAsJson}>
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
              <Button variant="outline" onClick={downloadAsCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center p-6">
                <FileText className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{doc.result.parsed_document.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <DollarSign className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">${calculateTotal()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <Calendar className="h-8 w-8 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Range</p>
                  <p className="text-sm font-bold">
                    {doc.result.parsed_document.length > 0
                      ? `${doc.result.parsed_document[0].Date} - ${doc.result.parsed_document[doc.result.parsed_document.length - 1].Date}`
                      : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {doc.original_image_url && (
              <Card>
                <CardHeader>
                  <CardTitle>Original Document</CardTitle>
                  <CardDescription>Preview of the uploaded document</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={doc.original_image_url || "/placeholder.svg"}
                      alt="Original document"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className={doc.original_image_url ? "" : "lg:col-span-2"}>
              <CardHeader>
                <CardTitle>Parsed Financial Data</CardTitle>
                <CardDescription>AI-extracted structured data from your document</CardDescription>
              </CardHeader>
              <CardContent>
                {doc.result.parsed_document.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No data extracted</p>
                    <p className="text-muted-foreground">The document may not contain recognizable financial data</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              Date
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              Name/Description
                            </div>
                          </TableHead>
                          <TableHead className="text-right">
                            <div className="flex items-center justify-end">
                              <DollarSign className="h-4 w-4 mr-2" />
                              Amount
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doc.result.parsed_document.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.Date}</TableCell>
                            <TableCell>{item.Name}</TableCell>
                            <TableCell className="text-right font-mono">{item.Amount}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={2} className="font-medium">
                            Total
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">${calculateTotal()}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
