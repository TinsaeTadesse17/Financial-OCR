"use client"

import type React from "react"

import { useCallback } from "react"

export interface DropzoneOptions {
  onDrop: (acceptedFiles: File[]) => void
  accept?: Record<string, string[]>
  multiple?: boolean
}

export function useDropzone({ onDrop, accept, multiple = true }: DropzoneOptions) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)

      if (accept) {
        const acceptedFiles = files.filter((file) => {
          return Object.keys(accept).some((mimeType) => {
            if (mimeType === "image/*") {
              return file.type.startsWith("image/")
            }
            return file.type === mimeType
          })
        })
        onDrop(acceptedFiles)
      } else {
        onDrop(files)
      }
    },
    [onDrop, accept],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleClick = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = multiple

    if (accept) {
      const acceptString = Object.entries(accept)
        .flatMap(([mimeType, extensions]) => [mimeType, ...extensions])
        .join(",")
      input.accept = acceptString
    }

    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      onDrop(files)
    }

    input.click()
  }, [onDrop, accept, multiple])

  return {
    getRootProps: () => ({
      onDrop: handleDrop,
      onDragOver: handleDragOver,
      onClick: handleClick,
    }),
    getInputProps: () => ({
      type: "file" as const,
      style: { display: "none" },
    }),
    isDragActive: false, // Simplified for this implementation
  }
}
