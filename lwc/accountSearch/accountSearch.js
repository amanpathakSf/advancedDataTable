import { LightningElement,wire ,track} from 'lwc';
import getAccounts from'@salesforce/apex/AccountSearchController.getAccounts';

export default class AccountSearch extends LightningElement {
    @track accounts;
	@track error;

    @track preSelections = [];
    @track searchableFields=['Name','AccountNumber','Type','Phone','Rating'];
    @track accountColumns = [
        {label: 'Account Name', fieldName: 'Name', type: 'text', sortable: true},
        {label: 'Account Number', fieldName: 'AccountNumber', type: 'text', sortable: true},
        {label: 'Type', fieldName: 'Type', type: 'text', sortable: true},
        {label: 'Phone', fieldName: 'Phone', type: 'phone', sortable: true},
        {label: 'Rating', fieldName: 'Rating', type: 'text', sortable: true}];

    @wire (getAccounts)wiredAccounts({data, error}){
		if(data) {
			this.accounts =data;
			this.error = undefined;
            const advancedDataTable = this.refs?.dataTableAdvanced;
            this.preSelections=['001gL000000R8eEQAS','001gL000000R8eGQAS']; // can be obtained from server
            if(advancedDataTable){
                advancedDataTable?.preSelection(this.preSelections);
            }
           
		}else {
			this.accounts =undefined;
			this.error = error;
		}
	}

    handleSelection(event){

    }


    
}