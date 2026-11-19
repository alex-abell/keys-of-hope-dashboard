# Keys of Hope in Power BI

A two-page Power BI report: **Program overview** and **Who we serve**. It reads four EmpowerDB table exports from one folder.

This folder holds the report as a Power BI project, which is plain text that can be reviewed and versioned. It holds no data. You load the made-up sample files yourself, in about five minutes.

> **Status, November 19, 2026.** The report was built and checked in Power BI Desktop on the sample files, and the Relaunch line was added there. Two sets of changes were then written by hand into the project files and have **not** been opened in Power BI yet: layout fixes, and the "Last updated" line. If the project will not open, see "If it will not open" at the end.


## What you need

- A Windows computer. Power BI Desktop does not run on a Mac.
- Power BI Desktop, free from the Microsoft Store.
- This repository, cloned or downloaded as a zip.


## Run it with the sample data

1. **Make a folder** at `C:\KeysOfHope\exports`.
2. **Copy the four files** from `data/sample/` in this repository into that folder:
   `Clients.xlsx`, `Move in.xlsx`, `Services.xlsx`, `Groups.xlsx`.
3. **Open** `powerbi/Keys of Hope.pbip` in Power BI Desktop.
   The charts are empty at first. The project does not carry data.
4. **Click Refresh** on the Home tab.

**Used a different folder?** Home > Transform data > Edit parameters. Set `ExportFolder` to your folder's full path, click OK, then Refresh.


## Check it worked

On **Program overview**, with the date filter starting January 1, 2026, you should see:

| On the page | Expected |
|---|---|
| Moved into permanent housing | 51% |
| Women living here today | 70 |
| Moved in | 96 |
| Left | 89 |
| Average length of stay (days) | 213 |
| Left before 2-year mark | 19 |

On **Who we serve**, "Women served" should read 159.

Beside each page title, a small line should read **Last updated** with a date. That date is when the oldest of the four export files was saved, so it tells you how fresh the data is, not when Refresh was clicked. If one of the four exports is missing from the folder, the line says so.

These match `dashboard/KeysOfHope_dashboard.html` on the same files.


## Make your own export

Once it has refreshed, pick what you need.

| You want | Do this | You get |
|---|---|---|
| A report file to keep using | File > Save as, and choose Power BI file (`.pbix`) | The report with the data inside it |
| A copy to hand to someone else | File > Export > Power BI template | A `.pbit` file: the report with no data in it |
| Something to print or email | File > Export > Export to PDF | One page per report tab |

**Which file is which**

- `.pbip` is the project in this folder. Edit here.
- `.pbit` is a template with no data. This is the only file that should be sent to YWCA.
- `.pbix` has data inside it. This repository ignores `.pbix` files on purpose. Never commit one.


## Using it with real data

Real exports stay on a YWCA computer. Do not load them on a volunteer machine.

1. Export a `.pbit` template as above and send only that file.
2. On the YWCA computer, make the folder `C:\KeysOfHope\exports`.
3. In EmpowerDB: Administration > Table Export. Export Clients, Move Ins & Exits, Services, and Groups to Excel into that folder.
4. Open the `.pbit`. If it asks for `ExportFolder`, enter `C:\KeysOfHope\exports`.
5. Save it as a `.pbix` on that computer.

**Every week after that:** export the four tables into the same folder, replacing last week's, open the `.pbix`, and click Refresh.

Before the first real use, have the program director check the numbers against what she knows. The report has only ever been run on the sample files.

**Check the "Last updated" line after each Refresh.** If it shows last week's date, one of the four files was not replaced.


## What is in this folder

| Path | What it holds |
|---|---|
| `Keys of Hope.pbip` | The file to open |
| `Keys of Hope.Report/` | The pages, visuals, and YWCA color theme |
| `Keys of Hope.SemanticModel/` | The queries that read the exports, the tables, and every formula |

The rules behind the numbers, and how each query and formula was designed, are in `docs/power-bi-build-steps.md`.


## If it will not open

- **Power BI says the project format is not supported.** Update Power BI Desktop. If it still fails, look under File > Options and settings > Options > Preview features for the project (`.pbip`) and report format options, turn them on, and restart.
- **The project fails to load, or names a table called `Exports`.** The hand-written "Last updated" change is the likely cause. It is the last commit that touched `Keys of Hope.SemanticModel/`. Revert that commit.
- **A visual shows an error after the hand-written layout fixes.** The first commit of this folder is the version that was checked in Power BI. Restore `Keys of Hope.Report/` from that commit and the report will open as first built.
- **Refresh fails with a folder error.** `ExportFolder` does not point at a folder that exists. Fix it under Edit parameters.
