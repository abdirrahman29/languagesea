import { PrismaAdapter } from "@auth/prisma-adapter"
import type { NextAuthOptions } from "next-auth"
import { prisma } from "@/lib/db"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import NextAuth from "next-auth";


export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        })

        if (!user || !user.password) {
          return null
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password)

        if (!passwordMatch) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Simplified redirect handler
      try {
        const parsedUrl = new URL(url);
        // Only allow redirects within the same domain
        if (parsedUrl.origin === baseUrl) {
          return url;
        }
      } catch (error) {
        // Handle relative URLs
        if (url.startsWith("/")) {
          return `${baseUrl}${url}`;
        }
      }
      // Default to home page for invalid URLs
      return baseUrl;
    },
    
    async session({ session, token }) {
      // Ensure all required session fields are populated
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          name: token.name,
          email: token.email,
          image: token.picture,
          role: token.role // Add any additional fields you need
        }
      };
    },
  
    async jwt({ token, user, trigger, session }) {
      // Handle user creation/update on sign in
      if (trigger === "signIn" && user) {
        const prismaUser = await prisma.user.upsert({
          where: { email: user.email! },
          update: {
            name: user.name,
            image: user.image
          },
          create: {
            email: user.email!,
            name: user.name || "",
            image: user.image || ""
          }
        });
  
        return {
          ...token,
          id: prismaUser.id,
          name: prismaUser.name,
          email: prismaUser.email,
          picture: prismaUser.image,
          role: prismaUser.role
        };
      }
  
      // Handle session updates
      if (trigger === "update" && session) {
        return { ...token, ...session.user };
      }
  
      // Return existing token for other cases
      return token;
    }
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true, // Set to true if using HTTPS
        domain: ".nahjuna.com", // Your server IP
      },
    },
  },
              // @ts-ignore

  trustHost: true,
  debug: process.env.NODE_ENV === "development",
}
