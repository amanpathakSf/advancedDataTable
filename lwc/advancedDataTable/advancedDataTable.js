
/**
 * @class AdvancedDataTable
 * @description This component provides a data table with advanced features like, 
 * lazy loading, sorting, row selection, and multi line searching.
 * 
 * @author Aman Pathak /Abdul Quadir Kotwala / Ashish Singh
 * @Date: 9th March 2025
 * @company Salesforce
 * @copyright © 2025 Salesforce. All rights reserved.
 */

import { LightningElement, track, api } from 'lwc';
import dataTableService from "c/dataTableService";

const PAGE_SIZE = 15;
const ENTER_KEY_CODE = 13;

export default class AdvancedDataTable extends LightningElement {

    // Lazy loading variables
    offset = 0;
    isLazyLoading = true;
    dataTableValue = []; // Shallow copy of data got from server

    @track dataToShow = [];
    @track selectedRowsArray = [];

    // Columns 
    _columns = [];
    @api get columns() {
        return this._columns;
    }
    set columns(value) {
        this._columns = value;
    }

    // Pre-selection 
    _preSelection;
    @track selectedIds = [];
    @track preSelectedRows = [];
    @track selectedRows = new Set(); // Set to maintain selected row IDs

    /**
     * @description Handles pre-selection of rows when passed an array of row IDs.
     * @param {Array} value - Array of row IDs to pre-select.
     */
    @api preSelection(value) {
        if (value) {
            this.selectedRowsArray = value;
            this.selectedIds.push(value);
            this.setSelectedRowsToDatatable(this.selectedRowsArray);
        }
    }

    // Table data variables
    _tableData = [];
    @api tableName;

    /**
     * @description Getter for tableData property.
     * @returns {Array} - Returns the current table data.
     */
    get tableData() {
        return this._tableData;
    }

    /**
     * @description Setter for tableData property. Updates the table data and handles lazy laoding.
     * @param {Array} value - Data from the server to populate the table.
     */
    @api set tableData(value) {
        if (value && value !== this._tableData) {
            this._tableData = value;
            this.dataTableValue = [...this._tableData];
            this.dataToShow = this.dataTableValue.slice(0, PAGE_SIZE);
            this.setDataToReadOnlyTable();
        } else if (!value?.length) {
            this._tableData = [];
        }
    }

    // Sorting
    sortedBy;
    sortedDirection;

    // Searching
    @track searchValue = '';
    @api searchableFields;

    // Read-only tables
    @track selectedData = [];
    @track selectedDataToShow = [];
    @track selectedDataToShowBackup = [];
    @track isReadonlyLoading = false;

    /**
     * @description Dynamically returns the class name for table container based on data length.
     * @returns {string} - Class name to apply based on the table data length.
     */
    get tableContainerClass() {
        return this.tableData?.length > 5 ? 'tableContainer scrollable' : 'tableContainer';
    }

    /**
     * @description Checks if there is no data to display in the table.
     * @returns {boolean} - Returns true if there is no data, else false.
     */
    get isNoData() {
        return !this.tableData?.length;
    }

    /**
     * @description Handles row selection, manages the selected rows, and refreshes the datatable selection.
     * @param {Event} event - The event containing row selection details.
     */
    handleRowSelection(event) {
        if (Object.keys(event.detail.config).length !== 0) {
            let deselectedRecords = [];
            let selectedRecords = [];
            let result = dataTableService.handleRowSelection(event, this, this.tableData);
            this.selectedRows = result.selectedRows;
            deselectedRecords = result.deselectedRecords;
            selectedRecords = result.selectedRecords;
            this.refreshDatatableSelection(event, selectedRecords, deselectedRecords);

            this.selectedRowsArray = [...new Set([
                ...this.selectedRows,
                ...this.selectedIds
            ])];

            this.maintainSelectionState();
            this.setDataToReadOnlyTable();
            Promise.resolve();
        }
    }

    /**
     * @description Dispatches an event to notify the parent component of the row selection change.
     * @param {Event} event - The event containing selection details.
     * @param {Array} selectedRecords - Array of selected records.
     * @param {Array} deselectedRecords - Array of deselected records.
     */
    refreshDatatableSelection(event, selectedRecords, deselectedRecords) {
        const { action, value } = event.detail.config;
        this.dispatchEvent(
            new CustomEvent('rowselection', {
                detail: {
                    selectedRows: [...this.selectedRows],
                    selectedRecords: selectedRecords,
                    deselectedRecords: deselectedRecords,
                    totalSelected: this.selectedRows.size,
                    action: action,
                    recordId: value
                }
            })
        );
    }

    /**
     * @description Handles loading more data for lazy loading.
     * @param {Event} event - The event triggered to load more data.
     */
    handleLoadMore(event) {
        try {
            this.isLazyLoading = true;
            this.dataToShow = [...this.dataToShow, ...this.dataTableValue.slice(this.dataToShow.length, this.dataToShow.length + PAGE_SIZE)];
            this.isLazyLoading = false;
            this.maintainSelectionState();
        } catch (error) {
            this.isLazyLoading = false;
        }
    }

