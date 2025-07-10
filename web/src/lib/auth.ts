import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcrypt';
import type { AuthOptions, SessionStrategy } from 'next-auth';

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.hashedPassword) return null;
        const isValid = await compare(credentials.password, user.hashedPassword);
        if (!isValid) return null;
        return user;
      },
    }),
  ],
  session: { strategy: 'jwt' as SessionStrategy },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token, user }: any) {
      if (session.user) {
        (session.user as typeof session.user & { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};
