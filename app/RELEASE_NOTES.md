# Version 0.8.6

- Members always shows a Player registration panel listing all seasons. Active seasons have manual open/close controls; archived seasons explain their status and offer Reopen season.
- Season deletion/purge confirmation ignores leading/trailing whitespace, repeated or non-breaking spaces, Unicode normalization and letter case. The complete name is still required.
- Confirmation shows the required name and provides Copy season name. Server and UI use the same comparison. Backups remain required before deletion.
