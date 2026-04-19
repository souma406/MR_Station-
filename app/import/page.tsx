'use client'

import { useState, useCallback } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Upload, FileText, CheckCircle2, AlertCircle, Info } from 'lucide-react'

interface ImportResult {
  success: boolean
  message: string
  stats?: {
    rowsRead: number
    stationsCreated: number
    stationsUpdated: number
    pricesCreated: number
    pricesUpdated: number
    errors: number
  }
  errors?: string[]
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return
    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: 'Erreur: ' + (error instanceof Error ? error.message : 'Erreur inconnue'),
      })
    } finally {
      setIsUploading(false)
    }
  }, [file])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Import de donnees</h1>
          <p className="text-muted-foreground">Importez les prix depuis un fichier CSV</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-5 w-5 text-primary" />
                Format du fichier CSV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Colonnes requises (separateur: point-virgule ou virgule):
              </p>
              <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <p>id;name;brand;address;city;postal_code;latitude;longitude;gazole_price;sp95_price;sp98_price;e10_price;e85_price;gplc_price</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Importer un fichier
              </CardTitle>
              <CardDescription>Selectionnez un fichier CSV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Input type="file" accept=".csv" onChange={handleFileChange} className="flex-1" />
                <Button onClick={handleUpload} disabled={!file || isUploading} className="min-w-[120px]">
                  {isUploading ? <><Spinner className="h-4 w-4 mr-2" />Import...</> : <><Upload className="h-4 w-4 mr-2" />Importer</>}
                </Button>
              </div>
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </CardContent>
          </Card>

          {result && (
            <Card className={result.success ? 'border-green-500/50' : 'border-red-500/50'}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                  {result.success ? 'Import reussi' : 'Erreur'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{result.message}</p>
                {result.stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">{result.stats.rowsRead}</p>
                      <p className="text-xs text-muted-foreground">Lignes lues</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{result.stats.stationsCreated}</p>
                      <p className="text-xs text-muted-foreground">Stations creees</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">{result.stats.stationsUpdated}</p>
                      <p className="text-xs text-muted-foreground">Stations MAJ</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{result.stats.pricesCreated}</p>
                      <p className="text-xs text-muted-foreground">Prix crees</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">{result.stats.pricesUpdated}</p>
                      <p className="text-xs text-muted-foreground">Prix MAJ</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">{result.stats.errors}</p>
                      <p className="text-xs text-muted-foreground">Erreurs</p>
                    </div>
                  </div>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
                    <p className="font-medium text-red-600 mb-2">Erreurs:</p>
                    <ul className="text-sm text-red-600/80 space-y-1 max-h-40 overflow-y-auto">
                      {result.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>- {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
