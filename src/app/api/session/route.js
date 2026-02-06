import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";

export async function GET(request) {
  const session = await getServerSession(authOptions);

  return Response.json({
    authenticated: !!session,
    session,
  });
}
