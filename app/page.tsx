"use client"

import { Button, buttonVariants } from "@/components/ui/button";
import Image from "next/image";
import { Label } from "@/components/ui/label"
import { useEffect, useRef, useState } from "react";
import { ShortFileProp } from "@/lib/types";
import { createPresignedUrlToUpload } from "@/actions/s3";
import { uploadToS3 } from "@/lib/utils";
import { nanoid } from "nanoid";
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"


export default function Home() {


  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [upladed, setUpladed] = useState(false)
  const [progress, setProgress] = useState(10)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [fileNames, setFileNames] = useState<string[]>([])


  useEffect(() => {
    if (uploadedCount === 0) {
      setProgress(0)
    }
    else if (uploadedCount === fileNames.length) {
      setProgress(100)
    }
    else {
      setProgress(Math.round((uploadedCount / fileNames.length) * 100))
    }
  }, [uploadedCount, fileNames])

  async function uploadToServer(event: React.FormEvent<HTMLFormElement>) {

    event.preventDefault()
    if (!fileInputRef?.current?.files) {
      return
    }

    // get File[] from FileList
    const files = Object.values(fileInputRef?.current?.files)
    // validate files
    const filesInfo: ShortFileProp[] = files.map((file) => ({
      id: nanoid(5),
      originalFileName: file.name,
      fileSize: file.size,
    }))

    const presignedUrls = await createPresignedUrlToUpload(filesInfo)

    presignedUrls.forEach(async (presignedUrl) => {
      const file = files.find(
        (file) => file.name === presignedUrl.originalFileName && file.size === presignedUrl.fileSize
      )
      if (!file) {
        throw new Error('File not found')
      }

      await uploadToS3(presignedUrl, file)
      setUploadedCount(c => c + 1)
      setFileNames(p => p.filter(f => f !== file?.name))
      await new Promise(r => setTimeout(r, 1000))
    })
    toast('Yükleme başarılı')
    setUpladed(true)
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files) {
      setFileNames([])
      return
    }
    setFileNames(Array.from(files).map((file) => file.name))
  }

  return (
    <main className="flex flex-col max-w-md m-auto gap-8 items-center sm:items-start font-[family-name:var(--font-geist-sans)]">
      <form className='flex justify-between items-center gap-3 w-full' onSubmit={uploadToServer}>
        <input
          id="file-upload"
          type="file"
          accept="image/*,video/*,audio/*"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={onFileChange} />
        {upladed ?
          <>
            <a className={`${buttonVariants({ variant: 'default', size: 'lg' })} w-2/3`} >Yüklenenlere göz at</a>
            <Button variant={'secondary'} type='button' className='w-1/3' onClick={() => setUpladed(false)}>Tekrar Yükle</Button>
          </>
          :
          (
            fileNames.length > 0 ?
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

      {fileNames.length > 0 ?
        <Progress value={progress} />
        : null}
      {fileNames.map((fileName, index) => (
        <div key={index} className='flex items-start gap-2'>
          <span>{fileName}</span>
        </div>
      ))}

    </main>
  );
}
