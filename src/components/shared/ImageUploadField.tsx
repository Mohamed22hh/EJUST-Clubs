import { useRef } from 'react'
import { Image as ImageIcon, X, Upload } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

interface ImageUploadFieldProps {
  preview: string | null
  onFile: (file: File) => void
  onRemove: () => void
  label?: string
  required?: boolean
  maxSizeMB?: number
  /** 'banner' = wide image, 'logo' = square */
  variant?: 'banner' | 'logo'
  uploading?: boolean
}

export default function ImageUploadField({
  preview, onFile, onRemove,
  label = 'Image',
  required = false,
  maxSizeMB = 5,
  variant = 'banner',
  uploading = false,
}: ImageUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > maxSizeMB * 1024 * 1024) { toast(`Image must be under ${maxSizeMB}MB`, 'error'); return }
    if (!file.type.startsWith('image/')) { toast('Please select an image file', 'error'); return }
    onFile(file)
  }

  const isLogo = variant === 'logo'

  return (
    <div>
      {label && (
        <label className="label">
          {label} {required && <span className="text-[#C0121F]">*</span>}
        </label>
      )}

      {preview ? (
        <div className={`relative ${isLogo ? 'w-fit' : 'w-full'}`}>
          <img
            src={preview}
            alt="Preview"
            className={
              isLogo
                ? 'w-24 h-24 rounded-2xl object-cover border-2 border-[#C0121F]'
                : 'w-full max-h-52 rounded-xl object-cover border border-[#ebebeb] dark:border-[#252525]'
            }
          />
          {!uploading && (
            <button
              type="button"
              onClick={onRemove}
              className={`absolute ${isLogo ? '-top-2 -right-2 h-6 w-6 bg-[#C0121F]' : 'top-2 right-2 h-7 w-7 bg-black/60 hover:bg-black/80'} rounded-full text-white flex items-center justify-center shadow-md transition-colors`}
            >
              <X size={isLogo ? 12 : 13} />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
              <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`${isLogo ? 'w-32 h-32' : 'w-full h-28'} rounded-xl border-2 border-dashed border-[#e8e8e8] dark:border-[#2a2a2a]
                     flex flex-col items-center justify-center gap-2 text-[#ababab]
                     hover:border-[#C0121F] hover:text-[#C0121F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLogo ? <Upload size={20} /> : <ImageIcon size={22} />}
          <span className="text-xs font-medium">
            {isLogo ? 'Upload logo' : 'Click to upload image'}
            {required && <span className="text-[#C0121F] ml-0.5">*</span>}
          </span>
          <span className="text-[10px]">PNG, JPG up to {maxSizeMB}MB</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  )
}
