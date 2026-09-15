"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { registerSchema } from "@/lib/validations";
import { signIn } from "@/auth";

export type RegisterState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "password", string>>;
  success?: boolean;
};

const SALT_ROUNDS = 12;

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: RegisterState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "name" | "email" | "password";
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const { name, email, password } = parsed.data;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return {
      error: "Já existe uma conta com este e-mail.",
      fieldErrors: { email: "E-mail já cadastrado." },
    };
  }

  const passwordHash = await hash(password, SALT_ROUNDS);

  await db.insert(users).values({
    name,
    email,
    passwordHash,
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/onboarding",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Conta criada, mas não foi possível autenticar automaticamente.
      return { success: true };
    }
    throw error;
  }

  return { success: true };
}
