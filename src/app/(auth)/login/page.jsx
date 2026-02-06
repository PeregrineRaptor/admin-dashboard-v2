import LoginForm from "@/components/auth/LoginForm";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

export default async function Login() {
  const session = await getServerSession(authOptions);
  const accessToken = session?.user?.access;
  return !accessToken ? <LoginForm /> : redirect("/");
}
