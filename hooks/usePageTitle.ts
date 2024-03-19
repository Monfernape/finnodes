import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

export const usePageTitle = () => {
    // Get current route from Next.js
    const pathname = usePathname()

    const pageTitle = useMemo(() => {
        switch (pathname) {
            case '/':
                return 'Home'
            case '/expenses':
                return 'Expenses'
            case '/seats':
                return 'Seats'
            case '/managers':
                return 'Managers'
            case '/reports':
                return 'Reports'
            default:
                return 'Page Not Found'
        }
    }, [pathname])

    return pageTitle

}