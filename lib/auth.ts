import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

/**
 * Single-admin auth setup.
 *
 * Credentials are read from environment variables rather than a database,
 * since this project doesn't have one yet:
 *   ADMIN_EMAIL           - the admin's login email
 *   ADMIN_PASSWORD_HASH   - bcrypt hash of the admin's password
 *
 * Generate a hash with:
 *   node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
 *
 * If you later add real user accounts, swap the `authorize` body below for a
 * database lookup and keep the rest of this file as-is.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 hours
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

        if (!email || !password || !adminEmail || !adminPasswordHash) {
          return null;
        }

        if (email.toLowerCase() !== adminEmail.toLowerCase()) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, adminPasswordHash);
        if (!passwordMatches) {
          return null;
        }

        return { id: "admin", email: adminEmail, name: "Admin" };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
