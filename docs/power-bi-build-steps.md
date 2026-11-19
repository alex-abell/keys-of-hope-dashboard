# Power BI build steps

This builds the two-page Keys of Hope report in Power BI Desktop:

- **Page 1, Program overview:** who is here, who left, and where they went.
- **Page 2, Who we serve:** race, county, education, income, disability, veteran.

**The goal for the weekly update:** the program director saves her four EmpowerDB exports into one folder and clicks Refresh. No file names, paths, or queries to touch.

Build and test on the made-up files in `data/sample/`. Never load real resident data on a volunteer machine.

**Status:** nothing in this file has been run in Power BI yet. The same rules run correctly in `dashboard/KeysOfHope_dashboard.html`, so use the check table in step 9 to confirm the numbers match.

---

## 1. Set up the folder

1. Make a folder, for example `C:\KeysOfHope\exports`.
2. Copy the four files from `data/sample/` into it.

The report reads every `.xlsx` file in that folder and works out which export each one is from its column names. File names do not matter. If Services comes out of EmpowerDB as two files (it splits at 50,000 rows), both are read.

## 2. Add the folder setting

Home > Transform data > Manage Parameters > New Parameter.

| Field | Value |
|---|---|
| Name | `ExportFolder` |
| Type | Text |
| Current Value | `C:\KeysOfHope\exports` |

## 3. Add the four queries

For each one: Home > Transform data > New Source > Blank Query > Advanced Editor. Paste, click Done, rename the query exactly as shown. Add them in this order.

If you see a "Formula.Firewall" error: File > Options and settings > Options > Privacy (under Current File) > Ignore the Privacy Levels.

### Query 1: `ExportFiles`

Reads the folder and labels each file. After adding it, right-click it and untick **Enable load**. It only feeds the other three.

```
let
    Source = Folder.Files(ExportFolder),
    Workbooks = Table.SelectRows(Source, each Text.Lower([Extension]) = ".xlsx" and not Text.StartsWith([Name], "~$")),
    ReadOne = (content as binary) as table =>
        let
            Sheet = Excel.Workbook(content, null, true){0}[Data],
            Body = Table.Skip(Sheet, each not List.Contains({"Client ID", "Entry ID"}, try Text.From([Column1]) otherwise "")),
            Promoted = Table.PromoteHeaders(Body, [PromoteAllScalars = true])
        in
            Promoted,
    WithData = Table.AddColumn(Workbooks, "Data", each ReadOne([Content])),
    WithKind = Table.AddColumn(WithData, "Kind", each
        let
            cols = Table.ColumnNames([Data])
        in
            if List.Contains(cols, "exit_date") then "moves"
            else if List.Contains(cols, "Client ID(s)") then "groups"
            else if List.Contains(cols, "Service Type") then "services"
            else if List.Contains(cols, "programs") then "clients"
            else "other"),
    Result = Table.SelectColumns(WithKind, {"Name", "Kind", "Data"})
in
    Result
```

Check: the preview should list four files with Kind set to clients, moves, services, and groups.

### Query 2: `Clients`

One row per Keys of Hope woman. Never loads names, phone numbers, emails, or birth dates.

```
let
    Raw = Table.Combine(Table.SelectRows(ExportFiles, each [Kind] = "clients")[Data]),
    Keep = Table.SelectColumns(Raw, {"Client ID", "programs", "race_1", "raceHispanic", "veteran", "disabilities", "countyOfOrigin", "educationLevel", "incomeLimits", "eligibleForRecovery"}, MissingField.UseNull),
    KOH = Table.SelectRows(Keep, each [programs] <> null and Text.Contains(Text.From([programs]), "Keys of Hope", Comparer.OrdinalIgnoreCase)),
    Renamed = Table.RenameColumns(KOH, {{"Client ID", "client_id"}}),
    AsText = Table.TransformColumns(Renamed, {}, each if _ = null or Text.Trim(Text.From(_)) = "" then "Not recorded" else Text.Trim(Text.From(_))),
    OnePerWoman = Table.Distinct(AsText, {"client_id"}),
    Typed = Table.TransformColumnTypes(OnePerWoman, List.Transform(Table.ColumnNames(OnePerWoman), each {_, type text}))
in
    Typed
```

### Query 3: `Stays`

One row per stay at Keys of Hope.

