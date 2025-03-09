/**
 * @fileOverview This file contains utility functions to handle row selection, sorting, and searching for a data table component.
 * 
 * @author Aman Pathak /Abdul Quadir Kotwala / Ashish Singh
 * @Date: 9th March 2025
 * @company Salesforce
 * @copyright Copyright (c) 2025 Salesforce. All rights reserved.
 */

/**
 * Handles row selection and deselection in a data table component.
 * 
 * @param {*} event - The event object that contains the details of the action (select, deselect, etc.)
 * @param {*} tableComponent - The LWC data table component that will be updated with the selected/deselected rows. 
 * Required: selectedRows = new Set(); This should be added to the data table's JS where this service is used.
 * @param {*} data - The data representing the table rows, fetched from the server or after processing.
 * 
 * @returns {Object} An object containing:
 *  - deselectedRecords: An array of records that were deselected.
 *  - selectedRecords: An array of records that are selected.
 *  - selectedRows: The updated Set of selected row IDs.
 */
export const handleRowSelection = (event, tableComponent, data) => {
    const { action, value } = event.detail.config;
    const selectedRows = event.detail.selectedRows;
    let deselectedRecords = [];
    let selectedRecords = []; 
    switch (action) {
        case 'selectAllRows':
            // Select all rows
            tableComponent.selectedRows = new Set(data.map(row => row.Id));
            selectedRecords = data;
            break;

        case 'deselectAllRows':
            // Deselect all rows
            deselectedRecords = [...tableComponent.selectedRows].map(id => data.find(row => row.Id === id));
            tableComponent.selectedRows.clear();
            selectedRecords=[];
            break;

        case 'rowSelect':
            // Handle row selections
            selectedRows.forEach(row => {
                tableComponent.selectedRows.add(row.Id);
            });
            selectedRecords = data.filter(row => selectedRows.some(sel => sel.Id === row.Id));
            break;

        case 'rowDeselect':
            // Handle row deselections
            if (selectedRows.length === 0) {
                // If selectedRows is empty, clear all selected rows
                deselectedRecords = [...tableComponent.selectedRows].map(id => data.find(row => row.Id === id));
                tableComponent.selectedRows.clear();
                selectedRecords=[];
            } else {
                // Normal deselection logic when there are rows to deselect
                tableComponent.selectedRows.delete(value);
                deselectedRecords = data.filter(row => tableComponent.selectedRows.has(row.Id) === false);
                selectedRecords = data.filter(row => tableComponent.selectedRows.has(row.Id));
            }
            break;

        default:
            tableComponent.selectedRows.clear(); // if something breaks clear the selection to avoid data inconsistency
            break;
    }

    return {
        deselectedRecords,
        selectedRows: tableComponent.selectedRows,
        selectedRecords
    };
}

/**
 * Handles sorting of the data table based on the selected field and direction.
 * 
 * @param {*} event - The event object that contains the sorting details.
 * @param {*} tableComponent - The LWC data table component.
 * @param {*} tableData - The data to be sorted.
 * 
 * @returns {Array} The sorted data.
 */
export const handleSort = (event, tableComponent, tableData) => {
    try {
        let fieldName = event.detail.fieldName;
        let sortDirection = event.detail.sortDirection;
        tableComponent.sortedBy = fieldName;
        tableComponent.sortedDirection = sortDirection;
        let clonedData = JSON.parse(JSON.stringify(tableData));
        clonedData.sort((a, b) => {
            // Handle cases where the field might be nested
            let valueA = resolveFieldValue(a, fieldName);
            let valueB = resolveFieldValue(b, fieldName);

            // Move null/undefined values to the end regardless of sort direction
            if (valueA == null && valueB == null) return 0;
            if (valueA == null) return 1;
            if (valueB == null) return -1;

            // Handle different data types
            if (typeof valueA !== typeof valueB) {
                // Convert both to strings if types don't match
                valueA = String(valueA);
                valueB = String(valueB);
            }

            // Type-specific comparisons
            switch (typeof valueA) {
                case 'number':
                    return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;

                case 'boolean':
                    return sortDirection === 'asc' ?
                        (valueA === valueB ? 0 : valueA ? -1 : 1) :
                        (valueA === valueB ? 0 : valueA ? 1 : -1);

                case 'string':
                    valueA = valueA.toLowerCase();
                    valueB = valueB.toLowerCase();
                    return sortDirection === 'asc' ?
                        valueA.localeCompare(valueB) :
                        valueB.localeCompare(valueA);

                case 'object':
                    if (valueA instanceof Date && valueB instanceof Date) {
                        return sortDirection === 'asc' ?
                            valueA.getTime() - valueB.getTime() :
                            valueB.getTime() - valueA.getTime();
                    }
                    // For other objects, convert to string
                    valueA = JSON.stringify(valueA).toLowerCase();
                    valueB = JSON.stringify(valueB).toLowerCase();
                    return sortDirection === 'asc' ?
                        valueA.localeCompare(valueB) :
                        valueB.localeCompare(valueA);

                default:
                    // Fallback to string comparison
                    valueA = String(valueA).toLowerCase();
                    valueB = String(valueB).toLowerCase();
                    return sortDirection === 'asc' ?
                        valueA.localeCompare(valueB) :
                        valueB.localeCompare(valueA);
            }
        });

        return clonedData;

    } catch (e) {
        return tableData; // In case of error, return the original data
    }
}

