# Power BI build steps

The three files in `data/sample/` are made up. They have the same file names, the same title row, and the same column names as YWCA's real EmpowerDB table exports, so a report built on them should work when the director points it at her real exports on her own machine.

Never load real resident data on a volunteer machine.

## 1. Load the data

Put the three sample files in a folder, for example `C:\KeysOfHope\`.

In Power BI Desktop: Home > Get data > Blank query > Advanced Editor. Paste the query, change the file path at the top, click Done, and rename the query. Do this three times, in order.

If you see a "Formula.Firewall" error: File > Options and settings > Options > Privacy (under Current File) > Ignore the Privacy Levels.

### Query 1, named `Clients`

This is the list of Keys of Hope women, picked by the program column. It also carries the demographics funders ask for. It never loads names, phone numbers, emails, or birth dates.

```
let
    FilePath = "C:\KeysOfHope\Clients.xlsx",
    Raw = Excel.Workbook(File.Contents(FilePath), null, true){0}[Data],
    Headers = Table.PromoteHeaders(Table.Skip(Raw, 1), [PromoteAllScalars = true]),
    Keep = Table.SelectColumns(Headers, {"Client ID", "programs", "gender", "race_1", "raceHispanic", "veteran", "disabilities", "countyOfOrigin", "educationLevel", "incomeLimits", "eligibleForRecovery"}),
    KOH = Table.SelectRows(Keep, each [programs] <> null and Text.Contains(Text.From([programs]), "Keys of Hope")),
    Renamed = Table.RenameColumns(KOH, {{"Client ID", "client_id"}}),
    AsText = Table.TransformColumns(Renamed, {}, each if _ = null then null else Text.Trim(Text.From(_))),
    Typed = Table.TransformColumnTypes(AsText, List.Transform(Table.ColumnNames(AsText), each {_, type text}))
in
    Typed