```
let
    ReasonMap = [#"9" = "Completed Program Term", #"10" = "Client Choice to Withdraw", #"1" = "Chronic Non-payment of Rent", #"2" = "Non-compliance with Program Rules", #"3" = "Violation of the Lease Agreement", #"11" = "Left Housing/Program Without Notice", #"4" = "Other", #"77" = "Different Room within Same Shelter"],
    DestMap = [#"1" = "Domestic violence emergency shelter", #"2" = "Health care facility/substance abuse treatment program", #"3" = "Homeless emergency shelter", #"4" = "Hotel or motel", #"5" = "Incarceration/jail", #"6" = "Permanent housing of choice", #"7" = "Temporary housing with family or friends", #"8" = "Transitional housing", #"99" = "Unknown", #"10" = "Other"],
    HousingMap = [#"1" = "Rental", #"2" = "Public Housing", #"3" = "Home Ownership"],

    ToText = (v) => if v = null then null else Text.Trim(Text.From(v)),
    ToDate = (v) =>
        let
            d = try Date.From(v) otherwise null
        in
            if d <> null and Date.Year(d) > 1990 then d else null,
    Lookup = (map as record, v) => if v = null or v = "" then null else Record.FieldOrDefault(map, v, v),

    Raw = Table.Combine(Table.SelectRows(ExportFiles, each [Kind] = "moves")[Data]),
    Keep = Table.SelectColumns(Raw, {"Client ID", "date", "exit_date", "exit_reason", "exit_destination", "permanentHousingType"}, MissingField.UseNull),
    AsText = Table.TransformColumns(Keep, {{"Client ID", ToText}, {"exit_reason", ToText}, {"exit_destination", ToText}, {"permanentHousingType", ToText}}),
    KOHClients = List.Buffer(Clients[client_id]),
    KOH = Table.SelectRows(AsText, each List.Contains(KOHClients, [Client ID])),
    Named = Table.TransformColumns(KOH, {{"exit_reason", each Lookup(ReasonMap, _)}, {"exit_destination", each Lookup(DestMap, _)}, {"permanentHousingType", each Lookup(HousingMap, _)}}),
    Renamed = Table.RenameColumns(Named, {{"Client ID", "client_id"}, {"date", "entry_date"}, {"permanentHousingType", "permanent_housing_type"}}),
    Dates = Table.TransformColumns(Renamed, {{"entry_date", ToDate, type nullable date}, {"exit_date", ToDate, type nullable date}}),
    Real = Table.SelectRows(Dates, each [entry_date] <> null and [exit_reason] <> "Different Room within Same Shelter"),
    Typed = Table.TransformColumnTypes(Real, {{"client_id", type text}, {"exit_reason", type text}, {"exit_destination", type text}, {"permanent_housing_type", type text}})
in
    Typed
```

### Query 4: `Attendance`

One row per woman per workshop or service. A workshop is any group session recorded in EmpowerDB.

```
let
    GroupMap = [#"18" = "KOH Support Group", #"21" = "Financial Literacy", #"23" = "Life Skills", #"20" = "Workforce Development", #"22" = "Physical/Mental Health", #"24" = "Housing", #"19" = "ARP Group", #"4" = "Knox English Support Group", #"5" = "Knox Immigrant/Refugee Support Group", #"6" = "Knox Hispanic Support Group", #"10" = "Anderson English Support Group", #"11" = "Anderson Hispanic Support Group", #"12" = "Anderson Immigrant/Refugee Support Group"],
    ServiceMap = [#"2" = "Case management", #"14" = "Housing advocacy", #"12" = "Employment counseling", #"13" = "Financial counseling", #"11" = "Education advocacy", #"8" = "Individual counseling", #"18" = "Individual therapy", #"17" = "Individual advocacy", #"28" = "Beyond Trauma curriculum", #"27" = "Relocation advocacy", #"3" = "Child or dependent care assistance"],

    ToText = (v) => if v = null then null else Text.Trim(Text.From(v)),
    ToDate = (v) => try Date.From(v) otherwise null,
    Lookup = (map as record, v) => if v = null or v = "" then null else Record.FieldOrDefault(map, v, v),
    Pick = (kind as text) => Table.Combine(Table.SelectRows(ExportFiles, each [Kind] = kind)[Data]),

    S0 = Table.SelectColumns(Pick("services"), {"Date", "Client ID", "Service Type", "Time Value 1"}, MissingField.UseNull),
    S1 = Table.RenameColumns(S0, {{"Client ID", "client_id"}, {"Service Type", "activity_type"}}),
    S2 = Table.TransformColumns(S1, {{"client_id", ToText}, {"activity_type", each Lookup(ServiceMap, ToText(_))}}),
    S3 = Table.AddColumn(S2, "activity_kind", each "Service"),

    G0 = Table.SelectColumns(Pick("groups"), {"Date", "Client ID(s)", "Group Type", "Time Value 1"}, MissingField.UseNull),
    G1 = Table.RenameColumns(G0, {{"Client ID(s)", "client_id"}, {"Group Type", "activity_type"}}),
    G2 = Table.TransformColumns(G1, {{"client_id", each if _ = null then {} else List.Select(Text.SplitAny(Text.From(_), ",;| #(lf)#(cr)"), each _ <> "")}, {"activity_type", each Lookup(GroupMap, ToText(_))}}),
    G3 = Table.ExpandListColumn(G2, "client_id"),
    G4 = Table.AddColumn(G3, "activity_kind", each "Workshop"),

    Both = Table.Combine({S3, G4}),
    KOHClients = List.Buffer(Clients[client_id]),
    KOH = Table.SelectRows(Both, each List.Contains(KOHClients, [client_id])),
    Renamed = Table.RenameColumns(KOH, {{"Date", "activity_date"}, {"Time Value 1", "hours"}}),
    Clean = Table.TransformColumns(Renamed, {{"activity_date", ToDate, type nullable date}, {"hours", each try Number.From(_) otherwise null, type nullable number}}),
    Typed = Table.TransformColumnTypes(Clean, {{"client_id", type text}, {"activity_type", type text}, {"activity_kind", type text}})
in
    Typed
```

