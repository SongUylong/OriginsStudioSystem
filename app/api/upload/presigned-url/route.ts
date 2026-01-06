import { getUploadSignedUrl } from "@/lib/storage";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, contentType, isPrivate, userId } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Filename and content type are required" },
        { status: 400 }
      );
    }

    // For private files, require userId
    if (isPrivate && !userId) {
      return NextResponse.json(
        { error: "User ID required for private uploads" },
        { status: 400 }
      );
    }

    // Generate a unique filename with timestamp
    const timestamp = Date.now();
    const basePath = isPrivate ? `private/${userId}` : "tasks";
    const uniqueFilename = `${basePath}/${timestamp}-${filename}`;

    // Get signed URL for upload
    const uploadResult = await getUploadSignedUrl(uniqueFilename, contentType);

    const { signedUrl, privateUrl } = uploadResult;

    return NextResponse.json({
      signedUrl,
      privateUrl,
      key: uniqueFilename,
    });
  } catch (error) {
    console.error("Presigned URL generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
