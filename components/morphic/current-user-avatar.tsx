'use client'

import { User2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

export const CurrentUserAvatar = () => {
    const { user } = useAuth()
    const profileImage = user?.avatar_url
    const name = user?.name
    const initials = name
        ?.split(' ')
        ?.map(word => word[0])
        ?.join('')
        ?.toUpperCase() || '?'

    return (
        <Avatar className="size-6">
            {profileImage && <AvatarImage src={profileImage} alt={initials} />}
            <AvatarFallback>
                {initials === '?' ? (
                    <User2 size={16} className="text-muted-foreground" />
                ) : (
                    initials
                )}
            </AvatarFallback>
        </Avatar>
    )
}
