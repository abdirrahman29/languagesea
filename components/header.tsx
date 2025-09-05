"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Search, Menu, User, Settings, LogOut } from "lucide-react"
import { signIn, signOut, useSession } from "next-auth/react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session } = useSession()

  return (
    <header className="bg-teal-500 text-white p-4 shadow-md">
      <div className="container mx-auto">
        {/* Desktop header */}
        <div className="hidden md:flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold hover:text-teal-100 transition-colors">
            German Vocabulary Trainer
          </Link>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search vocabulary..."
                className="py-2 px-4 pr-10 rounded-md text-gray-800 w-64"
              />
              <Search className="absolute right-3 top-2.5 text-gray-500 h-5 w-5" />
            </div>

            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-teal-400">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                      <AvatarFallback className="bg-white text-teal-600">
                        {session.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Profile & Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/practice" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>Practice</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center gap-2 text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="secondary" className="bg-white text-teal-600 hover:bg-gray-100" onClick={() => signIn()}>
                Sign In
              </Button>
            )}
          </div>
        </div>

        {/* Mobile header */}
        <div className="flex md:hidden justify-between items-center">
          <Link href="/" className="text-xl font-bold hover:text-teal-100 transition-colors">
            German Vocabulary
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="hover:bg-teal-400">
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 space-y-3 py-3 border-t border-teal-400">
            <div className="relative">
              <input
                type="text"
                placeholder="Search vocabulary..."
                className="py-2 px-4 pr-10 rounded-md text-gray-800 w-full"
              />
              <Search className="absolute right-3 top-2.5 text-gray-500 h-5 w-5" />
            </div>
            {session ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                    <AvatarFallback className="bg-white text-teal-600">
                      {session.user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{session.user?.name}</span>
                    <span className="text-xs text-teal-200">{session.user?.email}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Link 
                    href="/profile" 
                    className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-teal-400 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>Profile & Settings</span>
                  </Link>
                  <Link 
                    href="/practice" 
                    className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-teal-400 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Practice</span>
                  </Link>
                  <Link 
                    href="/dashboard" 
                    className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-teal-400 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="w-full justify-start gap-2 text-red-200 hover:text-red-100 hover:bg-red-500/20"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="w-full bg-white text-teal-600 hover:bg-gray-100"
                onClick={() => signIn()}
              >
                Sign In
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}