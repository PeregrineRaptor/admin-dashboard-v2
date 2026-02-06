import { withAuth } from "next-auth/middleware";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico).*)"],
};
export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
  },

  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);
