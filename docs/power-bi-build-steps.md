# Power BI build steps

Build on the made-up data in `data/sample/`. The categories (exit reasons, exit destinations, rooms, group and service names) match the choices in YWCA's EmpowerDB entry form. The column names are placeholders until we see real export headers. Never load real resident data on a volunteer machine.

## 1. Load the data

Home > Get data > Text/CSV. Load both files:

- `data/sample/stays.csv` as a table named `Stays` (one row per woman's stay)
- `data/sample/services.csv` as a table named `Services` (one row per group, class, or meeting attended)

Check that the date columns came in as dates.

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
| `Stays[client_id]` | `Services[client_id]` | Yes (one to many) |

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

```
Average Stay Days = CALCULATE(
    AVERAGEX(Stays, DATEDIFF(Stays[entry_date], Stays[exit_date], DAY)),
    USERELATIONSHIP('Date'[Date], Stays[exit_date]),
    NOT ISBLANK(Stays[exit_date])
)
```

```
Percent In Financial Literacy = DIVIDE(
    CALCULATE(DISTINCTCOUNT(Services[client_id]), Services[service_type] = "Financial Literacy"),
    DISTINCTCOUNT(Stays[client_id])
)
```

Counting every exit reason other than "Completed Program Term" as an early exit is a placeholder. The program director should confirm it.

## 6. Columns for the engagement page

Select the `Stays` table, then Modeling > New column, one at a time.

```
Stay Days = DATEDIFF(Stays[entry_date], IF(ISBLANK(Stays[exit_date]), TODAY(), Stays[exit_date]), DAY)
```

```
Sessions = COUNTROWS(RELATEDTABLE(Services))
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

- Cards: Residents Now, Capacity, Percent To Permanent Housing, Average Stay Days
- Line chart: `Date[Month]` by Residents On Date, with a constant line at 70
- Column chart: `Date[Month]` by Entries and Exits
- Bar chart: `Stays[exit_destination]` by Exits
- Bar chart: `Stays[exit_reason]` by Exits
- Slicers: `Date[Year]`, `Stays[counselor]`

**Page 2: Does engagement help?**

- Bar chart: `Stays[Engagement]` by Percent To Permanent Housing
- Bar chart: `Stays[Engagement]` by Average Stay Days
- Bar chart: `Services[service_type]` by count of rows, split by `Services[activity_kind]`
- Card: Percent In Financial Literacy

## 8. Privacy checks before anyone sees real numbers

- No table visual that lists one row per client.
- Any group with 1 to 4 women is shown as "Fewer than 5" or folded into "Other".
- Save a copy as a template (File > Export > Power BI template, a `.pbit` file). The template holds no data, so it is the safe file to move to a YWCA machine.

## 9. Before using real exports

- EmpowerDB has an exit reason called "Different Room within Same Shelter". That is a room change, not an exit. Filter those rows out of exit counts and join them into one stay.
- Filter every table to the Keys of Hope program.
- Remove name, birth date, address, phone, and email columns before loading.
