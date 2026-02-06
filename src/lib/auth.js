import CredentialsProviderModule from "next-auth/providers/credentials";
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const CredentialsProvider = CredentialsProviderModule.default || CredentialsProviderModule;

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Auth: Missing email or password');
          return null;
        }

        try {
          const emailLower = credentials.email.toLowerCase().trim();
          console.log('Auth: Attempting login for:', emailLower);
          
          const [user] = await db.select()
            .from(users)
            .where(eq(users.email, emailLower))
            .limit(1);

          if (!user) {
            console.log('Auth: User not found');
            return null;
          }
          
          console.log('Auth: User found, checking password');

          const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValidPassword) {
            console.log('Auth: Invalid password');
            return null;
          }
          
          console.log('Auth: Login successful for', user.email);

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            crewId: user.crewId,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.crewId = user.crewId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.crewId = token.crewId;
      }
      return session;
    },
  },
};
