import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      github_id?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
    github_id?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    github_id?: string
  }
} 