export { auth as middleware } from "@/auth";



export const config = {
  matcher: [
    "/users/:path*",
    "/conversations/:path*"
  ]
};