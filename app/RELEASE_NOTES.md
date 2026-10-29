# Version 0.8.27

Calendar subscriptions now have separate **Set up Google Calendar** and **Add to iOS Calendar** actions. Android users see instructions for adding their private feed once through Google Calendar on a computer, then enabling it on their phone. iPhone users can open Apple Calendar's subscription flow, with manual instructions if it does not launch. Failed clipboard access selects the link and explains manual copying. English and Dutch copy match. Creating a feed link does not confirm subscription or reminders; the calendar provider controls refresh and notifications.

Default Apex branding now uses one shared vector matching the approved turquoise rounded square and dark italic A. Login, sidebar, loading screens, favicon, installed-app icons, Apple touch icon and sharing artwork use this mark. Custom league logo uploads retain precedence. Reusable SVG and PNG assets are included.

Validation: TypeScript, automated tests and production build. Native Android/iOS calendar-app handoff was not tested. The existing Next.js dependency advisory remains outstanding.

Update app and calendar worker to `ghcr.io/sietsevdm/apex-league:0.8.27` with Re-pull image enabled. Preserve existing secrets and volumes. No database migration, environment change or scoring change is required. GitHub publication does not install this update on your VPS.
