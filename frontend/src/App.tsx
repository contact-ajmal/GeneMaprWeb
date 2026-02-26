import { useState } from 'react'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setMessage('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first')
      return
    }

    setUploading(true)
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/variants/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Success: ${data.message}`)
        setFile(null)
        const fileInput = document.getElementById('file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setMessage(`Error: ${data.detail || 'Upload failed'}`)
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Upload failed'}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">GeneMapr</h1>
          <p className="text-gray-600 mt-2">Genomic Variant Interpretation Platform</p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
          <h2 className="text-2xl font-semibold mb-4">Upload VCF File</h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="file-input"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select VCF File (.vcf or .vcf.gz)
              </label>
              <input
                id="file-input"
                type="file"
                accept=".vcf,.vcf.gz"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer"
              />
            </div>

            {file && (
              <div className="text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md
                hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                font-medium transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload and Parse'}
            </button>

            {message && (
              <div
                className={`p-4 rounded-md ${
                  message.startsWith('Success')
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
