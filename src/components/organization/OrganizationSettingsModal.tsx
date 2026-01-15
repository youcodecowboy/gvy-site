'use client'

import { OrganizationProfile } from '@clerk/nextjs'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

interface OrganizationSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OrganizationSettingsModal({ isOpen, onClose }: OrganizationSettingsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showHeader={false}
      size="3xl"
    >
      <div className="clerk-org-profile-wrapper relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        
        <OrganizationProfile
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-none border-0 bg-transparent',
              navbar: 'bg-transparent border-r border-border',
              navbarButton: 'text-foreground hover:bg-accent',
              navbarButtonIcon: 'text-muted-foreground',
              pageScrollBox: 'bg-transparent',
              page: 'bg-transparent',
              profileSection: 'border-border',
              profileSectionContent: 'border-border',
              profileSectionHeader: 'border-border',
              profileSectionTitle: 'text-foreground',
              profileSectionSubtitle: 'text-muted-foreground',
              profileSectionPrimaryButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
              formFieldLabel: 'text-foreground',
              formFieldInput: 'bg-background border-border text-foreground',
              formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
              formButtonReset: 'text-muted-foreground hover:text-foreground',
              membersPageInviteButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
              tableHead: 'text-muted-foreground',
              tableCell: 'text-foreground border-border',
              badge: 'bg-accent text-accent-foreground',
              avatarBox: 'border-border',
              headerTitle: 'text-foreground',
              headerSubtitle: 'text-muted-foreground',
              modalCloseButton: 'text-muted-foreground hover:text-foreground',
            },
            variables: {
              colorPrimary: 'hsl(var(--primary))',
              colorBackground: 'hsl(var(--background))',
              colorText: 'hsl(var(--foreground))',
              colorTextSecondary: 'hsl(var(--muted-foreground))',
              colorInputBackground: 'hsl(var(--background))',
              colorInputText: 'hsl(var(--foreground))',
              borderRadius: '0.5rem',
            },
          }}
          routing="hash"
        />
      </div>
    </Modal>
  )
}
