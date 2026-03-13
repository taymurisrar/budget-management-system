import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  createBackupArtifact,
  getBackupPreferences,
} from "@/features/settings/services/data-transfer.service";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });
    const currentPreferences = getBackupPreferences(settings);
    const body = (await request.json().catch(() => ({}))) as {
      provider?: "browser_download" | "local_path" | "google_drive";
      localPath?: string;
    };

    const provider = body.provider ?? currentPreferences.provider;
    const localPath = body.localPath ?? currentPreferences.localPath;

    const artifact = await createBackupArtifact({
      userId: user.id,
      provider,
      localPath,
    });

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        lastBackupAt: new Date(),
      },
      create: {
        userId: user.id,
        lastBackupAt: new Date(),
      },
    });

    return NextResponse.json({
      message: artifact.message,
      mode: artifact.mode,
      filePath: "filePath" in artifact ? artifact.filePath : null,
      payload: artifact.payload,
      lastBackupAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Create backup error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create backup." },
      { status: 500 }
    );
  }
}
