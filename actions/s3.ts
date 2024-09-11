"use server"

import { PresignedUrlProp, ShortFileProp } from '@/lib/types';
import * as Minio from 'minio'
import { nanoid } from 'nanoid';
import type internal from 'stream'
const env = process.env
const event = new Date();
const datestr = event.toLocaleDateString('tr-TR', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

const bucketName = datestr.replaceAll(/\./g, '-')

// Create a new Minio client with the S3 endpoint, access key, and secret key
const s3Client = new Minio.Client({
  endPoint: env.S3_ENDPOINT ?? '',
  port: env.S3_PORT ? Number(env.S3_PORT) : undefined,
  accessKey: env.S3_ACCESS_KEY ?? '',
  secretKey: env.S3_SECRET_KEY ?? '',
  useSSL: env.S3_USE_SSL === 'true',
})

export async function createBucketIfNotExists() {

  const bucketExists = await s3Client.bucketExists(bucketName)
  if (!bucketExists) {
    await s3Client.makeBucket(bucketName)
  }
}

/**
 * Generate presigned urls for uploading files to S3
 * @param files files to upload
 * @returns promise with array of presigned urls
 */
export async function createPresignedUrlToUpload(files: ShortFileProp[]) {

  const presignedUrls = [] as PresignedUrlProp[]
  if (!files || files.length == 0) {
    return presignedUrls
  }
  // Create bucket if it doesn't exist
  await createBucketIfNotExists()

  if (files?.length) {
    // use Promise.all to get all the presigned urls in parallel
    await Promise.all(
      // loop through the files
      files.map(async (file) => {
        const fileName = `${file.id}-${file?.originalFileName}`
        const url = await s3Client.presignedPutObject(bucketName, fileName, 60 * 60)
        // get presigned url using s3 sdk
        // const url = await createPresignedUrlToUpload({
        //   bucketName,
        //   fileName,
        //   expiry,
        // })

        // add presigned url to the list
        presignedUrls.push({
          fileNameInBucket: fileName,
          originalFileName: file.originalFileName,
          fileSize: file.fileSize,
          url,
          id: file.id,
        })
      })
    )
  }
  // console.log('files', files, presignedUrls);

  return presignedUrls
}

/**
 * Save file in S3 bucket
 * @param bucketName name of the bucket
 * @param fileName name of the file
 * @param file file to save
 */
export async function saveFileInBucket({
  fileName,
  file,
}: {
  fileName: string
  file: Buffer | internal.Readable
}) {
  // Create bucket if it doesn't exist
  await createBucketIfNotExists()

  // check if file exists - optional.
  // Without this check, the file will be overwritten if it exists
  const fileExists = await checkFileExistsInBucket({
    bucketName,
    fileName,
  })

  if (fileExists) {
    throw new Error('File already exists')
  }

  // Upload image to S3 bucket
  await s3Client.putObject(bucketName, fileName, file)
}

/**
 * Check if file exists in bucket
 * @param bucketName name of the bucket
 * @param fileName name of the file
 * @returns true if file exists, false if not
 */
export async function checkFileExistsInBucket({ fileName }: { bucketName: string; fileName: string }) {
  try {
    await s3Client.statObject(bucketName, fileName)
  } catch (error) {
    return false
  }
  return true
}

export async function getBucketList() {
  try {
    const buckets = await s3Client.listBuckets()
    console.log('Success', buckets)
    return buckets
  } catch (err) {
    console.log(err)
  }
  return []
}