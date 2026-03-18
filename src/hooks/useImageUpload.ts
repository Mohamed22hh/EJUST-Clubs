import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

interface UseImageUploadOptions {
  bucket?: string
  maxSizeMB?: number
}

interface UseImageUploadResult {
  file: File | null
  preview: string | null
  uploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  setFile: (f: File) => void
  removeFile: () => void
  upload: (path: string) => Promise<string | null>
  reset: () => void
}

export function useImageUpload({ bucket = 'club-assets', maxSizeMB = 5 }: UseImageUploadOptions = {}): UseImageUploadResult {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > maxSizeMB * 1024 * 1024) {
      toast(`Image must be under ${maxSizeMB}MB`, 'error')
      return
    }
    if (!f.type.startsWith('image/')) {
      toast('Please select an image file', 'error')
      return
    }
    // Revoke previous object URL to prevent memory leak
    setPreview(prev => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
    setFile(f)
  }

  const removeFile = () => {
    setPreview(prev => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const upload = async (path: string): Promise<string | null> => {
    if (!file) return null
    setUploading(true)
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    setUploading(false)
    if (error) { toast('Failed to upload image', 'error'); return null }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  const reset = () => {
    setPreview(prev => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Convenience method: accept a File directly (used by ImageUploadField.onFile)
  const setFileDirectly = (f: File) => {
    if (f.size > maxSizeMB * 1024 * 1024) {
      toast(`Image must be under ${maxSizeMB}MB`, 'error')
      return
    }
    if (!f.type.startsWith('image/')) {
      toast('Please select an image file', 'error')
      return
    }
    setPreview(prev => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
    setFile(f)
  }

  return { file, preview, uploading, fileInputRef, handleFileChange, setFile: setFileDirectly, removeFile, upload, reset }
}
