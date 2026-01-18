import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/app(.*)'])
const isOrgInviteRoute = createRouteMatcher(['/app/org-invite/(.*)'])
const PENDING_ORG_INVITE_COOKIE = 'pending_org_invite'

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  // Check for pending org invite after authentication
  // This handles the case where Clerk redirects to /app after sign-up
  // instead of the original org-invite page
  const { userId } = await auth()
  if (userId && !isOrgInviteRoute(req)) {
    const pendingInviteToken = req.cookies.get(PENDING_ORG_INVITE_COOKIE)?.value

    if (pendingInviteToken) {
      // Clear the cookie
      const response = NextResponse.redirect(
        new URL(`/app/org-invite/${pendingInviteToken}`, req.url)
      )
      response.cookies.delete(PENDING_ORG_INVITE_COOKIE)
      return response
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
