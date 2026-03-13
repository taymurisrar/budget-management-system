import { createAccountSchema } from "@/features/accounts/validations/account.schema";
import { createAccountService } from "@/features/accounts/services/accounts.service";
import { findAllAccounts } from "@/features/accounts/repository/accounts.repository";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const accounts = await findAllAccounts(user.id);
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Fetch accounts error:", error);

    return NextResponse.json(
      { message: "Failed to fetch accounts" },
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

    const body = await request.json();
    const parsed = createAccountSchema.safeParse({
      ...body,
      userId: user.id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const account = await createAccountService(parsed.data);

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Create account error:", error);

    return NextResponse.json(
      { message: "Something went wrong while creating the account" },
      { status: 500 }
    );
  }
}
