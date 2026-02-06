import { authOptions } from "@/lib/auth";
import NextAuthModule from "next-auth";

const NextAuth = NextAuthModule.default || NextAuthModule;

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
