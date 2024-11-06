'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Sun, Moon,  Download } from 'lucide-react'
import { FileUpload } from "@/components/shared/FileUplode"



interface ColumnOption {
  index: number
  header: string
}

const providerOptions = [
  { id: 'Google', label: 'Google' },
  { id: 'Outlook', label: 'Outlook' },
  { id: 'GoogleAndOthers', label: 'Google & Others' },
  { id: 'OthersOnly', label: 'Others Only' },
  { id: 'All', label: 'All but categorized' },
]

export default function Component() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string>('')
  const [downloadLink, setDownloadLink] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState<ColumnOption[]>([])
  const [selectedDomainColumn, setSelectedDomainColumn] = useState<string>('')
  const [selectedResultColumn, setSelectedResultColumn] = useState<string>('')
  const [showColumnSelection, setShowColumnSelection] = useState(false)

  useEffect(() => {
    if (file) {
      handleFileUpload()
    }
  }, [file])

  const handleFileUpload = async () => {
    if (file && file.type === 'text/csv') {
      setStatus('')
      setProgress(0)
      
      const text = await file.text()
      const firstLine = text.split('\n')[0]
      const headers = firstLine.split(',').map((header, index) => ({
        index,
        header: header.trim()
      }))
      
      setCsvHeaders(headers)
      setShowColumnSelection(true)
      setSelectedProviders([])
    } else {
      setFile(null)
      setStatus('Please select a valid CSV file.')
    }
  }

  const handleColumnSelection = () => {
    if (selectedDomainColumn === selectedResultColumn) {
      setStatus('Please select different columns for domain and result')
      return
    }
    setStatus('')
    setShowColumnSelection(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file || !selectedDomainColumn || !selectedResultColumn) {
      setStatus('Please select all required fields.')
      return
    }

    setStatus('Processing...')
    setIsProcessing(true)
    setProgress(0)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('providers', JSON.stringify(selectedProviders))
    formData.append('domainColumn', selectedDomainColumn)
    formData.append('resultColumn', selectedResultColumn)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (data.success && data.fileUrl) {
        setStatus('File processed successfully!')
        setDownloadLink(data.fileUrl)
      } else {
        setStatus(`Failed to process file: ${data.message || 'Unknown error'}`)
      }
    } catch (error) {
      setStatus(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
      setProgress(100)
    }
  }

  const resetState = () => {
    setFile(null)
    setStatus('')
    setDownloadLink(null)
    setIsProcessing(false)
    setProgress(0)
    setSelectedProviders([])
    setCsvHeaders([])
    setShowColumnSelection(false)
    setSelectedDomainColumn('')
    setSelectedResultColumn('')
    
    const fileInput = document.getElementById('csvFile') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  return (
  
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow flex flex-col items-center justify-center p-8 bg-[#F3F4F6] relative">
        <div className="absolute inset-0 bg-[url('/scribble.svg')] bg-center opacity-10" />

        <div className="relative z-10 w-full max-w-md">
          <Card className="w-full max-w-md bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_2px_4px_-1px_rgba(0,0,0,0.06)]">
            <CardHeader className="space-y-1">
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-bold text-[#1F2937]">
                  Iskala ESP Checker
                </CardTitle>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={setIsDarkMode}
                  className="ml-4"
                >
                  <span className="sr-only">Toggle dark mode</span>
                  {isDarkMode ? 
                    <Moon className="h-4 w-4" /> : 
                    <Sun className="h-4 w-4" />
                  }
                </Switch>
              </div>
              <p className="text-sm text-[#1F2937]">
                Upload your CSV file to check ESP status
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-700 p-4 transition-colors hover:border-blue-300 dark:hover:border-blue-600">
                  <FileUpload
                    onFileSelect={setFile}
                    disabled={isProcessing}
                    accept=".csv"
                    maxSize={10 * 1024 * 1024}
                  />
                </div>

                {showColumnSelection && csvHeaders.length > 0 && (
                  <div className="space-y-4 animate-in fade-in-50">
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">Select Domain Column</Label>
                      <Select onValueChange={setSelectedDomainColumn} value={selectedDomainColumn}>
                        <SelectTrigger className="bg-[#F9FAFB] border-[#D1D5DB] text-[#1F2937] hover:border-[#3B82F6]">
                          <SelectValue placeholder="Select domain column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#E5E7EB]">
                          {csvHeaders.map((column) => (
                            <SelectItem 
                              key={column.index} 
                              value={column.index.toString()}
                              className="hover:bg-[#F3F4F6] text-[#1F2937]"
                            >
                              {column.header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">Select Result Column</Label>
                      <Select onValueChange={setSelectedResultColumn} value={selectedResultColumn}>
                        <SelectTrigger className="bg-[#F9FAFB] border-[#D1D5DB] text-[#1F2937] hover:border-[#3B82F6]">
                          <SelectValue placeholder="Select result column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#E5E7EB]">
                          {csvHeaders.map((column) => (
                            <SelectItem 
                              key={column.index} 
                              value={column.index.toString()}
                              className="hover:bg-[#F3F4F6] text-[#1F2937]"
                            >
                              {column.header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={handleColumnSelection} 
                      className="w-full bg-[#3B82F6] text-white hover:bg-[#2563EB] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_2px_4px_-1px_rgba(0,0,0,0.06)]"
                    >
                      Confirm Columns
                    </Button>
                  </div>
                )}

                {!showColumnSelection && (
                  <div className="space-y-3 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                    <Label className="text-[#1F2937]">Select ESP Provider:</Label>
                    {providerOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2 hover:bg-[#F3F4F6] p-2 rounded-md">
                        <Checkbox
                          id={option.id}
                          checked={selectedProviders.includes(option.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProviders([option.id]);
                            } else {
                              setSelectedProviders([]);
                            }
                          }}
                          className="border-[#D1D5DB] text-[#3B82F6]"
                        />
                        <Label htmlFor={option.id} className="text-[#6B7280] cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={isProcessing || !file || selectedProviders.length === 0}
                >
                  {isProcessing ? 'Processing...' : 'Process File'}
                </Button>

                <Button
                  onClick={resetState}
                  className="w-full mt-2"
                  variant="outline"
                >
                  Reset Form
                </Button>

                {isProcessing && (
                  <div className="space-y-2">
                    <Progress 
                      value={progress} 
                      className="h-2 bg-[#F3F4F6]"
                      style={{ backgroundColor: '#3B82F6' }}
                    />
                    <p className="text-center text-sm text-blue-600 dark:text-blue-300">
                      {Math.round(progress)}% Complete
                    </p>
                  </div>
                )}

                {status && (
                  <p className={`text-center text-sm ${
                    status.includes('success') 
                      ? 'text-[#10B981]' 
                      : status.includes('error') 
                      ? 'text-[#EF4444]' 
                      : 'text-[#6B7280]'
                  }`}>
                    {status}
                  </p>
                )}
                {downloadLink && (
                  <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200">
                    <Link href={downloadLink} download>
                      <Download className="mr-2 h-4 w-4" /> Download Processed File
                    </Link>
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="w-full bg-[#3B82F6] text-white py-4 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <p>© 2024 Iskala ESP Checker</p>
          <div className="flex items-center space-x-4">
            <Link 
              href="https://leadgen.iskala.net/" 
              className="hover:text-[#F3F4F6] transition-colors"
            >
              iskala
            </Link>
            <span>|</span>
            <Link 
              href="https://www.linkedin.com/in/ahmed-elznary-82b66a1b7/" 
              className="hover:text-[#F3F4F6] transition-colors"
            >
              Ahmed Elznary
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}