Click **Close & Apply**.

## 4. Apply the YWCA look

View > Themes > Browse for themes > `dashboard/ywca-theme.json`

## 5. Add a date table

Modeling > New table:

```
Date = ADDCOLUMNS(
    CALENDAR(MIN(Stays[entry_date]), TODAY()),
    "Month Start", DATE(YEAR([Date]), MONTH([Date]), 1),
    "Grant Year", IF(MONTH([Date]) >= 7, YEAR([Date]) & "-" & RIGHT(YEAR([Date]) + 1, 2), YEAR([Date]) - 1 & "-" & RIGHT(YEAR([Date]), 2))
)
```

The grant year runs July to June. "2026-27" means July 2026 through June 2027.

## 6. Relationships (Model view)

| From (one) | To (many) | Active |
|---|---|---|
| `Date[Date]` | `Stays[entry_date]` | Yes |
| `Date[Date]` | `Stays[exit_date]` | **No** |
| `Date[Date]` | `Attendance[activity_date]` | Yes |
| `Clients[client_id]` | `Stays[client_id]` | Yes |
| `Clients[client_id]` | `Attendance[client_id]` | Yes |

Do not link `Stays` to `Attendance`.

## 7. Measures

Modeling > New measure, one at a time. Names match the labels on the page.

**Today**

```
Capacity = 70
```

```
Women Living Here Today = CALCULATE(COUNTROWS(Stays), REMOVEFILTERS('Date'), ISBLANK(Stays[exit_date])) + 0
```

```
Beds Filled Today = DIVIDE([Women Living Here Today], [Capacity])
```

**In the chosen time period**

```
Moved In = COUNTROWS(Stays) + 0
```

```
Left = CALCULATE(COUNTROWS(Stays), USERELATIONSHIP('Date'[Date], Stays[exit_date]), NOT ISBLANK(Stays[exit_date])) + 0
```

```
Moved Into Permanent Housing = CALCULATE([Left], Stays[exit_destination] = "Permanent housing of choice")
```

```
Percent Moved Into Permanent Housing = IF([Left] >= 5, DIVIDE([Moved Into Permanent Housing], [Left]))
```

```
Left Before Two-Year Mark = CALCULATE([Left], Stays[exit_reason] <> "Completed Program Term")
```

```
Average Length Of Stay Days =
IF(
    [Left] >= 5,
    CALCULATE(
        AVERAGEX(Stays, DATEDIFF(Stays[entry_date], Stays[exit_date], DAY)),
        USERELATIONSHIP('Date'[Date], Stays[exit_date]),
        NOT ISBLANK(Stays[exit_date])
    )
)
```

**For charts and tables**

```
Women Living Here On Date =
VAR d = MAX('Date'[Date])
RETURN CALCULATE(
    COUNTROWS(FILTER(Stays, Stays[entry_date] <= d && (ISBLANK(Stays[exit_date]) || Stays[exit_date] > d))),
    REMOVEFILTERS('Date')
)
```

