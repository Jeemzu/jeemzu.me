import { create } from 'zustand'

type NavigationState = {
    activeSection: string
    setActiveSection: (section: string) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
    activeSection: 'about',
    setActiveSection: (section) => set({ activeSection: section }),
}))