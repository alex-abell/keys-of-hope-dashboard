# Keys of Hope report: start here

A guide for the person at YWCA who keeps the report up to date. One folder, four export files, one Refresh button.

The folder itself is in [`handoff/KeysOfHope_for_YWCA.zip`](../handoff/KeysOfHope_for_YWCA.zip). It holds the report template, this guide as a two-page PDF, and an empty exports folder.

## First time only

About 10 minutes. You need a Windows computer.

1. **Unzip the folder onto your C: drive.** Right-click the zip file, choose Extract All, and set the location to `C:\`. You should end up with `C:\KeysOfHope`.
2. **Install Power BI Desktop** from the Microsoft Store, if you do not have it. It is free.
3. **Export four tables from EmpowerDB.** Go to EmpowerDB Administration, then Table Export. Export Clients, Move Ins & Exits, Services, and Groups to Excel.
4. **Save all four into the exports folder:** `C:\KeysOfHope\exports`. The file names do not matter.
5. **Double-click "Keys of Hope.pbit".** When it asks for ExportFolder, type `C:\KeysOfHope\exports` and click Load.
6. **Save it.** File, Save as, and name it Keys of Hope in `C:\KeysOfHope`. This saved file is the one you open from now on.

## Every Friday

About 5 minutes.

1. **Empty the exports folder.** Delete last week's files, so nothing is counted twice.
2. **Export the same four tables** from EmpowerDB.
3. **Save them into the exports folder.**
4. **Open "Keys of Hope"** and click Refresh on the Home tab.
5. **Check the "Last updated" date** beside the page title. It should be today.

If "Last updated" shows an old date, one of the four tables was not exported this week. If it says an export is missing, one of the four is not in the folder.

## Sharing the report with your team

Two ways. Start with the first. Before either one, ask whoever manages YWCA's Power BI which workspace to use and who has a license to view reports.

**Works today: publish from your computer**

- After Friday's Refresh, click Publish on the Home tab.
- Sign in with your YWCA account and pick the workspace.
- If it asks to replace the existing report, choose Replace.
- Open the report at powerbi.com and use Share to send the link.

**Later, with help: keep the exports in SharePoint**

- The exports folder moves to a SharePoint folder that only the right staff can open.
- The report then updates without you opening it.
- This needs a one-time change to the report by someone who builds Power BI reports. The change is in step 14 of `docs/power-bi-build-steps.md`. It has not been tried yet.

## Keep the export files safe

The four exports hold client records for every YWCA program, not just Keys of Hope, and may include names. Keep them in the exports folder. Do not email them. The report itself never loads names, phone numbers, emails, or birth dates, and it hides any group of fewer than 5 women.

## What you are looking at

- **Program overview:** who lives here now, who moved in and left, and where women went.
- **Who we serve:** race, county, education, income, disability, and veteran status of the women served.
- **The filters at the top right** change the time period. A grant year runs July to June.
- **Success** counts every woman who moved into permanent housing, whenever she left.

## If something goes wrong

- **Refresh shows an error about a folder.** The exports folder was moved or renamed. Put it back at `C:\KeysOfHope\exports`.
- **You could not unzip to C:.** Unzip anywhere. In step 5, type the full location of your exports folder.
- **Services saves as two files.** That happens when the table is large. Put both in the exports folder.
- **The numbers look doubled.** Last week's files are still in the exports folder. Delete them and click Refresh.
- **A number looks wrong.** Do not use it yet. The report was built on made-up data and should be checked against what you know the first time it runs on real records.
