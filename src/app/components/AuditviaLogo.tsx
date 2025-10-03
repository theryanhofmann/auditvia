import Image from 'next/image'
import Link from 'next/link'

interface AuditviaLogoProps {
  variant?: 'white' | 'blue'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
}

const sizeMap = {
  sm: { width: 120, height: 30, className: 'h-6' },
  md: { width: 160, height: 40, className: 'h-8' },
  lg: { width: 200, height: 50, className: 'h-10' },
}

export function AuditviaLogo({ 
  variant = 'white', 
  size = 'md',
  href,
  className = ''
}: AuditviaLogoProps) {
  const { width, height, className: sizeClass } = sizeMap[size]
  const logoSrc = variant === 'white' 
    ? '/logos/auditvia-logo-white.svg' 
    : '/logos/auditvia-logo-blue.svg'

  const logo = (
    <Image
      src={logoSrc}
      alt="Auditvia"
      width={width}
      height={height}
      className={`w-auto ${sizeClass} ${className}`}
      priority
    />
  )

  if (href) {
    return (
      <Link 
        href={href}
        className="transition-opacity hover:opacity-80 duration-300"
      >
        {logo}
      </Link>
    )
  }

  return logo
}
