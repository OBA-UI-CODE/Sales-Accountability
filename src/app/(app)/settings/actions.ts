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

  /*
   * Staff are ARCHIVED, not deleted. sales.sold_by references profiles with
   * NO ACTION, so the database refuses to delete anyone who has actually
   * logged a sale — deleting the auth user used to fail silently for exactly
   * those people, since profiles cascades from it. Their name needs to stay
   * on past sales; only their access should go.
   */
  await admin
    .from("profiles")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", profileId);

  // Ban the login (a very long duration stands in for "permanently" — GoTrue
  // has no dedicated permanent-ban flag) and drop any session already in use,
  // rather than waiting for its access token to expire on its own.
  await admin.auth.admin.updateUserById(profileId, { ban_duration: "87600h" });
  await admin.rpc("revoke_user_sessions", { target_user: profileId });
}
