"use client"

import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label"
import { useEffect, useRef, useState } from "react";
import { ShortFileProp } from "@/lib/types";
import { createPresignedUrlToUpload } from "@/actions/s3";
import { uploadToS3 } from "@/lib/utils";
import { nanoid } from "nanoid";
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { X } from "lucide-react"


export default function Home() {


  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploaded, setUploaded] = useState(false)
  const [progress, setProgress] = useState(10)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [files, setFiles] = useState<{ name: string, size: string, src: string }[]>([])


  useEffect(() => {
    if (uploadedCount === 0) {
      setProgress(0)
    }
    else if (uploadedCount === files.length || uploaded) {
      setProgress(100)
    }
    else {
      setProgress(Math.round((uploadedCount / files.length) * 100))
    }
  }, [uploadedCount, files])

  async function uploadToServer(event: React.FormEvent<HTMLFormElement>) {

    event.preventDefault()
    if (!fileInputRef?.current?.files) {
      return
    }

    // get File[] from FileList
    const inputFiles = Object.values(fileInputRef?.current?.files)
    // validate files
    const filesInfo: ShortFileProp[] = inputFiles.map((file) => ({
      id: nanoid(5),
      originalFileName: file.name,
      fileSize: file.size,
    }))

    const presignedUrls = await createPresignedUrlToUpload(filesInfo)

    presignedUrls.forEach(async (presignedUrl) => {
      const file = inputFiles.find(
        (file) => file.name === presignedUrl.originalFileName && file.size === presignedUrl.fileSize
      )
      if (!file) {
        throw new Error('File not found')
      }
      if (!files.some(f => f.name === file.name)) {
        return
      }

      await uploadToS3(presignedUrl, file)
      setUploadedCount(c => c + 1)
      setFiles(p => p.filter(f => f.name !== file?.name))
      await new Promise(r => setTimeout(r, 1000))
    })
    toast('Yükleme başarılı')
    setUploaded(true)
    setProgress(100)
  }

  async function onFileChange() {
    const files = fileInputRef.current?.files
    if (!files) {
      setFiles([])
      return
    }
    setFiles(Array.from(files).map((file) => {
      return {
        name: file.name,
        size: humanFileSize(file.size),
        src: URL.createObjectURL(file)
      }
    }))
    setProgress(0)
    setUploadedCount(0)
  }
  async function onRemoveFile(name: string) {
    const file = files.find(f => f.name === name)
    if (!file) {
      return
    }
    setFiles(p => p.filter(f => f.name !== file.name))
    setProgress(0)
    setUploadedCount(0)
  }

  return (
    <main className="flex flex-col justify-center items-center md:py-10 font-[family-name:var(--font-geist-sans)] w-full gap-8">
      <form className='flex justify-between items-center gap-3 w-full' onSubmit={uploadToServer}>
        <input
          id="file-upload"
          type="file"
          accept="image/*,video/*,audio/*"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={onFileChange} />
        {uploaded ?
          <>
            <a className={`${buttonVariants({ variant: 'default', size: 'lg' })} w-2/3`} >Yüklenenlere göz at</a>
            <Button variant={'secondary'} type='button' className='w-1/3' onClick={() => {
              setUploaded(false)
              setUploadedCount(0)
              setProgress(0)
            }}>Tekrar Yükle</Button>
          </>
          :
          (
            files.length > 0 ?
              (<>
                <Button type='submit' className='w-2/3'>Yükle</Button>
                <Label
                  htmlFor="file-upload"
                  className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} w-1/3`} >
                  Tekrar seçin
                </Label>
              </>)
              :
              (<Label
                htmlFor="file-upload"
                className={`${buttonVariants({ variant: 'default', size: 'lg' })} w-full`} >
                Dosyalarınızı seçin
              </Label>)
          )}

      </form>

      {(files.length > 0 || uploaded) ?
        <Progress value={progress} />
        : null}
      <div className="flex flex-wrap gap-12">
        {files.map((file, index) => (
          <div key={index} className='flex items-start gap-2 relative w-52 h-52 rounded-lg'>
            <img src={file.src} alt={file.name} className='w-52 h-52 rounded-lg overflow-hidden object-cover z-0' />
            <div className='absolute top-0 left-0 right-0 bottom-0 bg-black/20 z-10'></div>
            <Label className="absolute bottom-1 right-1 text-sm text-primary bg-primary-foreground p-1 rounded z-20">{file.size}</Label>
            <Label className='absolute bottom-1 left-1 text-sm text-primary bg-primary-foreground p-1 rounded hidden sm:absolute sm:block max-w-32 overflow-hidden whitespace-nowrap text-ellipsis z-20'>{file.name}</Label>
            <Button
              variant={'secondary'}
              type='button'
              onClick={() => onRemoveFile(file.name)}
              className='absolute top-1 right-1 text-sm text-primary bg-primary-foreground p-1 rounded-full z-20'
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}


function humanFileSize(size: number) {
  var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return +((size / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
}