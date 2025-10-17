import { useState, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Upload, Download, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface CSVImporterProps {
  onImportComplete: () => void
}

export default function CSVImporter({ onImportComplete }: CSVImporterProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [importResult, setImportResult] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('请选择CSV格式的文件')
      return
    }

    setFile(selectedFile)
    setImportResult(null)
    
    // 读取文件预览
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        toast.error('CSV文件格式不正确或为空')
        return
      }

      // 解析前5行作为预览
      const headers = parseCSVLine(lines[0])
      const previewData = lines.slice(1, 6).map(line => {
        const values = parseCSVLine(line)
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || ''
          return obj
        }, {} as any)
      })

      setPreview(previewData)
    }
    reader.readAsText(selectedFile)
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('请先选择文件')
      return
    }

    setImporting(true)

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          toast.error('CSV文件没有数据')
          setImporting(false)
          return
        }

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase())
        
        // 验证必需字段
        const requiredFields = ['name', 'email', 'department', 'position']
        const missingFields = requiredFields.filter(field => !headers.includes(field))
        
        if (missingFields.length > 0) {
          toast.error(`CSV缺少必需字段: ${missingFields.join(', ')}`)
          setImporting(false)
          return
        }

        // 解析所有数据
        const recipients = lines.slice(1).map(line => {
          const values = parseCSVLine(line)
          const recipient: any = {}
          
          headers.forEach((header, index) => {
            recipient[header] = values[index] || ''
          })
          
          return {
            name: recipient.name,
            email: recipient.email,
            department: recipient.department,
            position: recipient.position,
            phone: recipient.phone || null,
          }
        }).filter(r => r.name && r.email) // 过滤掉空行

        // 批量导入
        const result = await apiClient.bulkImportRecipients(recipients)
        
        setImportResult({
          success: result.created_count || 0,
          failed: result.errors?.length || 0,
          errors: result.errors || []
        })

        if (result.created_count > 0) {
          toast.success(`成功导入 ${result.created_count} 个收件人`)
          onImportComplete()
        }

        if (result.errors?.length > 0) {
          toast.error(`${result.errors.length} 条记录导入失败`)
        }
      }

      reader.readAsText(file)
    } catch (error) {
      toast.error('导入失败')
      console.error(error)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = `name,email,department,position,phone
张三,zhangsan@company.com,IT部,软件工程师,13800138001
李四,lisi@company.com,财务部,会计师,13800138002
王五,wangwu@company.com,人事部,HR专员,13800138003`

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'recipients_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('模板已下载')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          CSV批量导入
        </CardTitle>
        <CardDescription>
          从CSV文件批量导入收件人信息
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={downloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            下载CSV模板
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="h-4 w-4 mr-2" />
            选择CSV文件
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {file && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
              <p className="text-sm font-medium">
                已选择: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            </div>

            {preview.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">数据预览（前5条）:</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border dark:border-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        {Object.keys(preview[0]).map(key => (
                          <th key={key} className="px-3 py-2 text-left font-medium">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, index) => (
                        <tr key={index} className="border-t dark:border-gray-700">
                          {Object.values(row).map((value: any, i) => (
                            <td key={i} className="px-3 py-2">
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={importing}
              className="w-full"
            >
              {importing ? '导入中...' : '开始导入'}
            </Button>
          </div>
        )}

        {importResult && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>成功导入: {importResult.success} 条</span>
            </div>
            {importResult.failed > 0 && (
              <>
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span>失败: {importResult.failed} 条</span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          错误详情:
                        </p>
                        <ul className="text-xs text-red-700 dark:text-red-300 mt-1 space-y-1">
                          {importResult.errors.slice(0, 5).map((error, i) => (
                            <li key={i}>• {error}</li>
                          ))}
                          {importResult.errors.length > 5 && (
                            <li>...还有 {importResult.errors.length - 5} 个错误</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>CSV格式说明：</strong>
          </p>
          <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-1">
            <li>• 第一行必须包含列名: name, email, department, position, phone</li>
            <li>• name, email, department, position 为必填字段</li>
            <li>• phone 为可选字段</li>
            <li>• 邮箱地址不能重复</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