```
Left (5 or more) = VAR n = [Left] RETURN IF(n >= 5, n)
```

**Page 2**

```
Women Served =
VAR lo = MIN('Date'[Date])
VAR hi = MAX('Date'[Date])
RETURN CALCULATE(
    COUNTROWS(DISTINCT(SELECTCOLUMNS(
        FILTER(Stays, Stays[entry_date] <= hi && (ISBLANK(Stays[exit_date]) || Stays[exit_date] >= lo)),
        "c", Stays[client_id]
    ))),
    REMOVEFILTERS('Date')
) + 0
```

```
Women Served (5 or more) = VAR n = [Women Served] RETURN IF(n >= 5, n)
```

```
Percent From Knox County = IF([Women Served] >= 5, DIVIDE(CALCULATE([Women Served], Clients[countyOfOrigin] = "Knox County"), [Women Served]))
```

```
Percent Eligible For Recovery Services = IF([Women Served] >= 5, DIVIDE(CALCULATE([Women Served], Clients[eligibleForRecovery] = "Yes"), [Women Served]))
```

```
Percent Extremely Low Income = IF([Women Served] >= 5, DIVIDE(CALCULATE([Women Served], Clients[incomeLimits] = "Extremely Low"), [Women Served]))
```

Format the percent measures as Percentage with 0 decimals.

**Decided with the program director on November 19, 2026**

- Success is any move into "Permanent housing of choice", whenever it happens.
- "Left before the two-year mark" is any exit reason other than "Completed Program Term".
- Capacity is 70.

## 8. Columns for the workshop charts

Select the `Stays` table, then Modeling > New column, one at a time.

```
Stay Days = MAX(1, DATEDIFF(Stays[entry_date], IF(ISBLANK(Stays[exit_date]), TODAY(), Stays[exit_date]), DAY))
```

```
Workshops =
COUNTROWS(
    FILTER(
        Attendance,
        Attendance[client_id] = Stays[client_id]
            && Attendance[activity_kind] = "Workshop"
            && Attendance[activity_date] >= Stays[entry_date]
            && (ISBLANK(Stays[exit_date]) || Attendance[activity_date] <= Stays[exit_date])
    )
) + 0
```

```
Workshops Per Month = DIVIDE(Stays[Workshops], Stays[Stay Days] / 30)
```

```
Workshop Attendance = SWITCH(TRUE(),
    Stays[Workshops Per Month] >= 12, "12 or more a month",
    Stays[Workshops Per Month] >= 2, "2 to 11 a month",
    "Under 2 a month"
)
```

```
Workshop Attendance Order = SWITCH(TRUE(), Stays[Workshops Per Month] >= 12, 3, Stays[Workshops Per Month] >= 2, 2, 1)
```

Select `Workshop Attendance`, then Column tools > Sort by column > `Workshop Attendance Order`.

The cut points of 2 and 12 are placeholders. The program director should set them.

## 9. Check the numbers before building pages

Put these measures on a blank page as cards. Add a slicer on `Date[Date]`, set to Between, from 1/1/2026 to today. With the sample files, you should see:

| Measure | Expected |
|---|---|
| Women Living Here Today | 70 |
| Moved In | 96 |
| Left | 89 |
| Percent Moved Into Permanent Housing | 51% |
| Average Length Of Stay Days | 213 |
| Left Before Two-Year Mark | 19 |
| Women Served | 159 |

These are the numbers `dashboard/KeysOfHope_dashboard.html` shows for "Since January 2026" on the same files. If one is off, fix it before building the pages.

## 10. Build the pages

Page size 16:9. Use these titles word for word.

### Page 1: Program overview

**Top row, seven cards**

| Card title | Measure |
|---|---|
| Moved into permanent housing | Percent Moved Into Permanent Housing |
| Women living here today | Women Living Here Today |
| Beds filled today | Beds Filled Today |
| Moved in | Moved In |
| Left | Left |
| Average length of stay (days) | Average Length Of Stay Days |
| Left before the two-year mark | Left Before Two-Year Mark |

Make the first card the largest. It is the headline.

**Middle row**

| Visual | Title | Fields |
|---|---|---|
| Table | Where women went when they left | `Stays[exit_destination]`, Left (5 or more) |
| Table | Reason recorded for leaving | `Stays[exit_reason]`, Left (5 or more) |
| Line chart | Women living here, month by month | Axis `Date[Date]`, value Women Living Here On Date |

