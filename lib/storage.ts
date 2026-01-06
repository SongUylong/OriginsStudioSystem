import {
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3 = new S3Client({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  region: "auto",
});

export const getUploadSignedUrl = async (
  key: string,
  contentType: string
): Promise<{ signedUrl: string; privateUrl: string }> => {
  // Generate a signed PUT URL valid for 7 days
  const signedUrl = await getSignedUrl(
    S3,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
    }
  );

  // Return the signed URL for uploading and the private URL to access the file via your API
  const privateUrl = `/api/private-image?key=${encodeURIComponent(key)}`;

  return {
    signedUrl,
    privateUrl,
  };
};

export const getPrivateFileSignedUrl = async (key: string): Promise<string> => {
  // Generate a signed GET URL valid for 5 minutes to allow temporary direct access
  const signedUrl = await getSignedUrl(
    S3,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }),
    {
      expiresIn: 300, // 5 minutes
    }
  );

  return signedUrl;
};

export const deleteFile = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });

  await S3.send(command);
};
