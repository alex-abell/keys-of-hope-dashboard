# Keys of Hope Dashboard

A staff dashboard for Keys of Hope, the residential program run by YWCA Knoxville & the Tennessee Valley. Built in one day at Hack for Nonprofits 2026.

> **Status: hackathon prototype, November 19, 2026.** It runs on made-up data. It has not been connected to any YWCA system. See [What this is not](#what-this-is-not).

<!-- TEAM: every line marked TEAM below is a fact only the team or YWCA can fill in. Do not guess. Delete this comment when none are left. -->


## What it is for

Keys of Hope gives up to 70 single women who are homeless a place to live for up to 24 months, with counseling, workshops, and links to community partners.

Today the program's numbers live in three places and are pulled together by hand. This project gives staff one page that answers: **who needs attention, and what should we do about it?**

It is for YWCA staff first: the program director, the two counselors, and the leadership team. The same numbers can later feed grant and donor reports.


## What is in this repository

<!-- TEAM: list the real folders once they exist. Remove any row that is not true. -->

| Path | What it holds |
| --- | --- |
| `dashboard/` | TEAM: the dashboard file (for example a Power BI `.pbix`) |
| `data/sample/` | Made-up practice data. No real person appears in it. |
| `data/template/` | The blank template YWCA fills with its own exports |
| `docs/` | Process maps, the metric list, and the demo slides |


## Quickstart

<!-- TEAM: replace these steps with the ones you actually ran. A quickstart that was never run is worse than none. -->

1. TEAM: install or open (tool and version).
2. TEAM: open `dashboard/<file>`.
3. TEAM: point it at `data/sample/` and refresh.
4. You should see: TEAM (one sentence describing the first screen).

Tested on: TEAM (operating system, tool version, date, who ran it).


## What the dashboard shows

This list came from the discovery session with the program director on November 19, 2026. Items marked "not built" are wanted but not in the prototype.

<!-- TEAM: mark each row Built or Not built before the demo. -->

| Question staff asked | Status |
| --- | --- |
| How many women live here now, out of 70? | TEAM |
| Who is employed, and who is not yet? | TEAM |
| Who is engaged in recovery support? | TEAM |
| Who is coming to workshops, by core area? | TEAM |
| Who has kept their monthly counselor meeting? | TEAM |
| Which milestones has each woman reached? | TEAM |
| Do women who engage more reach permanent housing faster? | TEAM |

**Core areas:** life skills, employment, mental and physical health.


## Where the real data lives

Nothing in this repository connects to these systems. This is a map for whoever does that work next.

| System | What it holds | Who uses it |
| --- | --- | --- |
| EmpowerDB | Services, groups, and case notes for every YWCA Knoxville department | All of YWCA Knoxville |
| KnoxHMIS | A record at entry and at exit, required by the city grant | Keys of Hope only |
| Agency spreadsheet | Monthly totals each department types in by hand | Department directors |
| Paper sign-in sheets | Workshop attendance, typed into EmpowerDB afterward | Program director |

EmpowerDB has built-in reports (services, groups, program census, average length of stay). Those exports are the likely way in. Nobody has tested that yet.


## Data rules

These are not optional.

- **No real resident data in this repository. Ever.** Not in a commit, a screenshot, an issue, or a test file. Git history keeps what you delete.
- **Made-up data only** for development and demos.
- **IDs, never names.** No birth dates, Social Security numbers, addresses, room numbers, or case notes.
- **Hide small groups.** Any count from 1 to 4 shows as "Fewer than 5", so a number cannot point to one woman.
- **Real data is loaded by YWCA staff, inside YWCA's own systems.** Not on a volunteer's laptop.

The KnoxHMIS Privacy Notice (version October 24, 2024) allows de-identified information to be used for reporting to funders and the public, with no names, dates of birth, or other identifying information beyond a numeric client ID. That is the line this project stays behind.

If you find real data in this repository, tell the owner right away. Do not just delete the file: the history has to be cleaned too.


## What this is not

- **Not connected to live data.** Every number in the prototype is invented.
- **Not a resident-facing tool.** A view for each woman to see her own progress was discussed and set aside for later.
- **Not a replacement for EmpowerDB or KnoxHMIS.** Staff still enter data where they do today.
- **Not proof of anything about the real program.** The practice data has a pattern planted in it so charts have something to show.
- **Not reviewed** by YWCA's privacy, legal, or IT contacts.


## Who owns what

The hackathon asks every team to name owners before leaving.

| What | Owner |
| --- | --- |
| The dashboard after the event | YWCA Knoxville's Director of Social Services |
| This repository | TEAM |
| Loading real data | YWCA staff only |
| Follow-up meeting within two weeks | TEAM: date and who schedules it |


## Next steps

**Next**

- Connect the template to a real EmpowerDB export, done by YWCA staff.
- Add a funder page built from the same numbers.
- Test the engagement and housing question on real records.

**Later**

- A view for each resident.
- Digital sign-in for workshops, to replace paper.
- The same model for YWCA's victim services and youth services departments.

<!-- TEAM: add the top 3 fixes from the 2:45 test with the program director. Anything else found today goes here too. -->


## Team

Built by a volunteer team with YWCA Knoxville's Director of Social Services as the problem owner.

| Role | Did what |
| --- | --- |
| Problem owner (YWCA) | Made the decisions and tested the prototype |
| Design lead | Ran discovery and wireframed the dashboard |
| Developer | Set up the repository and the data template |
| Team coach | Kept scope and time, built the dashboard |

No one is named here on purpose. Ask before adding anyone.

Hack for Nonprofits 2026 is run by 121 Tech Hub and United Way of Greater Knoxville.


## License

TEAM: choose one, or say "All rights reserved" until YWCA decides. No license means nobody else may reuse this.
