import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "./db";

// Support both AUTH_SECRET and NEXTAUTH_SECRET naming conventions
const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

// Log warning if secret is missing (only on server startup)
if (!secret) {
  console.error("[Auth] WARNING: Neither AUTH_SECRET nor NEXTAUTH_SECRET is set. Authentication will not work.");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        
        try {
          const sql = getDb();

          // Check if email is in allowed_users
          const allowed = await sql`
            SELECT * FROM allowed_users WHERE email = ${email.toLowerCase()}
          `;
          
          if (allowed.length === 0) {
            throw new Error("Email not authorized. Contact admin to get access.");
          }

          // Check if user exists
          const users = await sql`
            SELECT * FROM users WHERE email = ${email.toLowerCase()}
          `;

          if (users.length === 0) {
            // First-time login - create user with this password
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await sql`
              INSERT INTO users (email, password_hash, display_name)
              VALUES (${email.toLowerCase()}, ${hashedPassword}, ${email.split("@")[0]})
              RETURNING id, email, display_name
            `;
            
            return {
              id: newUser[0].id,
              email: newUser[0].email,
              name: newUser[0].display_name,
            };
          }

          // Existing user - verify password
          const user = users[0];
          const passwordMatch = await bcrypt.compare(password, user.password_hash);

          if (!passwordMatch) {
            throw new Error("Invalid password");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.display_name,
          };
        } catch (error) {
          console.error("[Auth] Authorization error:", error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
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
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
});