    /**
     * @description Handles sorting of the table data.
     * @param {Event} event - The event containing sorting details.
     */
    handleSort(event) {
        let sordtedData = dataTableService.handleSort(event, this, this._tableData);
        this.dataToShow = []; // Clear previous data
        this.dataTableValue = [...sordtedData];
        this.dataToShow = this.dataTableValue.slice(0, PAGE_SIZE);
        this.maintainSelectionState();
    }

    /**
     * @description Handles the rendering logic for selecting pre-selected rows.
     */
    renderedCallback() {
        let datatableAvaliable = this.template.querySelector('lightning-datatable[data-name="available"]');
        let datatableReadOnly = this.template.querySelector('lightning-datatable[data-name="readOnly"]');
        if (datatableAvaliable && this._tableData.length > 0 && this.dataToShow?.length != this._tableData.length && this.isLazyLoading === false) {
            this.isLazyLoading = true;
        }
        if (datatableReadOnly && this.selectedData.length > 0 && this.selectedDataToShow?.length != this.selectedData.length && this.isReadonlyLoading === false) {
            this.isReadonlyLoading = true;
        }
    }

    // Searching logic

    /**
     * @description Handler for the search input field change.
     * @param {Event} event - The event triggered by the search input change.
     */
    handleSearchKeyChange(event) {
        if (event.target.value.trim()) {
            this.searchValue = event.target.value;
        } else {
            this.searchValue = '';
        }
    }

    /**
     * @description Handles the ENTER key press to trigger search functionality.
     * @param {Event} event - The keyboard event.
     */
    handelSearchKey(event) {
        try {
            if ((event?.keyCode && event.keyCode === parseInt(ENTER_KEY_CODE, 10))) {
                event.preventDefault();
                this.searchValue = event.target.value;
                this.handleSearch();
            }
        } catch (error) {
            this.isLoading = false;
        }
    }

    /**
     * @description Intercept pasted text to convert line breaks to commas to support partner list search with text pasted from spreadsheet.
     * @param {Event} event - The paste event containing the pasted text.
     */
    handleSearchTextPaste(event) {
        try {
            this.searchValue = dataTableService.searchTextPaste(event);
            this.handleSearch();
        } catch (error) {
            this.isLoading = false;
        }
    }

    /**
     * @description Handles search button click and searches for the records.
     */
    handleSearch() {
        if (this.searchValue) {
            let tempDisplayData = [];
            let formattedSearchString = dataTableService.formatSearchString(this.searchValue);
            tempDisplayData = dataTableService.dataTableSearchResult(formattedSearchString, this.searchableFields, this._tableData);
            this.dataTableValue = tempDisplayData; // Display filtered records
        } else {
            this.dataTableValue = this._tableData; // Display all records
        }
        this.dataToShow = this.dataTableValue.slice(0, PAGE_SIZE);
        this.maintainSelectionState();
    }

    /**
     * @description Maintains the selection state for rows after data update.
     */
    maintainSelectionState() {
        this.selectedRowsArray = this.selectedRowsArray.filter(rowId => {
            return this._tableData.some(row => row.Id === rowId);
        });
        this.setSelectedRowsToDatatable(this.selectedRowsArray);
    }

    /**
     * @description Sets selected rows in the datatable.
     * @param {Array} selectedRowsArray - Array of selected row IDs.
     */
    setSelectedRowsToDatatable(selectedRowsArray) {
        let datatable = this.template.querySelector('lightning-datatable[data-name="available"]');
        if (datatable) {
            datatable.selectedRows = selectedRowsArray;
        }
    }

    // Read-only table

    /**
     * @description Sets data for the read-only table.
     */
    setDataToReadOnlyTable() {
        const uniqueIds = new Set();

        this.selectedData = this.selectedRowsArray
            .map(rowId => this._tableData.find(row => row.Id === rowId))
            .filter(row => row !== undefined && !uniqueIds.has(row.Id) && uniqueIds.add(row.Id));

        this.selectedDataToShowBackup = [...this.selectedData];
        this.selectedDataToShow = this.selectedData.slice(0, PAGE_SIZE);
    }
    /**
 * @description Handles the loading of more data for the read-only table with lazyLoading.
 * @param {Event} event - The event triggered when the user scrolls or clicks to load more data.
 */
handleReadonlyLoadMore(event) {
    try {
        this.isReadonlyLoading = true;
        // Load more records from the backup and append to the current display
        this.selectedDataToShow = [
            ...this.selectedDataToShow,
            ...this.selectedDataToShowBackup.slice(
                this.selectedDataToShow.length,
                this.selectedDataToShow.length + PAGE_SIZE
            )
        ];
        this.isReadonlyLoading = false;
    } catch (error) {
        // Handle any errors and stop loading
        this.isReadonlyLoading = false;
    }
}

/**
 * @description Handles sorting of the selected data in the read-only table.
 * @param {Event} event - The event containing the sorting details.
 */
handleShowSelectedTableSort(event) {
    // Sort the selected data based on the event details (e.g., column, direction)
    let sortedData = dataTableService.handleSort(event, this, this.selectedData);

    // Clear the previous data and update the display
    this.selectedDataToShow = [];
    this.selectedDataToShowBackup = [...sortedData];

    // Only display a subset of the sorted data based on lazyLoading
    this.selectedDataToShow = this.selectedDataToShowBackup.slice(0, PAGE_SIZE);
}

}