/**
 * Resolves the value of a field, supporting nested fields (e.g., "account.name").
 * 
 * @param {*} record - The record to extract the value from.
 * @param {*} fieldPath - The field path (e.g., "account.name").
 * 
 * @returns {*} The resolved value of the field.
 */
function resolveFieldValue(record, fieldPath) {
    if (!record || !fieldPath) return null;
    
    // Handle nested fields (e.g. "account.name")
    return fieldPath.split('.').reduce((obj, key) => {
        return obj ? obj[key] : null;
    }, record);
}

/**
 * Handles text paste events, formatting the pasted text (removing line breaks and commas).
 * 
 * @param {*} event - The paste event object.
 * 
 * @returns {string} The formatted text to be pasted.
 */
export const searchTextPaste = (event) => {
    // Check if there are linebreaks in the search text
    let pastedText = event.clipboardData.getData('text');
    const segments = pastedText.split(/\r\n|\r|\n|,/).filter(segment => segment.trim() !== ''); // to ensure all type of separators are considered 
    if (segments.length > 1) {
        // Line breaks found, convert to commas
        pastedText = segments.join(',');
    }
    event.preventDefault();
    event.clipboardData.setData('text', pastedText);

    // Paste the text into the current cursor position / selection:
    // Have to do this manually because lightning-input does not support setRangeText

    // Get start and end of selection
    const selectionStart = event.target.selectionStart;
    const selectionEnd = event.target.selectionEnd;

    // Paste text into value
    event.target.value = event.target.value.substring(0, selectionStart) + pastedText + event.target.value.substring(selectionEnd);

    // Reposition selection cursor to be after pasted text
    event.target.selectionStart = selectionStart + pastedText.length;
    event.target.selectionEnd = event.target.selectionStart;
    return event.target.value;
}

/**
 * Searches the data table based on the provided search value and fields.
 * 
 * @param {*} searchValue - The search text input by the user (typed or pasted).
 * @param {*} searchableFields - The columns/fields in the data that are searchable.
 * @param {*} data - The data to be searched.
 * 
 * @returns {Array} The filtered data matching the search criteria.
 */
export const dataTableSearchResult = (searchValue, searchableFields, data) => {
    searchValue = formatSearchString(searchValue);
    const searchValueLower = searchValue.toLowerCase();
    const searchValueArray = searchValue.toLowerCase().split(','); // case insensitive 
    let tempDisplayData = [];
    for (let i = 0; i < data.length; i++) {
        const record = data[i];

        if (
            searchableFields.some(field =>
                record[field]?.toLowerCase().includes(searchValueLower)
            ) ||
            searchableFields.some(field =>
                record[field] && searchValueArray.includes(record[field]?.toLowerCase())
            )
        ) {
            tempDisplayData.push(record);
        }
    }
    return tempDisplayData;
}

/**
 * Formats the search string by removing unnecessary spaces before/after commas.
 * 
 * @param {*} searchValue - The search text input by the user.
 * 
 * @returns {string} The formatted search string.
 */
export const formatSearchString = (searchValue) => {
    searchValue = searchValue.replace(/\s*,\s*/g, ",");
    return searchValue;
}
