import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { PresignedUrlProp, ShortFileProp } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Uploads file to S3 directly using presigned url
 * @param presignedUrl presigned url for uploading
 * @param file  file to upload
 * @returns  response from S3
 */
export async function uploadToS3(presignedUrl: PresignedUrlProp, file: File) {
  const response = await fetch(presignedUrl.url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
      'Access-Control-Allow-Origin': '*',
    },
  })
  return response
}

