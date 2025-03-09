public with sharing class AccountSearchController {
    @AuraEnabled(cacheable=true)
    public static List<Account> getAccounts() {
         List<Account> accList = [SELECT Id,Name,AccountNumber,Type,Phone,Rating FROM Account  ];
         return accList;
       }
}