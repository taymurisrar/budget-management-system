import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  exportDataTypeToCsv,
  importCsvDataType,
  transferableDataTypes,
} from "@/features/settings/services/data-transfer.service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (!type || !transferableDataTypes.includes(type as never)) {
      return NextResponse.json({ message: "A valid export type is required." }, { status: 400 });
    }

    const payload = await exportDataTypeToCsv(user.id, type as (typeof transferableDataTypes)[number]);
    return new NextResponse(payload.content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${payload.fileName}"`,
      },
    });
  } catch (error) {
    console.error("Export settings data error:", error);
    return NextResponse.json(
      { message: "Failed to export settings data." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { type?: string; csv?: string };
    if (!body.type || !transferableDataTypes.includes(body.type as never)) {
      return NextResponse.json({ message: "A valid import type is required." }, { status: 400 });
    }

    const result = await importCsvDataType(
      user.id,
      body.type as (typeof transferableDataTypes)[number],
      body.csv ?? ""
    );

    if (!result.success) {
      return NextResponse.json(
        { message: result.message, errors: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Import settings data error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to import settings data." },
      { status: 500 }
    );
  }
}
