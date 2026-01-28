import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const getAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return null;
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const getAuthClient = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
};

const ensureAdmin = async () => {
  const authClient = await getAuthClient();
  const adminClient = getAdminClient();
  if (!authClient || !adminClient) {
    return { error: "Supabase environment belum lengkap", status: 500 };
  }
  const { data } = await authClient.auth.getUser();
  if (!data.user) {
    return { error: "Unauthorized", status: 401 };
  }
  const { data: adminData } = await adminClient
    .from("admin_users")
    .select("user_id,email")
    .or(`user_id.eq.${data.user.id},email.eq.${data.user.email ?? ""}`)
    .maybeSingle();
  if (!adminData) {
    return { error: "Forbidden", status: 403 };
  }
  return { adminClient, user: data.user };
};

export async function POST(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "File tidak valid" }, { status: 400 });
  }
  const fileName = typeof formData.get("name") === "string" ? formData.get("name") : file.name;
  const photo_x = Number(formData.get("photo_x") ?? 0);
  const photo_y = Number(formData.get("photo_y") ?? 0);
  const photo_width = Number(formData.get("photo_width") ?? 0);
  const photo_height = Number(formData.get("photo_height") ?? 0);
  
  const slots_config_str = formData.get("slots_config");
  let slots_config = [];
  try {
    slots_config = slots_config_str ? JSON.parse(String(slots_config_str)) : [];
  } catch (e) {
    // ignore
  }

  const filePath = `frames/${crypto.randomUUID()}-${file.name}`;
  const upload = await auth.adminClient.storage
    .from("templates")
    .upload(filePath, file, { contentType: file.type || "image/png", upsert: true });
  if (upload.error) {
    return NextResponse.json({ message: upload.error.message }, { status: 400 });
  }
  const insert = await auth.adminClient.from("templates").insert({
    name: String(fileName || file.name).replace(/\.[^.]+$/, ""),
    file_path: filePath,
    photo_x,
    photo_y,
    photo_width,
    photo_height,
    slots_config,
  });
  if (insert.error) {
    return NextResponse.json({ message: insert.error.message }, { status: 400 });
  }
  return NextResponse.json({ file_path: filePath });
}

export async function PUT(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }
  const formData = await request.formData();
  const id = formData.get("id");
  if (typeof id !== "string") {
    return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
  }

  const file = formData.get("file");
  const name = formData.get("name");
  
  const slots_config_str = formData.get("slots_config");
  let slots_config = [];
  try {
    slots_config = slots_config_str ? JSON.parse(String(slots_config_str)) : [];
  } catch (e) {
    // ignore
  }

  const updates: any = {
    slots_config
  };

  if (name) updates.name = name;
  
  if (slots_config.length > 0) {
      updates.photo_x = slots_config[0].x;
      updates.photo_y = slots_config[0].y;
      updates.photo_width = slots_config[0].width;
      updates.photo_height = slots_config[0].height;
  }

  if (file instanceof File) {
     const filePath = `frames/${crypto.randomUUID()}-${file.name}`;
     const upload = await auth.adminClient.storage
       .from("templates")
       .upload(filePath, file, { contentType: file.type || "image/png", upsert: true });
     
     if (upload.error) {
       return NextResponse.json({ message: upload.error.message }, { status: 400 });
     }
     updates.file_path = filePath;
  }

  const { error } = await auth.adminClient
    .from("templates")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }
  const body = await request.json();
  const filePath = body?.file_path;
  const id = body?.id;
  if (typeof filePath !== "string" || typeof id !== "string") {
    return NextResponse.json({ message: "Data tidak valid" }, { status: 400 });
  }

  // Unlink transactions first to avoid foreign key constraint violation
  await auth.adminClient
    .from("transactions")
    .update({ template_id: null })
    .eq("template_id", id);

  // Unlink photos as well
  await auth.adminClient
    .from("photos")
    .update({ template_id: null })
    .eq("template_id", id);

  await auth.adminClient.storage.from("templates").remove([filePath]);
  const removed = await auth.adminClient.from("templates").delete().eq("id", id);
  if (removed.error) {
    return NextResponse.json({ message: removed.error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
