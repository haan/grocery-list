export const SHELL_STRINGS = {
  common: {
    back: 'Back',
    cancel: 'Cancel',
    closeMenu: 'Close menu',
    confirm: 'Confirm',
    done: 'Done',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    rename: 'Rename',
    add: 'Add',
    maybeLater: 'Maybe later',
    notNow: 'Not now',
    gotIt: 'Got it',
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    languageSystem: 'System',
    languageSystemHint: 'Match your phone',
    yourData: 'Your data',
    about: 'About',
    export: 'Export',
    import: 'Import',
    nothingImported: 'Nothing imported.',
    couldntExport: "Couldn't export.",
    couldntRead: "Couldn't read that file.",
  },
  about: {
    feedback: 'Send feedback',
    privacy: 'Privacy',
    source: 'Source code',
    acknowledgements: 'Acknowledgements',
    version: 'Version',
    // Locked by canon § Settings / About (the attribution stamp one-liner).
    oneLiner:
      'An independent, open-source shopping list.',
    learnMore: 'Learn more',
    learnMoreA11y: 'Learn more at github.com/haan/grocery-list',
  },
  // Top-level error boundary fallback (ErrorBoundary).
  error: {
    title: 'Something went wrong',
    body: 'The app hit an unexpected error. Reopen it to keep going — your data is safe on this device.',
  },
  // Acknowledgements screen (Credits). The header title reuses about.acknowledgements.
  credits: {
    footnote: "Full license texts live in each project's repository.",
    linkHint: 'Opens the project page in your browser',
  },
} as const;
