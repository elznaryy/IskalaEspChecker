'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

interface HeaderProps {
  isDarkMode?: boolean
  setIsDarkMode?: (value: boolean) => void
}

const navigation = [
  { name: 'Iskala ESP Checker', href: '/' },
  { name: 'About', href: '/about' },
  // Add more navigation items as needed
]

export function Header({ isDarkMode, setIsDarkMode }: HeaderProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Company Name */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="flex items-center space-x-2">
                <Image
                  src="/IskalaEspChecker/orglogo (1).png"
                  alt="Iskala Business Solutions"
                  width={140}
                  height={40}
                  className="h-10 w-auto"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${
                  pathname === item.href
                    ? 'border-[#3B82F6] text-[#3B82F6]'
                    : 'border-transparent text-[#6B7280] hover:text-[#1F2937] hover:border-[#E5E7EB]'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right Side - Dark Mode Toggle */}
          {isDarkMode !== undefined && setIsDarkMode && (
            <div className="flex items-center">
              <Switch
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
                className="relative inline-flex h-6 w-11 items-center rounded-full"
              >
                <span className="sr-only">Toggle dark mode</span>
                <div className="flex items-center">
                  {isDarkMode ? (
                    <Moon className="h-4 w-4 text-[#6B7280]" />
                  ) : (
                    <Sun className="h-4 w-4 text-[#6B7280]" />
                  )}
                </div>
              </Switch>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}