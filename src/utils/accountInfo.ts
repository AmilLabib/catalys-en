// Explanation and recording example for each account in the Chart of Accounts.
export function getAccountDetails(code: string, name: string, type: string) {
  let description = "This account represents financial transactions related to the selected category.";
  let example = "";

  const nameLower = name.toLowerCase();

  if (code.startsWith("1.1.1")) {
    if (nameLower.includes("bank")) {
      description = "Cash in bank records all of the company's money held in bank accounts. Used for inflows and outflows via bank transfers or check/giro withdrawals.";
      example = "A customer settles a receivable of Rp 5.000.000 via bank transfer. \nEntry:\n(Debit) Cash in Bank Rp 5.000.000\n(Credit) Accounts Receivable Rp 5.000.000";
    } else if (nameLower.includes("petty")) {
      description = "Petty Cash is a fund set aside specifically for routine expenses with relatively small amounts.";
      example = "An employee buys guest supplies for Rp 50.000 using petty cash. \nEntry:\n(Debit) Supplies Expense Rp 50.000\n(Credit) Petty Cash Rp 50.000";
    } else if (nameLower.includes("deposit")) {
      description = "Short-term time deposits record idle funds placed in bank deposits with a tenor under 3 months.";
      example = "The company places Rp 50.000.000 in a 1-month time deposit. \nEntry:\n(Debit) Short-Term Time Deposits Rp 50.000.000\n(Credit) Cash in Bank Rp 50.000.000";
    } else {
      description = "Cash on hand records banknotes and coins held in the company safe or register for daily cash transactions.";
      example = "A customer pays Rp 150.000 in cash for a purchase. \nEntry:\n(Debit) Cash on Hand Rp 150.000\n(Credit) Sales Revenue Rp 150.000";
    }
  } else if (code.startsWith("1.1.2")) {
    if (nameLower.includes("employee")) {
      description = "Employee receivables record loans or cash advances the company gives its employees, to be deducted from salary or repaid in cash.";
      example = "An employee takes a cash advance of Rp 1.000.000. \nEntry:\n(Debit) Employee Receivables Rp 1.000.000\n(Credit) Cash on Hand / Bank Rp 1.000.000";
    } else if (nameLower.includes("savings")) {
      description = "Savings receivables record cooperative members' obligations to pay principal or mandatory savings that haven't yet been paid to the cooperative.";
      example = "A new member registers but hasn't paid the Rp 100.000 principal savings yet. \nEntry:\n(Debit) Principal Savings Receivable Rp 100.000\n(Credit) Principal Savings Rp 100.000";
    } else {
      description = "Accounts receivable record the company's claims against customers from selling goods or services on credit.";
      example = "Selling goods on credit for Rp 10.000.000 to Store A. \nEntry:\n(Debit) Accounts Receivable Rp 10.000.000\n(Credit) Sales Revenue Rp 10.000.000";
    }
  } else if (code.startsWith("1.1.3")) {
    description = "The allowance for doubtful accounts is a contra-asset account (reducing receivables) used to record the estimated amount of receivables that may not be collectible.";
    example = "At year end, an estimated Rp 500.000 of receivables may default. \nEntry:\n(Debit) Bad Debt Expense Rp 500.000\n(Credit) Allowance for Doubtful Accounts Rp 500.000";
  } else if (code.startsWith("1.1.4")) {
    if (nameLower.includes("stationery") || nameLower.includes("supplies")) {
      description = "Supplies/Stationery records the value of consumables used for office operations (such as paper, printer ink, etc.).";
      example = "Buying Rp 2.000.000 of stationery in cash for 6 months of stock. \nEntry:\n(Debit) Stationery Inventory Rp 2.000.000\n(Credit) Cash on Hand / Bank Rp 2.000.000";
    } else {
      description = "Merchandise inventory records the value of goods bought by the company to be resold without changing their original form.";
      example = "Buying merchandise from a supplier on credit for Rp 5.000.000. \nEntry:\n(Debit) Merchandise Inventory Rp 5.000.000\n(Credit) Accounts Payable Rp 5.000.000";
    }
  } else if (code.startsWith("1.1.5")) {
    if (nameLower.includes("rent")) {
      description = "Prepaid rent records rent paid up front for a specific future period.";
      example = "Paying 1 year of shophouse rent, Rp 12.000.000, by transfer. \nInitial entry:\n(Debit) Prepaid Rent Rp 12.000.000\n(Credit) Cash in Bank Rp 12.000.000";
    } else if (nameLower.includes("insurance")) {
      description = "Prepaid insurance records insurance premiums paid to protect company assets in future periods.";
      example = "Paying a 1-year insurance premium of Rp 6.000.000. \nEntry:\n(Debit) Prepaid Insurance Rp 6.000.000\n(Credit) Cash in Bank Rp 6.000.000";
    } else if (nameLower.includes("vat")) {
      description = "Input VAT records the Value Added Tax (PPN) the company has paid when buying taxable goods or services.";
      example = "Buying goods for Rp 10.000.000 plus 11% VAT in cash. \nEntry:\n(Debit) Inventory Rp 10.000.000\n(Debit) Input VAT Rp 1.100.000\n(Credit) Cash in Bank Rp 11.100.000";
    } else {
      description = "Prepaid taxes record taxes paid in advance that can be credited against tax payable at year end.";
      example = "Paying a PPh 25 installment of Rp 500.000 to the state treasury. \nEntry:\n(Debit) PPh 25 (Prepaid Tax) Rp 500.000\n(Credit) Cash in Bank Rp 500.000";
    }
  } else if (code.startsWith("1.1.9")) {
    description = "Inter-unit/head office current accounts record financial movements between branches, or between head office and branches, within the same entity.";
    example = "Head office transfers Rp 20.000.000 of operating funds to the store branch. \nEntry at Head Office:\n(Debit) Store Unit Current Account Rp 20.000.000\n(Credit) Head Office Cash in Bank Rp 20.000.000";
  } else if (code.startsWith("1.3.1")) {
    description = "Land records the acquisition cost of land owned by the company and used for operations; it is not depreciated.";
    example = "Buying land for Rp 500.000.000 via transfer. \nEntry:\n(Debit) Land Rp 500.000.000\n(Credit) Cash in Bank Rp 500.000.000";
  } else if (code.startsWith("1.3.2")) {
    description = "Buildings records the acquisition cost of buildings owned by the company for business premises. Its value is depreciated over time.";
    example = "Building a warehouse worth Rp 1.000.000.000. \nEntry:\n(Debit) Buildings Rp 1.000.000.000\n(Credit) Cash in Bank / Payables Rp 1.000.000.000";
  } else if (code.startsWith("1.3.3")) {
    description = "Equipment and Furniture records tangible fixed assets such as machines, computers, desks, chairs, and other large equipment with a useful life over 1 year.";
    example = "Buying 5 computers for Rp 40.000.000 in cash. \nEntry:\n(Debit) Equipment and Furniture Rp 40.000.000\n(Credit) Cash in Bank Rp 40.000.000";
  } else if (code.startsWith("1.3.4")) {
    description = "Vehicles records tangible fixed assets used for transport (cars, motorbikes, trucks) that support operations.";
    example = "Buying an operational car for Rp 150.000.000. \nEntry:\n(Debit) Vehicles Rp 150.000.000\n(Credit) Cash in Bank / Payables Rp 150.000.000";
  } else if (code.startsWith("1.3.5")) {
    description = "Accumulated Depreciation is a contra-asset account that holds the total depreciation charged on fixed assets over time, reducing their book value.";
    example = "Depreciating vehicles at year end by Rp 30.000.000. \nEntry:\n(Debit) Depreciation Expense - Vehicles Rp 30.000.000\n(Credit) Accumulated Depreciation - Vehicles Rp 30.000.000";
  } else if (code.startsWith("2.1.1")) {
    description = "Savings Payable (Principal/Mandatory/Voluntary) records the cooperative's obligations to its members for the savings they deposited.";
    example = "A member deposits Rp 5.000.000 of voluntary savings in cash. \nEntry:\n(Debit) Cash on Hand Rp 5.000.000\n(Credit) Voluntary Savings Payable Rp 5.000.000";
  } else if (code.startsWith("2.1.3")) {
    if (nameLower.includes("accounts payable")) {
      description = "Accounts Payable / Trade Payables records the company's obligations to suppliers for goods or services bought on credit.";
      example = "Buying inventory worth Rp 15.000.000 on credit. \nEntry:\n(Debit) Inventory Rp 15.000.000\n(Credit) Accounts Payable Rp 15.000.000";
    } else {
      description = "Revolving Fund Payable records obligations for program/aid funds that must be returned or passed on to other parties.";
      example = "The cooperative receives a Rp 100.000.000 revolving fund from the government. \nEntry:\n(Debit) Cash in Bank Rp 100.000.000\n(Credit) Revolving Fund Payable Rp 100.000.000";
    }
  } else if (code.startsWith("2.1.4")) {
    if (nameLower.includes("vat")) {
      description = "Output VAT records the Value Added Tax collected from buyers when the company sells taxable goods/services.";
      example = "Selling goods for Rp 20.000.000 in cash plus 11% VAT (Rp 2.200.000). \nEntry:\n(Debit) Cash on Hand Rp 22.200.000\n(Credit) Sales Revenue Rp 20.000.000\n(Credit) Output VAT Rp 2.200.000";
    } else {
      description = "Income Tax Payable (PPh) records income tax that has been withheld but not yet paid to the state treasury.";
      example = "Withholding PPh 21 of Rp 2.000.000 from employee salaries. \nEntry:\n(Debit) Salary Expense Rp 2.000.000\n(Credit) PPh 21 Payable Rp 2.000.000";
    }
  } else if (code.startsWith("2.1.5")) {
    description = "Salaries and Benefits Payable records the company's obligation for employee salaries that have been earned but not yet paid.";
    example = "At month end, Rp 50.000.000 of unpaid salaries are recognized. \nEntry:\n(Debit) Salary Expense Rp 50.000.000\n(Credit) Salaries and Benefits Payable Rp 50.000.000";
  } else if (code.startsWith("2.2.")) {
    description = "Long-Term Liabilities record the company's obligations to third parties or banks due in more than one year.";
    example = "Receiving a Rp 500.000.000 working capital loan disbursement from the bank. \nEntry:\n(Debit) Cash in Bank Rp 500.000.000\n(Credit) Long-Term Liabilities (Bank) Rp 500.000.000";
  } else if (code.startsWith("3.")) {
    if (nameLower.includes("surplus") || nameLower.includes("shu")) {
      description = "Income Summary / Surplus (SHU) records the net profit or loss generated from operations during a period.";
      example = "Closing the books with a net profit of Rp 100.000.000. The closing entry moves the profit: \n(Debit) Income Summary Rp 100.000.000\n(Credit) Undistributed Surplus (SHU) Rp 100.000.000";
    } else {
      description = "Equity / Capital records the owner's (or cooperative members') residual interest in company assets after deducting all liabilities.";
      example = "The owner deposits Rp 50.000.000 in cash as business capital. \nEntry:\n(Debit) Cash on Hand Rp 50.000.000\n(Credit) Equity/Capital Rp 50.000.000";
    }
  } else if (code.startsWith("4.")) {
    if (nameLower.includes("service")) {
      description = "Service Revenue records income the company earns from providing services to customers.";
      example = "Receiving Rp 300.000 in cash for clinic health services. \nEntry:\n(Debit) Cash on Hand Rp 300.000\n(Credit) Service Revenue Rp 300.000";
    } else {
      description = "Sales Revenue records turnover or gross income from selling merchandise or finished products to customers.";
      example = "Selling 100 clothing items for a total of Rp 15.000.000 in cash. \nEntry:\n(Debit) Cash on Hand Rp 15.000.000\n(Credit) Sales Revenue Rp 15.000.000";
    }
  } else if (code.startsWith("5.")) {
    description = "Cost of Goods Sold (COGS) records the total direct costs incurred to acquire or produce the goods sold during the period.";
    example = "The goods sold above had an original cost (purchase price) of Rp 10.000.000. \nCOGS entry:\n(Debit) Cost of Goods Sold Rp 10.000.000\n(Credit) Merchandise Inventory Rp 10.000.000";
  } else if (code.startsWith("6.")) {
    if (nameLower.includes("salar") || nameLower.includes("overtime") || nameLower.includes("incentive")) {
      description = "Personnel Expense records all compensation costs (salaries, benefits, overtime) given to employees.";
      example = "Paying Rp 45.000.000 of base salaries via bank transfer. \nEntry:\n(Debit) Salary Expense Rp 45.000.000\n(Credit) Cash in Bank Rp 45.000.000";
    } else if (nameLower.includes("depreciation") || nameLower.includes("amortization")) {
      description = "Depreciation/Amortization Expense records the systematic allocation of a tangible fixed asset's acquisition cost over its useful economic life.";
      example = "Recording monthly depreciation of an operational car of Rp 2.500.000. \nEntry:\n(Debit) Depreciation Expense - Vehicles Rp 2.500.000\n(Credit) Accumulated Depreciation - Vehicles Rp 2.500.000";
    } else if (nameLower.includes("rent")) {
      description = "Rent Expense records the cost recognized for using rented assets during the period.";
      example = "Recognizing this month's shophouse usage of Rp 1.000.000. \nEntry:\n(Debit) Rent Expense Rp 1.000.000\n(Credit) Prepaid Rent Rp 1.000.000";
    } else if (nameLower.includes("advertising") || nameLower.includes("promotion")) {
      description = "Marketing Expense records costs incurred specifically for marketing activities to increase sales.";
      example = "Paying an agency Rp 5.000.000 for digital ads. \nEntry:\n(Debit) Advertising Expense Rp 5.000.000\n(Credit) Cash in Bank Rp 5.000.000";
    } else {
      description = "Operating/Administrative Expense records the day-to-day costs of running the business (electricity, telephone, etc.).";
      example = "Paying a PLN electricity bill of Rp 1.500.000 in cash. \nEntry:\n(Debit) Electricity Expense Rp 1.500.000\n(Credit) Cash on Hand Rp 1.500.000";
    }
  } else if (code.startsWith("9.")) {
    if (code.startsWith("9.1")) {
      description = "Non-Operating Income records income from activities outside the company's main operations, such as bank interest or asset sales.";
      example = "Receiving monthly giro/bank interest of Rp 150.000. \nEntry:\n(Debit) Cash in Bank Rp 150.000\n(Credit) Interest Income Rp 150.000";
    } else {
      description = "Non-Operating Expense records spending outside the main operations, such as bank administration fees or tax penalties.";
      example = "The bank deducts a Rp 25.000 monthly admin fee from the account balance. \nEntry:\n(Debit) Bank Administration Expense Rp 25.000\n(Credit) Cash in Bank Rp 25.000";
    }
  } else {
    if (type === "asset") {
      description = "Asset accounts record property or economic resources controlled by the company.";
      example = "Buying an asset worth Rp 500.000 in cash. \nEntry:\n(Debit) Related Asset Rp 500.000\n(Credit) Cash on Hand Rp 500.000";
    } else if (type === "liability") {
      description = "Liability accounts record the company's present obligations or debts.";
      example = "Borrowing Rp 10.000.000 of operating funds. \nEntry:\n(Debit) Cash on Hand/Bank Rp 10.000.000\n(Credit) Liability (Payable) Rp 10.000.000";
    } else if (type === "equity") {
      description = "Equity accounts record owner capital, or the residual interest in assets after deducting all liabilities.";
      example = "Depositing additional cash capital of Rp 20.000.000. \nEntry:\n(Debit) Cash on Hand Rp 20.000.000\n(Credit) Equity/Capital Rp 20.000.000";
    } else if (type === "revenue") {
      description = "Revenue accounts record increases in economic benefits (income) during a period.";
      example = "Receiving payment for a transaction of Rp 2.000.000. \nEntry:\n(Debit) Cash on Hand/Bank Rp 2.000.000\n(Credit) Revenue Rp 2.000.000";
    } else if (type === "expense") {
      description = "Expense accounts record decreases in economic benefits (spending) for operations.";
      example = "Paying operating expenses of Rp 300.000. \nEntry:\n(Debit) Related Expense Rp 300.000\n(Credit) Cash on Hand/Bank Rp 300.000";
    }
  }

  return { description, example };
}
