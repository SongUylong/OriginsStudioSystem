import { type NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/authOptions";
export const dynamic = "force-dynamic";
const S3 = new S3Client({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  region: "auto",
});

export async function GET(request: NextRequest) {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user;

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Missing key parameter" },
        { status: 400 }
      );
    }

    // Allow access for all authenticated users
    // File structure is: private/userId/filename
    const keyParts = key.split("/");

    if (keyParts[0] === "private" && keyParts.length >= 2) {
      const fileUserId = keyParts[1];
    }
    try {
      // Generate a temporary signed URL that expires quickly (5 minutes)
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

      // Return the signed URL instead of streaming the file
      // This is more efficient for Cloudflare R2
      return NextResponse.json({ url: signedUrl });
    } catch (error) {
      console.error("Error generating signed URL:", error);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Private image error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
