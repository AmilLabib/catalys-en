import React, { createContext, useContext, useEffect, useState } from "react";

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense"
  | "distribution";

export type StatementTarget = {
  kind: "bs" | "is" | "equity";
  field: string;
};

export type Account = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  target: StatementTarget;
  description?: string; // explanation of what transactions are included
};

const STORAGE_KEY = "chartOfAccounts_v2";

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: "1_1_1_01_cash_on_hand",
    code: "1.1.1.01",
    name: "Cash on Hand",
    type: "asset",
    target: { kind: "bs", field: "cash_on_hand" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_02_cash_in_bank_bri",
    code: "1.1.1.02",
    name: "Cash in Bank BRI",
    type: "asset",
    target: { kind: "bs", field: "cash_in_bank_bri" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_03_cash_in_bank_mandiri",
    code: "1.1.1.03",
    name: "Cash in Bank Mandiri",
    type: "asset",
    target: { kind: "bs", field: "cash_in_bank_mandiri" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_04_cash_in_bank_bni",
    code: "1.1.1.04",
    name: "Cash in Bank BNI",
    type: "asset",
    target: { kind: "bs", field: "cash_in_bank_bni" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_05_cash_in_bank_btn",
    code: "1.1.1.05",
    name: "Cash in Bank BTN",
    type: "asset",
    target: { kind: "bs", field: "cash_in_bank_btn" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_06_cash_in_bank_bpd",
    code: "1.1.1.06",
    name: "Cash in Bank BPD",
    type: "asset",
    target: { kind: "bs", field: "cash_in_bank_bpd" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_07_cash_in_bank_bsi",
    code: "1.1.1.07",
    name: "Cash in Bank BSI",
    type: "asset",
    target: { kind: "bs", field: "cash_in_bank_bsi" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_10_petty_cash",
    code: "1.1.1.10",
    name: "Petty Cash",
    type: "asset",
    target: { kind: "bs", field: "petty_cash" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_1_11_time_deposits_3_months",
    code: "1.1.1.11",
    name: "Time Deposits (< 3 months)",
    type: "asset",
    target: { kind: "bs", field: "time_deposits_3_months" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_2_01_accounts_receivable",
    code: "1.1.2.01",
    name: "Accounts Receivable",
    type: "asset",
    target: { kind: "bs", field: "accounts_receivable" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_2_02_employee_receivables",
    code: "1.1.2.02",
    name: "Employee Receivables",
    type: "asset",
    target: { kind: "bs", field: "employee_receivables" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_2_03_member_principal_savings_receivable",
    code: "1.1.2.03",
    name: "Member Principal Savings Receivable",
    type: "asset",
    target: { kind: "bs", field: "member_principal_savings_receivable" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_2_04_member_mandatory_savings_receivable",
    code: "1.1.2.04",
    name: "Member Mandatory Savings Receivable",
    type: "asset",
    target: { kind: "bs", field: "member_mandatory_savings_receivable" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_2_05_member_receivables",
    code: "1.1.2.05",
    name: "Member Receivables",
    type: "asset",
    target: { kind: "bs", field: "member_receivables" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_3_01_allowance_for_doubtful_accounts_receivable",
    code: "1.1.3.01",
    name: "Allowance for Doubtful Accounts Receivable",
    type: "asset",
    target: { kind: "bs", field: "allowance_for_doubtful_accounts_receivable" },
    description: "Normal: Credit",
  },
  {
    id: "1_1_3_02_allowance_for_doubtful_employee_receivables",
    code: "1.1.3.02",
    name: "Allowance for Doubtful Employee Receivables",
    type: "asset",
    target: { kind: "bs", field: "allowance_for_doubtful_employee_receivables" },
    description: "Normal: Credit",
  },
  {
    id: "1_1_3_03_allowance_for_doubtful_member_principal_savings_receivable",
    code: "1.1.3.03",
    name: "Allowance for Doubtful Member Principal Savings Receivable",
    type: "asset",
    target: { kind: "bs", field: "allowance_for_doubtful_member_principal_savings_receivable" },
    description: "Normal: Credit",
  },
  {
    id: "1_1_3_04_allowance_for_doubtful_member_mandatory_savings_receivable",
    code: "1.1.3.04",
    name: "Allowance for Doubtful Member Mandatory Savings Receivable",
    type: "asset",
    target: { kind: "bs", field: "allowance_for_doubtful_member_mandatory_savings_receivable" },
    description: "Normal: Credit",
  },
  {
    id: "1_1_4_01_merchandise_inventory",
    code: "1.1.4.01",
    name: "Merchandise Inventory",
    type: "asset",
    target: { kind: "bs", field: "merchandise_inventory" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_4_02_stationery_inventory",
    code: "1.1.4.02",
    name: "Stationery Inventory",
    type: "asset",
    target: { kind: "bs", field: "stationery_inventory" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_4_03_supplies",
    code: "1.1.4.03",
    name: "Supplies",
    type: "asset",
    target: { kind: "bs", field: "supplies" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_5_01_prepaid_rent",
    code: "1.1.5.01",
    name: "Prepaid Rent",
    type: "asset",
    target: { kind: "bs", field: "prepaid_rent" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_5_02_prepaid_insurance",
    code: "1.1.5.02",
    name: "Prepaid Insurance",
    type: "asset",
    target: { kind: "bs", field: "prepaid_insurance" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_5_03_prepaid_income_tax_pph_25",
    code: "1.1.5.03",
    name: "Prepaid Income Tax (PPh 25)",
    type: "asset",
    target: { kind: "bs", field: "prepaid_income_tax_pph_25" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_5_04_input_vat",
    code: "1.1.5.04",
    name: "Input VAT",
    type: "asset",
    target: { kind: "bs", field: "input_vat" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_8_99_other_current_assets",
    code: "1.1.8.99",
    name: "Other Current Assets",
    type: "asset",
    target: { kind: "bs", field: "other_current_assets" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_01_head_office_current_account",
    code: "1.1.9.01",
    name: "Head Office Current Account",
    type: "asset",
    target: { kind: "bs", field: "head_office_current_account" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_02_store_unit_current_account",
    code: "1.1.9.02",
    name: "Store Unit Current Account",
    type: "asset",
    target: { kind: "bs", field: "store_unit_current_account" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_03_pharmacy_unit_current_account",
    code: "1.1.9.03",
    name: "Pharmacy Unit Current Account",
    type: "asset",
    target: { kind: "bs", field: "pharmacy_unit_current_account" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_04_savings_loan_unit_current_account",
    code: "1.1.9.04",
    name: "Savings & Loan Unit Current Account",
    type: "asset",
    target: { kind: "bs", field: "savings_loan_unit_current_account" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_05_clinic_unit_current_account",
    code: "1.1.9.05",
    name: "Clinic Unit Current Account",
    type: "asset",
    target: { kind: "bs", field: "clinic_unit_current_account" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_06_warehouse_unit_current_account",
    code: "1.1.9.06",
    name: "Warehouse Unit Current Account",
    type: "asset",
    target: { kind: "bs", field: "warehouse_unit_current_account" },
    description: "Normal: Debit",
  },
  {
    id: "1_1_9_07_logistics_unit_current_account",
    code: "1.1.9.07",
    name: "Logistics Unit Current Account",
    type: "asset",
    target: { kind: "bs", field: "logistics_unit_current_account" },
    description: "Normal: Debit",
  },
  {
    id: "1_2_1_01_investment_in_time_deposits",
    code: "1.2.1.01",
    name: "Investment in Time Deposits",
    type: "asset",
    target: { kind: "bs", field: "investment_in_time_deposits" },
    description: "Normal: Debit",
  },
  {
    id: "1_2_1_99_other_investments",
    code: "1.2.1.99",
    name: "Other Investments",
    type: "asset",
    target: { kind: "bs", field: "other_investments" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_1_01_land",
    code: "1.3.1.01",
    name: "Land",
    type: "asset",
    target: { kind: "bs", field: "land" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_2_01_buildings",
    code: "1.3.2.01",
    name: "Buildings",
    type: "asset",
    target: { kind: "bs", field: "buildings" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_3_01_equipment_and_furniture",
    code: "1.3.3.01",
    name: "Equipment and Furniture",
    type: "asset",
    target: { kind: "bs", field: "equipment_and_furniture" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_4_01_vehicles",
    code: "1.3.4.01",
    name: "Vehicles",
    type: "asset",
    target: { kind: "bs", field: "vehicles" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_5_01_accumulated_depreciation_buildings",
    code: "1.3.5.01",
    name: "Accumulated Depreciation - Buildings",
    type: "asset",
    target: { kind: "bs", field: "accumulated_depreciation_buildings" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_5_02_accumulated_depreciation_equipment_and_furniture",
    code: "1.3.5.02",
    name: "Accumulated Depreciation - Equipment and Furniture",
    type: "asset",
    target: { kind: "bs", field: "accumulated_depreciation_equipment_and_furniture" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_5_03_accumulated_depreciation_vehicles",
    code: "1.3.5.03",
    name: "Accumulated Depreciation - Vehicles",
    type: "asset",
    target: { kind: "bs", field: "accumulated_depreciation_vehicles" },
    description: "Normal: Debit",
  },
  {
    id: "1_3_9_99_other_fixed_assets",
    code: "1.3.9.99",
    name: "Other Fixed Assets",
    type: "asset",
    target: { kind: "bs", field: "other_fixed_assets" },
    description: "Normal: Debit",
  },
  {
    id: "1_4_1_01_software",
    code: "1.4.1.01",
    name: "Software",
    type: "asset",
    target: { kind: "bs", field: "software" },
    description: "Normal: Debit",
  },
  {
    id: "1_4_2_01_amortization_of_intangible_assets",
    code: "1.4.2.01",
    name: "Amortization of Intangible Assets",
    type: "asset",
    target: { kind: "bs", field: "amortization_of_intangible_assets" },
    description: "Normal: Debit",
  },
  {
    id: "1_5_1_01_long_term_investments",
    code: "1.5.1.01",
    name: "Long-Term Investments",
    type: "asset",
    target: { kind: "bs", field: "long_term_investments" },
    description: "Normal: Debit",
  },
  {
    id: "1_9_1_99_other_miscellaneous_assets",
    code: "1.9.1.99",
    name: "Other Miscellaneous Assets",
    type: "asset",
    target: { kind: "bs", field: "other_miscellaneous_assets" },
    description: "Normal: Debit",
  },
  {
    id: "2_1_1_01_principal_savings_payable",
    code: "2.1.1.01",
    name: "Principal Savings Payable",
    type: "liability",
    target: { kind: "bs", field: "principal_savings_payable" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_1_02_mandatory_savings_payable",
    code: "2.1.1.02",
    name: "Mandatory Savings Payable",
    type: "liability",
    target: { kind: "bs", field: "mandatory_savings_payable" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_1_03_voluntary_savings_payable",
    code: "2.1.1.03",
    name: "Voluntary Savings Payable",
    type: "liability",
    target: { kind: "bs", field: "voluntary_savings_payable" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_2_01_member_surplus_shu_payable",
    code: "2.1.2.01",
    name: "Member Surplus (SHU) Payable",
    type: "liability",
    target: { kind: "bs", field: "member_surplus_shu_payable" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_3_01_accounts_payable",
    code: "2.1.3.01",
    name: "Accounts Payable",
    type: "liability",
    target: { kind: "bs", field: "accounts_payable" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_3_02_revolving_fund_payable",
    code: "2.1.3.02",
    name: "Revolving Fund Payable",
    type: "liability",
    target: { kind: "bs", field: "revolving_fund_payable" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_4_01_output_vat",
    code: "2.1.4.01",
    name: "Output VAT",
    type: "liability",
    target: { kind: "bs", field: "output_vat" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_4_02_income_tax_payable_pph_21",
    code: "2.1.4.02",
    name: "Income Tax Payable (PPh 21)",
    type: "liability",
    target: { kind: "bs", field: "income_tax_payable_pph_21" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_4_03_income_tax_payable_pph_23",
    code: "2.1.4.03",
    name: "Income Tax Payable (PPh 23)",
    type: "liability",
    target: { kind: "bs", field: "income_tax_payable_pph_23" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_4_04_income_tax_payable_pph_29",
    code: "2.1.4.04",
    name: "Income Tax Payable (PPh 29)",
    type: "liability",
    target: { kind: "bs", field: "income_tax_payable_pph_29" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_5_01_salaries_and_benefits_payable",
    code: "2.1.5.01",
    name: "Salaries and Benefits Payable",
    type: "liability",
    target: { kind: "bs", field: "salaries_and_benefits_payable" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_6_01_electricity_payable",
    code: "2.1.6.01",
    name: "Electricity Payable",
    type: "liability",
    target: { kind: "bs", field: "electricity_payable" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_6_02_telephone_payable",
    code: "2.1.6.02",
    name: "Telephone Payable",
    type: "liability",
    target: { kind: "bs", field: "telephone_payable" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_6_99_other_utilities_payable",
    code: "2.1.6.99",
    name: "Other Utilities Payable",
    type: "liability",
    target: { kind: "bs", field: "other_utilities_payable" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_7_01_unearned_rent_revenue",
    code: "2.1.7.01",
    name: "Unearned Rent Revenue",
    type: "liability",
    target: { kind: "bs", field: "unearned_rent_revenue" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_8_01_short_term_third_party_payables",
    code: "2.1.8.01",
    name: "Short-Term Third-Party Payables",
    type: "liability",
    target: { kind: "bs", field: "short_term_third_party_payables" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_8_99_other_short_term_third_party_payables",
    code: "2.1.8.99",
    name: "Other Short-Term Third-Party Payables",
    type: "liability",
    target: { kind: "bs", field: "other_short_term_third_party_payables" },
    description: "Normal: Credit",
  },
  {
    id: "2_1_9_99_other_short_term_liabilities",
    code: "2.1.9.99",
    name: "Other Short-Term Liabilities",
    type: "liability",
    target: { kind: "bs", field: "other_short_term_liabilities" },
    description: "Normal: Credit",
  },
  {
    id: "2_2_1_01_long_term_third_party_payables",
    code: "2.2.1.01",
    name: "Long-Term Third-Party Payables",
    type: "liability",
    target: { kind: "bs", field: "long_term_third_party_payables" },
    description: "Normal: Credit",
  },
  {
    id: "2_2_2_01_bank_loans",
    code: "2.2.2.01",
    name: "Bank Loans",
    type: "liability",
    target: { kind: "bs", field: "bank_loans" },
    description: "Normal: Credit",
  },
  {
    id: "2_2_9_99_other_long_term_liabilities",
    code: "2.2.9.99",
    name: "Other Long-Term Liabilities",
    type: "liability",
    target: { kind: "bs", field: "other_long_term_liabilities" },
    description: "Normal: Credit",
  },
  {
    id: "3_1_1_01_principal_savings",
    code: "3.1.1.01",
    name: "Principal Savings",
    type: "equity",
    target: { kind: "equity", field: "principal_savings" },
    description: "Normal: Credit",
  },
  {
    id: "3_1_2_01_mandatory_savings",
    code: "3.1.2.01",
    name: "Mandatory Savings",
    type: "equity",
    target: { kind: "equity", field: "mandatory_savings" },
    description: "Normal: Credit",
  },
  {
    id: "3_1_3_01_voluntary_savings",
    code: "3.1.3.01",
    name: "Voluntary Savings",
    type: "equity",
    target: { kind: "equity", field: "voluntary_savings" },
    description: "Normal: Credit",
  },
  {
    id: "3_2_1_01_grants",
    code: "3.2.1.01",
    name: "Grants",
    type: "equity",
    target: { kind: "equity", field: "grants" },
    description: "Normal: Credit",
  },
  {
    id: "3_3_1_01_reserves",
    code: "3.3.1.01",
    name: "Reserves",
    type: "equity",
    target: { kind: "equity", field: "reserves" },
    description: "Normal: Credit",
  },
  {
    id: "3_4_1_01_undistributed_surplus_shu",
    code: "3.4.1.01",
    name: "Undistributed Surplus (SHU)",
    type: "equity",
    target: { kind: "equity", field: "undistributed_surplus_shu" },
    description: "Normal: Credit",
  },
  {
    id: "3_9_1_01_surplus_shu_summary",
    code: "3.9.1.01",
    name: "Surplus (SHU) Summary",
    type: "equity",
    target: { kind: "equity", field: "surplus_shu_summary" },
    description: "Normal: Credit",
  },
  {
    id: "4_1_1_01_merchandise_sales_revenue_members",
    code: "4.1.1.01",
    name: "Merchandise Sales Revenue (Members)",
    type: "revenue",
    target: { kind: "is", field: "merchandise_sales_revenue_members" },
    description: "Normal: Credit",
  },
  {
    id: "4_1_1_02_consignment_commission_revenue",
    code: "4.1.1.02",
    name: "Consignment Commission Revenue",
    type: "revenue",
    target: { kind: "is", field: "consignment_commission_revenue" },
    description: "Normal: Credit",
  },
  {
    id: "4_1_2_01_finished_goods_sales_revenue_members",
    code: "4.1.2.01",
    name: "Finished Goods Sales Revenue (Members)",
    type: "revenue",
    target: { kind: "is", field: "finished_goods_sales_revenue_members" },
    description: "Normal: Credit",
  },
  {
    id: "4_1_3_01_doctor_service_revenue_members",
    code: "4.1.3.01",
    name: "Doctor Service Revenue (Members)",
    type: "revenue",
    target: { kind: "is", field: "doctor_service_revenue_members" },
    description: "Normal: Credit",
  },
  {
    id: "4_1_3_02_loan_service_revenue_members",
    code: "4.1.3.02",
    name: "Loan Service Revenue (Members)",
    type: "revenue",
    target: { kind: "is", field: "loan_service_revenue_members" },
    description: "Normal: Credit",
  },
  {
    id: "4_1_3_03_rental_service_revenue_members",
    code: "4.1.3.03",
    name: "Rental Service Revenue (Members)",
    type: "revenue",
    target: { kind: "is", field: "rental_service_revenue_members" },
    description: "Normal: Credit",
  },
  {
    id: "4_1_3_04_delivery_service_revenue_members",
    code: "4.1.3.04",
    name: "Delivery Service Revenue (Members)",
    type: "revenue",
    target: { kind: "is", field: "delivery_service_revenue_members" },
    description: "Normal: Credit",
  },
  {
    id: "4_1_9_01_other_member_service_revenue",
    code: "4.1.9.01",
    name: "Other Member Service Revenue",
    type: "revenue",
    target: { kind: "is", field: "other_member_service_revenue" },
    description: "Normal: Credit",
  },
  {
    id: "4_2_1_01_merchandise_sales_revenue_non_members",
    code: "4.2.1.01",
    name: "Merchandise Sales Revenue (Non-Members)",
    type: "revenue",
    target: { kind: "is", field: "merchandise_sales_revenue_non_members" },
    description: "Normal: Credit",
  },
  {
    id: "4_2_2_01_finished_goods_sales_revenue_non_members",
    code: "4.2.2.01",
    name: "Finished Goods Sales Revenue (Non-Members)",
    type: "revenue",
    target: { kind: "is", field: "finished_goods_sales_revenue_non_members" },
    description: "Normal: Credit",
  },
  {
    id: "4_2_3_01_doctor_service_revenue_non_members",
    code: "4.2.3.01",
    name: "Doctor Service Revenue (Non-Members)",
    type: "revenue",
    target: { kind: "is", field: "doctor_service_revenue_non_members" },
    description: "Normal: Credit",
  },
  {
    id: "4_2_3_02_loan_service_revenue_non_members",
    code: "4.2.3.02",
    name: "Loan Service Revenue (Non-Members)",
    type: "revenue",
    target: { kind: "is", field: "loan_service_revenue_non_members" },
    description: "Normal: Credit",
  },
  {
    id: "4_2_3_03_rental_service_revenue_non_members",
    code: "4.2.3.03",
    name: "Rental Service Revenue (Non-Members)",
    type: "revenue",
    target: { kind: "is", field: "rental_service_revenue_non_members" },
    description: "Normal: Credit",
  },
  {
    id: "4_2_3_04_delivery_service_revenue_non_members",
    code: "4.2.3.04",
    name: "Delivery Service Revenue (Non-Members)",
    type: "revenue",
    target: { kind: "is", field: "delivery_service_revenue_non_members" },
    description: "Normal: Credit",
  },
  {
    id: "4_2_9_01_other_non_member_service_revenue",
    code: "4.2.9.01",
    name: "Other Non-Member Service Revenue",
    type: "revenue",
    target: { kind: "is", field: "other_non_member_service_revenue" },
    description: "Normal: Credit",
  },
  {
    id: "5_1_1_01_cost_of_goods_sold_merchandise",
    code: "5.1.1.01",
    name: "Cost of Goods Sold - Merchandise",
    type: "expense",
    target: { kind: "is", field: "cost_of_goods_sold_merchandise" },
    description: "Normal: Debit",
  },
  {
    id: "5_1_1_02_cost_of_goods_sold_finished_goods",
    code: "5.1.1.02",
    name: "Cost of Goods Sold - Finished Goods",
    type: "expense",
    target: { kind: "is", field: "cost_of_goods_sold_finished_goods" },
    description: "Normal: Debit",
  },
  {
    id: "5_2_1_01_cost_of_goods_manufactured",
    code: "5.2.1.01",
    name: "Cost of Goods Manufactured",
    type: "expense",
    target: { kind: "is", field: "cost_of_goods_manufactured" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_01_employee_salaries_and_benefits_expense",
    code: "6.1.1.01",
    name: "Employee Salaries and Benefits Expense",
    type: "expense",
    target: { kind: "is", field: "employee_salaries_and_benefits_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_02_supervisor_salaries_and_benefits_expense",
    code: "6.1.1.02",
    name: "Supervisor Salaries and Benefits Expense",
    type: "expense",
    target: { kind: "is", field: "supervisor_salaries_and_benefits_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_03_overtime_pay_expense",
    code: "6.1.1.03",
    name: "Overtime Pay Expense",
    type: "expense",
    target: { kind: "is", field: "overtime_pay_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_04_incentive_bonus_expense",
    code: "6.1.1.04",
    name: "Incentive (Bonus) Expense",
    type: "expense",
    target: { kind: "is", field: "incentive_bonus_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_05_commission_expense",
    code: "6.1.1.05",
    name: "Commission Expense",
    type: "expense",
    target: { kind: "is", field: "commission_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_06_employee_uniform_expense",
    code: "6.1.1.06",
    name: "Employee Uniform Expense",
    type: "expense",
    target: { kind: "is", field: "employee_uniform_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_07_hr_development_expense",
    code: "6.1.1.07",
    name: "HR Development Expense",
    type: "expense",
    target: { kind: "is", field: "hr_development_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_1_99_other_personnel_expense",
    code: "6.1.1.99",
    name: "Other Personnel Expense",
    type: "expense",
    target: { kind: "is", field: "other_personnel_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_2_01_stationery_expense",
    code: "6.1.2.01",
    name: "Stationery Expense",
    type: "expense",
    target: { kind: "is", field: "stationery_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_2_02_photocopy_expense",
    code: "6.1.2.02",
    name: "Photocopy Expense",
    type: "expense",
    target: { kind: "is", field: "photocopy_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_2_03_meeting_refreshments_expense",
    code: "6.1.2.03",
    name: "Meeting Refreshments Expense",
    type: "expense",
    target: { kind: "is", field: "meeting_refreshments_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_2_04_printing_and_decoration_expense",
    code: "6.1.2.04",
    name: "Printing and Decoration Expense",
    type: "expense",
    target: { kind: "is", field: "printing_and_decoration_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_2_99_other_supplies_expense",
    code: "6.1.2.99",
    name: "Other Supplies Expense",
    type: "expense",
    target: { kind: "is", field: "other_supplies_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_3_01_maintenance_and_repairs_expense",
    code: "6.1.3.01",
    name: "Maintenance and Repairs Expense",
    type: "expense",
    target: { kind: "is", field: "maintenance_and_repairs_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_4_01_electricity_expense",
    code: "6.1.4.01",
    name: "Electricity Expense",
    type: "expense",
    target: { kind: "is", field: "electricity_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_4_02_telephone_and_internet_expense",
    code: "6.1.4.02",
    name: "Telephone and Internet Expense",
    type: "expense",
    target: { kind: "is", field: "telephone_and_internet_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_4_99_other_utilities_expense",
    code: "6.1.4.99",
    name: "Other Utilities Expense",
    type: "expense",
    target: { kind: "is", field: "other_utilities_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_5_01_rent_expense",
    code: "6.1.5.01",
    name: "Rent Expense",
    type: "expense",
    target: { kind: "is", field: "rent_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_5_02_insurance_expense",
    code: "6.1.5.02",
    name: "Insurance Expense",
    type: "expense",
    target: { kind: "is", field: "insurance_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_6_01_security_expense",
    code: "6.1.6.01",
    name: "Security Expense",
    type: "expense",
    target: { kind: "is", field: "security_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_6_02_cleaning_expense",
    code: "6.1.6.02",
    name: "Cleaning Expense",
    type: "expense",
    target: { kind: "is", field: "cleaning_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_7_01_bad_debt_expense",
    code: "6.1.7.01",
    name: "Bad Debt Expense",
    type: "expense",
    target: { kind: "is", field: "bad_debt_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_8_02_depreciation_expense_buildings",
    code: "6.1.8.02",
    name: "Depreciation Expense - Buildings",
    type: "expense",
    target: { kind: "is", field: "depreciation_expense_buildings" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_8_03_depreciation_expense_equipment_and_furniture",
    code: "6.1.8.03",
    name: "Depreciation Expense - Equipment and Furniture",
    type: "expense",
    target: { kind: "is", field: "depreciation_expense_equipment_and_furniture" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_8_04_depreciation_expense_vehicles",
    code: "6.1.8.04",
    name: "Depreciation Expense - Vehicles",
    type: "expense",
    target: { kind: "is", field: "depreciation_expense_vehicles" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_8_05_amortization_expense_intangible_assets",
    code: "6.1.8.05",
    name: "Amortization Expense - Intangible Assets",
    type: "expense",
    target: { kind: "is", field: "amortization_expense_intangible_assets" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_01_parking_expense",
    code: "6.1.9.01",
    name: "Parking Expense",
    type: "expense",
    target: { kind: "is", field: "parking_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_02_laundry_expense",
    code: "6.1.9.02",
    name: "Laundry Expense",
    type: "expense",
    target: { kind: "is", field: "laundry_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_03_mentoring_expense",
    code: "6.1.9.03",
    name: "Mentoring Expense",
    type: "expense",
    target: { kind: "is", field: "mentoring_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_04_supervisory_expense",
    code: "6.1.9.04",
    name: "Supervisory Expense",
    type: "expense",
    target: { kind: "is", field: "supervisory_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_05_audit_expense",
    code: "6.1.9.05",
    name: "Audit Expense",
    type: "expense",
    target: { kind: "is", field: "audit_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_06_business_travel_expense",
    code: "6.1.9.06",
    name: "Business Travel Expense",
    type: "expense",
    target: { kind: "is", field: "business_travel_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_07_transportation_expense",
    code: "6.1.9.07",
    name: "Transportation Expense",
    type: "expense",
    target: { kind: "is", field: "transportation_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_08_guest_entertainment_expense",
    code: "6.1.9.08",
    name: "Guest Entertainment Expense",
    type: "expense",
    target: { kind: "is", field: "guest_entertainment_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_1_9_99_other_general_and_administrative_expense",
    code: "6.1.9.99",
    name: "Other General and Administrative Expense",
    type: "expense",
    target: { kind: "is", field: "other_general_and_administrative_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_2_1_01_marketing_staff_salaries_and_benefits_expense",
    code: "6.2.1.01",
    name: "Marketing Staff Salaries and Benefits Expense",
    type: "expense",
    target: { kind: "is", field: "marketing_staff_salaries_and_benefits_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_2_2_01_advertising_expense",
    code: "6.2.2.01",
    name: "Advertising Expense",
    type: "expense",
    target: { kind: "is", field: "advertising_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_2_2_02_promotion_expense",
    code: "6.2.2.02",
    name: "Promotion Expense",
    type: "expense",
    target: { kind: "is", field: "promotion_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_2_2_03_social_fund_expense",
    code: "6.2.2.03",
    name: "Social Fund Expense",
    type: "expense",
    target: { kind: "is", field: "social_fund_expense" },
    description: "Normal: Debit",
  },
  {
    id: "6_2_3_99_other_marketing_expense",
    code: "6.2.3.99",
    name: "Other Marketing Expense",
    type: "expense",
    target: { kind: "is", field: "other_marketing_expense" },
    description: "Normal: Debit",
  },
  {
    id: "9_1_1_01_interest_income",
    code: "9.1.1.01",
    name: "Interest Income",
    type: "revenue",
    target: { kind: "is", field: "interest_income" },
    description: "Normal: Credit",
  },
  {
    id: "9_1_2_01_rental_income",
    code: "9.1.2.01",
    name: "Rental Income",
    type: "revenue",
    target: { kind: "is", field: "rental_income" },
    description: "Normal: Credit",
  },
  {
    id: "9_1_3_01_penalty_income",
    code: "9.1.3.01",
    name: "Penalty Income",
    type: "revenue",
    target: { kind: "is", field: "penalty_income" },
    description: "Normal: Credit",
  },
  {
    id: "9_1_4_01_advertising_income",
    code: "9.1.4.01",
    name: "Advertising Income",
    type: "revenue",
    target: { kind: "is", field: "advertising_income" },
    description: "Normal: Credit",
  },
  {
    id: "9_1_9_99_other_miscellaneous_income",
    code: "9.1.9.99",
    name: "Other Miscellaneous Income",
    type: "revenue",
    target: { kind: "is", field: "other_miscellaneous_income" },
    description: "Normal: Credit",
  },
  {
    id: "9_2_1_01_bank_administration_expense",
    code: "9.2.1.01",
    name: "Bank Administration Expense",
    type: "expense",
    target: { kind: "is", field: "bank_administration_expense" },
    description: "Normal: Debit",
  },
  {
    id: "9_2_2_01_interest_expense",
    code: "9.2.2.01",
    name: "Interest Expense",
    type: "expense",
    target: { kind: "is", field: "interest_expense" },
    description: "Normal: Debit",
  },
  {
    id: "9_2_3_01_rent_expense_non_operating",
    code: "9.2.3.01",
    name: "Rent Expense (Non-Operating)",
    type: "expense",
    target: { kind: "is", field: "rent_expense_non_operating" },
    description: "Normal: Debit",
  },
  {
    id: "9_2_9_99_other_miscellaneous_expense",
    code: "9.2.9.99",
    name: "Other Miscellaneous Expense",
    type: "expense",
    target: { kind: "is", field: "other_miscellaneous_expense" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_01_bank_interest_tax_expense",
    code: "9.3.1.01",
    name: "Bank Interest Tax Expense",
    type: "expense",
    target: { kind: "is", field: "bank_interest_tax_expense" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_02_billboard_tax_expense",
    code: "9.3.1.02",
    name: "Billboard Tax Expense",
    type: "expense",
    target: { kind: "is", field: "billboard_tax_expense" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_03_pph_21_expense",
    code: "9.3.1.03",
    name: "PPh 21 Expense",
    type: "expense",
    target: { kind: "is", field: "pph_21_expense" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_04_pph_23_expense",
    code: "9.3.1.04",
    name: "PPh 23 Expense",
    type: "expense",
    target: { kind: "is", field: "pph_23_expense" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_05_pph_25_expense",
    code: "9.3.1.05",
    name: "PPh 25 Expense",
    type: "expense",
    target: { kind: "is", field: "pph_25_expense" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_06_pph_29_expense",
    code: "9.3.1.06",
    name: "PPh 29 Expense",
    type: "expense",
    target: { kind: "is", field: "pph_29_expense" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_07_final_income_tax_expense",
    code: "9.3.1.07",
    name: "Final Income Tax Expense",
    type: "expense",
    target: { kind: "is", field: "final_income_tax_expense" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_08_cooperative_income_tax_expense",
    code: "9.3.1.08",
    name: "Cooperative Income Tax Expense",
    type: "expense",
    target: { kind: "is", field: "cooperative_income_tax_expense" },
    description: "Normal: Debit",
  },
  {
    id: "9_3_1_99_other_tax_expense",
    code: "9.3.1.99",
    name: "Other Tax Expense",
    type: "expense",
    target: { kind: "is", field: "other_tax_expense" },
    description: "Normal: Debit",
  },
];

type ContextShape = {
  accounts: Account[];
  addAccount: (a: Omit<Account, "id">) => Account;
  updateAccount: (id: string, patch: Partial<Account>) => Account | undefined;
  deleteAccount: (id: string) => void;
  getAccount: (id?: string) => Account | undefined;
};

const ChartContext = createContext<ContextShape | undefined>(undefined);

export function ChartOfAccountsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Account[];
        if (Array.isArray(stored)) {
          // Merge defaults: keep existing user/stored accounts, but add any missing default accounts
          const byCode = new Map<string, Account>();
          for (const a of stored) byCode.set(a.code, a);
          const merged = [...stored];
          for (const def of DEFAULT_ACCOUNTS) {
            if (!byCode.has(def.code)) merged.push(def);
          }
          return merged;
        }
      }
    } catch (e) {
      // ignore parse errors
    }
    return DEFAULT_ACCOUNTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      // ignore
    }
  }, [accounts]);

  const addAccount = (a: Omit<Account, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const acc: Account = { ...a, id };
    setAccounts((s) => [...s, acc]);
    return acc;
  };

  const updateAccount = (id: string, patch: Partial<Account>) => {
    let updated: Account | undefined;
    setAccounts((s) =>
      s.map((acc) => {
        if (acc.id !== id) return acc;
        updated = { ...acc, ...patch };
        return updated!;
      }),
    );
    return updated;
  };

  const deleteAccount = (id: string) => {
    setAccounts((s) => s.filter((a) => a.id !== id));
  };

  const getAccount = (id?: string) => accounts.find((a) => a.id === id);

  return (
    <ChartContext.Provider
      value={{ accounts, addAccount, updateAccount, deleteAccount, getAccount }}
    >
      {children}
    </ChartContext.Provider>
  );
}

export function useChartOfAccounts() {
  const ctx = useContext(ChartContext);
  if (!ctx)
    throw new Error(
      "useChartOfAccounts must be used within ChartOfAccountsProvider",
    );
  return ctx;
}
