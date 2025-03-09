The AdvancedDataTable component is designed to offer advanced functionalities for displaying tabular data in a Salesforce Lightning Web Component (LWC). Key features include:

Lazy Loading: Loads data incrementally as the user scrolls, improving performance with large datasets.
Sorting: Allows for sorting of the table data by different columns.
Row Selection: Supports row selection and allows for maintaining the state of selected rows across data updates.
Multi-Line Searching: Implements searching with multi-line input, with support for pasted text from spreadsheets.
Read-only Table: Supports an additional read-only table that can show selected data.
Data Integrity: Ensures that the selected rows are correctly reflected even after data updates or sorting.
The component uses service functions from dataTableService to assist with handling row selection, sorting, and searching logic, making it modular and easily maintainable. The component can be used in Salesforce applications where large datasets need to be displayed efficiently with dynamic features like sorting and searching.

Demo cmp also added for reference accountSearch 
