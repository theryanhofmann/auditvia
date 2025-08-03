import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      github_id?: string
      pro: boolean
      name?: string | null
      email?: string | null
      image?: string | null
      referral_code: string
      referral_credits: number
      referrerName?: string
    }
  }

  interface User {
    id: string
    github_id?: string
    pro: boolean
    name?: string | null
    email?: string | null
    image?: string | null
    referral_code: string
    referral_credits: number
    referrerName?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string
    github_id?: string
    pro: boolean
    referral_code: string
    referral_credits: number
    referrerName?: string
  }
} 