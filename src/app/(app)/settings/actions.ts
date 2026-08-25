"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StaffFormState {
  error?: string;
  success?: boolean;
}

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    throw new Error("Only the owner can manage staff accounts");
  }
}

export async function addStaff(
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  try {
    await requireOwner();
  } catch {
    return { error: "Only the owner can manage staff accounts." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 6) {
    return {
      error: "Enter a name, email, and a password of at least 6 characters.",
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Couldn't create that account." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    name,
    role: "staff",
  });

  if (profileError) {
    return { error: "Account created, but saving the profile failed." };
  }

  return { success: true };
}

export async function removeStaff(profileId: string) {
  await requireOwner();
  const admin = createAdminClient();
  // Deleting the auth user cascades to the profiles row (FK on delete cascade).
  await admin.auth.admin.deleteUser(profileId);
}