```

### Query 2, named `Stays`

```
let
    FilePath = "C:\KeysOfHope\Move in.xlsx",

    ReasonMap = [#"9" = "Completed Program Term", #"10" = "Client Choice to Withdraw", #"1" = "Chronic Non-payment of Rent", #"2" = "Non-compliance with Program Rules", #"3" = "Violation of the Lease Agreement", #"11" = "Left Housing/Program Without Notice", #"4" = "Other", #"77" = "Different Room within Same Shelter"],
    DestMap = [#"1" = "Domestic violence emergency shelter", #"2" = "Health care facility/substance abuse treatment program", #"3" = "Homeless emergency shelter", #"4" = "Hotel or motel", #"5" = "Incarceration/jail", #"6" = "Permanent housing of choice", #"7" = "Temporary housing with family or friends", #"8" = "Transitional housing", #"99" = "Unknown", #"10" = "Other"],
    HousingMap = [#"1" = "Rental", #"2" = "Public Housing", #"3" = "Home Ownership"],

    ToText = (v) => if v = null then null else Text.Trim(Text.From(v)),
    ToDate = (v) => try Date.From(v) otherwise null,
    Lookup = (map as record, v) => if v = null or v = "" then null else Record.FieldOrDefault(map, v, v),

    Raw = Excel.Workbook(File.Contents(FilePath), null, true){0}[Data],
    Headers = Table.PromoteHeaders(Table.Skip(Raw, 1), [PromoteAllScalars = true]),
    Keep = Table.SelectColumns(Headers, {"Client ID", "id_slot", "date", "exit_date", "exit_reason", "exit_destination", "permanentHousingType"}),
    AsText = Table.TransformColumns(Keep, {{"Client ID", ToText}, {"id_slot", ToText}, {"exit_reason", ToText}, {"exit_destination", ToText}, {"permanentHousingType", ToText}}),
    KOHClients = List.Buffer(Clients[client_id]),
    KOH = Table.SelectRows(AsText, each List.Contains(KOHClients, [Client ID])),
    Named = Table.TransformColumns(KOH, {{"exit_reason", each Lookup(ReasonMap, _)}, {"exit_destination", each Lookup(DestMap, _)}, {"permanentHousingType", each Lookup(HousingMap, _)}}),
    Renamed = Table.RenameColumns(Named, {{"Client ID", "client_id"}, {"date", "entry_date"}, {"permanentHousingType", "permanent_housing_type"}}),
    Dates = Table.TransformColumns(Renamed, {{"entry_date", ToDate, type nullable date}, {"exit_date", ToDate, type nullable date}}),
    Real = Table.SelectRows(Dates, each [entry_date] <> null and [exit_reason] <> "Different Room within Same Shelter"),
    Typed = Table.TransformColumnTypes(Real, {{"client_id", type text}, {"id_slot", type text}, {"exit_reason", type text}, {"exit_destination", type text}, {"permanent_housing_type", type text}})
in
    Typed
```

### Query 3, named `Services`

This joins the Services and Groups exports into one table of attendance and keeps only women who appear in `Stays`.

```
let
    ServicesPath = "C:\KeysOfHope\Services.xlsx",
    GroupsPath = "C:\KeysOfHope\Groups.xlsx",

    GroupMap = [#"18" = "KOH Support Group", #"21" = "Financial Literacy", #"23" = "Life Skills", #"20" = "Workforce Development", #"22" = "Physical/Mental Health", #"24" = "Housing", #"19" = "ARP Group", #"4" = "Knox English Support Group", #"5" = "Knox Immigrant/Refugee Support Group", #"6" = "Knox Hispanic Support Group", #"10" = "Anderson English Support Group", #"11" = "Anderson Hispanic Support Group", #"12" = "Anderson Immigrant/Refugee Support Group"],
    ServiceMap = [#"2" = "Case management", #"14" = "Housing advocacy", #"12" = "Employment counseling", #"13" = "Financial counseling", #"11" = "Education advocacy", #"8" = "Individual counseling", #"18" = "Individual therapy", #"17" = "Individual advocacy", #"28" = "Beyond Trauma curriculum", #"27" = "Relocation advocacy", #"3" = "Child or dependent care assistance"],

    ToText = (v) => if v = null then null else Text.Trim(Text.From(v)),
    ToDate = (v) => try Date.From(v) otherwise null,
    Lookup = (map as record, v) => if v = null or v = "" then null else Record.FieldOrDefault(map, v, v),
    Load = (path) => Table.PromoteHeaders(Table.Skip(Excel.Workbook(File.Contents(path), null, true){0}[Data], 1), [PromoteAllScalars = true]),

    S0 = Table.SelectColumns(Load(ServicesPath), {"Date", "Client ID", "Service Type", "Time Value 1"}),
    S1 = Table.RenameColumns(S0, {{"Client ID", "client_id"}, {"Service Type", "service_type"}}),
    S2 = Table.TransformColumns(S1, {{"client_id", ToText}, {"service_type", each Lookup(ServiceMap, ToText(_))}}),
    S3 = Table.AddColumn(S2, "activity_kind", each "Service"),

    G0 = Table.SelectColumns(Load(GroupsPath), {"Date", "Client ID(s)", "Group Type", "Time Value 1"}),
    G1 = Table.RenameColumns(G0, {{"Client ID(s)", "client_id"}, {"Group Type", "service_type"}}),
    G2 = Table.TransformColumns(G1, {{"client_id", each if _ = null then {} else List.Select(Text.SplitAny(Text.From(_), ",;| #(lf)#(cr)"), each _ <> "")}, {"service_type", each Lookup(GroupMap, ToText(_))}}),
    G3 = Table.ExpandListColumn(G2, "client_id"),
    G4 = Table.AddColumn(G3, "activity_kind", each "Group"),

    Both = Table.Combine({S3, G4}),
    KOHClients = List.Buffer(List.Distinct(Stays[client_id])),
    KOH = Table.SelectRows(Both, each List.Contains(KOHClients, [client_id])),
    Renamed = Table.RenameColumns(KOH, {{"Date", "service_date"}, {"Time Value 1", "hours"}}),
    Clean = Table.TransformColumns(Renamed, {{"service_date", ToDate, type nullable date}, {"hours", each try Number.From(_) otherwise null, type nullable number}}),
    Typed = Table.TransformColumnTypes(Clean, {{"client_id", type text}, {"service_type", type text}, {"activity_kind", type text}})
in
    Typed
```

Click Close & Apply.

**What these queries assume, not yet confirmed on a real export**

- The first row of each export is a title, and the column names are on row 2. (Confirmed from the header files.)
- Dropdown answers may come out as numbers (9) or as words (Completed Program Term). The queries handle both.
- A Keys of Hope woman is one whose `programs` value in the Clients export contains "Keys of Hope". (Confirmed: that column holds program names in words, with commas between several programs.) A woman who was also in another YWCA housing program will have her stays there counted too. Check this with the program director.
- In the Groups export, "Client ID(s)" holds several IDs in one cell, separated by commas, semicolons, spaces, or line breaks.
- "Time Value 1" is direct time in hours.

## 2. Apply the YWCA look

View > Themes > Browse for themes > `dashboard/ywca-theme.json`

## 3. Add a date table

Modeling > New table:

```
Date = ADDCOLUMNS(
    CALENDAR(DATE(2024, 12, 1), TODAY()),
    "Month", FORMAT([Date], "YYYY-MM"),
    "Year", YEAR([Date])
)
```

## 4. Relationships (Model view)

| From | To | Active |
|---|---|---|
| `Date[Date]` | `Stays[entry_date]` | Yes |
| `Date[Date]` | `Stays[exit_date]` | No |
| `Date[Date]` | `Services[service_date]` | Yes |
| `Clients[client_id]` | `Stays[client_id]` | Yes (one to many) |

Do not link `Stays` to `Services`. A woman can have more than one stay.

## 5. Measures

Paste each one with Modeling > New measure.

```
Capacity = 70
```

```
Residents Now = CALCULATE(COUNTROWS(Stays), REMOVEFILTERS('Date'), ISBLANK(Stays[exit_date]))
```

```
Residents On Date =
VAR d = MAX('Date'[Date])
RETURN CALCULATE(
    COUNTROWS(FILTER(Stays, Stays[entry_date] <= d && (ISBLANK(Stays[exit_date]) || Stays[exit_date] > d))),
    REMOVEFILTERS('Date')
)
```

```
Entries = COUNTROWS(Stays)
```

```
Exits = CALCULATE(
    COUNTROWS(Stays),
    USERELATIONSHIP('Date'[Date], Stays[exit_date]),
    NOT ISBLANK(Stays[exit_date])
)
```

```
Exits To Permanent Housing = CALCULATE([Exits], Stays[exit_destination] = "Permanent housing of choice")
```

```
Percent To Permanent Housing = DIVIDE([Exits To Permanent Housing], [Exits])
```

```
Early Exits = CALCULATE([Exits], Stays[exit_reason] <> "Completed Program Term")
```

The program director confirmed this definition of an early exit on November 19, 2026.

```
Average Stay Days = CALCULATE(
    AVERAGEX(Stays, DATEDIFF(Stays[entry_date], Stays[exit_date], DAY)),
    USERELATIONSHIP('Date'[Date], Stays[exit_date]),
    NOT ISBLANK(Stays[exit_date])
)
```

```
Women In Financial Literacy = CALCULATE(DISTINCTCOUNT(Services[client_id]), Services[service_type] = "Financial Literacy")
```

## 6. Columns for the engagement page

Select the `Stays` table, then Modeling > New column, one at a time.

```
Stay Days = DATEDIFF(Stays[entry_date], IF(ISBLANK(Stays[exit_date]), TODAY(), Stays[exit_date]), DAY)
```

```
Sessions =
COUNTROWS(
    FILTER(
        Services,
        Services[client_id] = Stays[client_id]
            && Services[service_date] >= Stays[entry_date]
            && (ISBLANK(Stays[exit_date]) || Services[service_date] <= Stays[exit_date])
    )
) + 0
```

```
Sessions Per Month = DIVIDE(Stays[Sessions], Stays[Stay Days] / 30)
```

```
Engagement = SWITCH(TRUE(),
    Stays[Sessions Per Month] >= 8, "3 High (8 or more a month)",
    Stays[Sessions Per Month] >= 4, "2 Medium (4 to 7 a month)",
    "1 Low (under 4 a month)"
)
```

The cut points of 4 and 8 are placeholders. The program director should set them.

## 7. Pages

**Page 1: The house today**

- Cards: Residents Now, Capacity, Percent To Permanent Housing, Average Stay Days, Early Exits
- Line chart: `Date[Month]` by Residents On Date, with a constant line at 70
- Column chart: `Date[Month]` by Entries and Exits
- Bar chart: `Stays[exit_destination]` by Exits
- Bar chart: `Stays[exit_reason]` by Exits
- Slicer: `Date[Year]`

**Page 2: Does engagement help?**

- Bar chart: `Stays[Engagement]` by Percent To Permanent Housing
- Bar chart: `Stays[Engagement]` by Average Stay Days
- Bar chart: `Services[service_type]` by count of rows, split by `Services[activity_kind]`
- Card: Women In Financial Literacy

**Page 3: Who we serve**

- Bar charts from `Clients`: `race_1`, `countyOfOrigin`, `educationLevel`, `incomeLimits`, `veteran`, each by count of rows
- Fold any answer with fewer than 5 women into "Other"

## 8. Privacy checks before anyone sees real numbers

- No table visual that lists one row per client.
- Any group with 1 to 4 women is shown as "Fewer than 5" or folded into "Other".
- Save a copy as a template (File > Export > Power BI template, a `.pbit` file). The template holds no data, so it is the safe file to move to a YWCA machine.

## 9. Moving to real exports (on a YWCA machine only)

1. Open the `.pbit` template.
2. In Transform data, change the four file paths to the real exports.
3. The real Services export stopped at 50,000 rows in one file ("records 0 and higher"). If EmpowerDB offers a second file, it has to be added to the query, or older records will be missing.
4. The room list in EmpowerDB does not match how rooms are assigned today (rooms are tracked on paper). The dashboard does not show rooms. It only uses the room choice to tell Keys of Hope move-ins from other programs.
