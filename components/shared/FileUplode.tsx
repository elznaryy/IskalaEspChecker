'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {  Upload } from 'lucide-react'

interface FileUploadProps {
  onFileSelect: (file: File | null) => void
  disabled?: boolean
  accept?: string
  maxSize?: number
}

export function FileUpload({
  onFileSelect,
  disabled = false,
  accept = '.csv',
  maxSize = 10 * 1024 * 1024, // 10MB default
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)

    if (!file) {
      onFileSelect(null)
      return
    }

    // Validate file type
    if (!file.type.includes('csv')) {
      setError('Please select a valid CSV file')
      onFileSelect(null)
      return
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSize / (1024 * 1024)}MB`)
      onFileSelect(null)
      return
    }

    onFileSelect(file)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file-upload" className="flex items-center space-x-2 text-[#1F2937] font-medium">
          <Upload className="h-3 w-3" />
          <span>Upload CSV File</span>
        </Label>
        <Input
          id="file-upload"
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled}
          className="cursor-pointer 
            file:mr-3
            file:py-1
            file:px-2.5
            file:rounded-full
            file:border-0
            file:text-xs
            file:font-semibold
            file:bg-[#3B82F6]
            file:text-white
            hover:file:bg-[#2563EB]
            text-xs"
        />
        <p className="text-sm text-[#1F2937]">
          Maximum file size: {maxSize / (1024 * 1024)}MB
        </p>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
      
     
    </div>
  )
}