On the line chart, in the Analytics pane: add a Y-axis constant line at 70 (label "70 beds") and an X-axis constant line at 3/1/2026 (label "Relaunch").

On both tables, add a visual-level filter: `Stays[exit_date]` is not blank.

**Bottom row**

| Visual | Title | Fields |
|---|---|---|
| Clustered column | Women moving in and leaving, by month | Axis `Date[Month Start]`, values Moved In and Left |
| Bar chart | Workshop attendance and housing | Axis `Stays[Workshop Attendance]`, value Percent Moved Into Permanent Housing |
| Bar chart | Workshop attendance and length of stay | Axis `Stays[Workshop Attendance]`, value Average Length Of Stay Days |

Under the first workshop chart, add a text box: "Of the women who left, the share who moved into permanent housing, grouped by how many workshops each woman attended. This shows a pattern, not proof that workshops cause the result."

### Page 2: Who we serve

**Top row, four cards**

| Card title | Measure |
|---|---|
| Women served | Women Served |
| From Knox County | Percent From Knox County |
| Eligible for recovery services | Percent Eligible For Recovery Services |
| Extremely low income | Percent Extremely Low Income |

Which four facts lead this page is the program director's call.

**Six bar charts, value Women Served (5 or more) on each**

| Title | Axis |
|---|---|
| Race | `Clients[race_1]` |
| County of origin | `Clients[countyOfOrigin]` |
| Education | `Clients[educationLevel]` |
| Household income level | `Clients[incomeLimits]` |
| Has a disability | `Clients[disabilities]` |
| Veteran | `Clients[veteran]` |

Add a text box: "Counts every woman who lived at Keys of Hope at any point in the chosen time period. Groups of fewer than 5 women are hidden."

### Filters on both pages

1. Add a slicer on `Date[Grant Year]` and a slicer on `Date[Date]` (Between).
2. Set the date slicer to start at 1/1/2026.
3. View > Sync slicers, and tick both pages for both slicers.

## 11. Privacy checks

- No visual lists one row per woman.
- Tables and bar charts use the "(5 or more)" measures, so small groups are hidden.
- Percentages and the average show blank when fewer than 5 women left in the period.
- The queries never load names, phone numbers, emails, birth dates, addresses, or notes.

## 12. Hand it over

1. File > Export > Power BI template. This saves a `.pbit` file with no data in it.
2. Move the `.pbit` file to a YWCA computer. This is the only file that travels.
3. On that computer, open it. Power BI asks for `ExportFolder`. Enter the folder where the program director saves her exports.
4. Save it as a normal `.pbix` file on that computer.

## 13. The weekly update

1. In EmpowerDB: EmpowerDB Administration > Table Export.
2. Export Clients, Move Ins & Exits, Services, and Groups to Excel.
3. Save them into the exports folder, replacing last week's files.
4. Open the report and click **Refresh**.

## 14. Later: share it through SharePoint

This lets counselors and the CEO open the report in a browser, and removes step 4 above.

1. Make the exports folder a SharePoint folder that only the right staff can open.
2. In the `ExportFiles` query, replace the `Source` line with these two lines, using YWCA's real site address and folder name:

```
    Site = SharePoint.Files("https://YOURTENANT.sharepoint.com/sites/YOURSITE", [ApiVersion = 15]),
    Source = Table.SelectRows(Site, each Text.Contains([Folder Path], "/Keys of Hope exports/")),
```

3. Publish the report to a YWCA Power BI workspace.
4. In the workspace, open the dataset settings, sign in under Data source credentials, and turn on Scheduled refresh (for example, Fridays at 5 p.m.).

Before doing this, the program director and YWCA's IT contact should agree to it. Publishing puts client-level rows, without names, in YWCA's Power BI workspace. Each person who views the report generally needs a Power BI Pro license.

## What is assumed and not yet confirmed on real exports

- Dropdown answers may export as numbers or as words. The queries handle both.
- Yes and No fields (`veteran`, `disabilities`, `eligibleForRecovery`) are assumed to export as "Yes" and "No".
- `incomeLimits` is assumed to use "Extremely Low", and `countyOfOrigin` to use "Knox County".
- A woman listed under Keys of Hope and another housing program will have all her stays counted. Check this with the program director.
- In the Groups export, "Client ID(s)" is assumed to hold several IDs in one cell, split by commas, semicolons, spaces, or line breaks.
