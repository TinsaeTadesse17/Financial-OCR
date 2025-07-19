"use client"

import { useState, useCallback, useMemo } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, X, FileText, ImageIcon, Loader2 } from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface FileWithPreview extends File {
  preview?: string
}

export function FileUpload() {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) =>
      Object.assign(file, {
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }),
    )
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff"],
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB limit
  })

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 300)

      await apiService.uploadFiles(files)

      clearInterval(progressInterval)
      setUploadProgress(100)

      toast({
        title: "Upload successful",
        description: `${files.length} file(s) uploaded and queued for processing.`,
      })

      // Clear files after success
      files.forEach((file) => file.preview && URL.revokeObjectURL(file.preview))
      setFiles([])
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      })
    } finally {
      setTimeout(() => setUploading(false), 500)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    // Format to 2 decimal places and append unit
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const totalSize = useMemo(() => 
    files.reduce((acc, file) => acc + file.size, 0), 
    [files]
  )

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Upload Documents</CardTitle>
        <CardDescription>
          Upload PDFs and images for AI text extraction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer 
            transition-colors duration-300 group
            ${isDragActive 
              ? "border-primary bg-primary/10" 
              : "border-gray-300 hover:border-primary/50 dark:border-gray-700 dark:hover:border-primary/50"}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <Upload className="h-8 w-8" />
            </div>
            {isDragActive ? (
              <p className="text-lg font-medium text-primary">Drop files here</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-1">Drag & drop files here</p>
                <p className="text-sm text-muted-foreground">
                  Supports PDF, PNG, JPG up to 10MB
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  Browse Files
                </Button>
              </div>
            )}
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">
                Selected Files <span className="text-muted-foreground">({files.length})</span>
              </h3>
              <div className="text-sm text-muted-foreground">
                Total: {formatFileSize(totalSize)}
              </div>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {files.map((file, index) => (
                <div 
                  key={`${file.name}-${index}`} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {file.type === "application/pdf" ? (
                      <div className="p-2 rounded-md bg-red-100 dark:bg-red-900/30">
                        <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                        <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="font-medium text-sm truncate max-w-[180px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="rounded-full h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="pt-2">
              {uploading && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Processing files...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <Button 
                onClick={uploadFiles} 
                disabled={uploading || files.length === 0}
                className="w-full mt-2"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  `Upload ${files.length} File${files.length > 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}