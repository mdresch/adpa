'use client'

import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useReducer
} from 'react'

import { useSidebar } from '@/components/morphic/ui/sidebar'

// Animation duration should match CSS transition duration
const ANIMATION_DURATION = 300

interface ArtifactState {
    part: any | null // Generic for now
    isOpen: boolean
}

type ArtifactAction =
    | { type: 'OPEN'; payload: any }
    | { type: 'CLOSE' }
    | { type: 'CLEAR_CONTENT' }

const initialState: ArtifactState = {
    part: null,
    isOpen: false
}

function artifactReducer(
    state: ArtifactState,
    action: ArtifactAction
): ArtifactState {
    switch (action.type) {
        case 'OPEN':
            return { part: action.payload, isOpen: true }
        case 'CLOSE':
            return { ...state, isOpen: false }
        case 'CLEAR_CONTENT':
            return { part: null, isOpen: false }
        default:
            return state
    }
}

interface ArtifactContextValue {
    state: ArtifactState
    open: (part: any) => void
    close: () => void
}

const ArtifactContext = createContext<ArtifactContextValue | undefined>(
    undefined
)

export function ArtifactProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(artifactReducer, initialState)
    const { setOpen, open: sidebarOpen } = useSidebar()

    const close = useCallback(() => {
        dispatch({ type: 'CLOSE' })
        // Keep content for animation purposes, clear after transition
        setTimeout(() => {
            dispatch({ type: 'CLEAR_CONTENT' })
        }, ANIMATION_DURATION)
    }, [])

    // Close artifact when sidebar opens
    useEffect(() => {
        if (sidebarOpen && state.isOpen) {
            close()
        }
    }, [sidebarOpen, state.isOpen, close])

    const open = (part: any) => {
        dispatch({ type: 'OPEN', payload: part })
        setOpen(false)
    }

    return (
        <ArtifactContext.Provider value={{ state, open, close }}>
            {children}
        </ArtifactContext.Provider>
    )
}

export function useArtifact() {
    const context = useContext(ArtifactContext)
    if (context === undefined) {
        // Return a stub if no provider exists to avoid crashes
        return {
            state: initialState,
            open: () => { },
            close: () => { }
        }
    }
    return context
}
