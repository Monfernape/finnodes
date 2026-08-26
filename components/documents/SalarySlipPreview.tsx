import { SalarySlip, SalarySlipLine } from "@/entities";
import {
  formatPayslipPeriod,
  formatPrintDate,
  formatSlipAmount,
  formatSlipMoney,
  formatSlipShortDate,
  getDeductions,
  getEarnings,
} from "@/lib/salarySlip";

type Props = {
  slip: SalarySlip;
  lines: SalarySlipLine[];
};

const CELL = "border border-gray-400 px-2 py-1 align-top";
const LABEL = `${CELL} whitespace-nowrap font-bold`;

export const SalarySlipPreview = ({ slip, lines }: Props) => {
  const earnings = getEarnings(lines);
  const deductions = getDeductions(lines);
  // Earnings, deductions and tax share one grid, so the short columns are
  // padded to keep it rectangular the way the printed payslip is. Four rows
  // minimum leaves the block looking like a form rather than a stub.
  const rowCount = Math.max(earnings.length, deductions.length, 4);

  return (
    <div className="print-area mx-auto w-full max-w-[900px] bg-white p-6 text-black shadow sm:p-10">
      <div className="flex items-start justify-between gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/devnodes.png"
          alt="DevNodes"
          className="h-10 w-auto object-contain"
        />
        <p className="text-xs">Print Date:{formatPrintDate()}</p>
      </div>

      <div className="pb-4 pt-6 text-center">
        <h1 className="text-lg font-bold">DevNodes Pvt,Ltd</h1>
        <h2 className="text-lg font-bold">
          PAYSLIP: {formatPayslipPeriod(slip.month, slip.year)}
        </h2>
      </div>

      <div className="print-table-scroll overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <tbody>
            <tr className="bg-gray-200">
              <th className={`${CELL} text-center`} colSpan={5}>
                Employee Details
              </th>
            </tr>
            <tr>
              <td className={LABEL}>Employee Name :</td>
              <td className={CELL} colSpan={2}>
                {slip.employee_name}
              </td>
              <td className={LABEL}>Account Number/IBAN :</td>
              <td className={CELL}>{slip.account_number || "—"}</td>
            </tr>
            <tr>
              <td className={LABEL}>Designation :</td>
              <td className={CELL} colSpan={2}>
                {slip.designation || "—"}
              </td>
              <td className={LABEL}>Bank Name :</td>
              <td className={CELL}>{slip.bank_name || "—"}</td>
            </tr>
            <tr>
              <td className={LABEL}>Gross Salary :</td>
              <td className={CELL} colSpan={2}>
                {formatSlipAmount(slip.gross_salary)}
              </td>
              <td className={LABEL}>CNIC :</td>
              <td className={CELL}>{slip.cnic || "—"}</td>
            </tr>
            <tr>
              <td className={LABEL}>Employment Status :</td>
              <td className={CELL}>{slip.employment_status || "—"}</td>
              <td className={CELL}>
                <span className="font-bold">Office Location : </span>
                {slip.office_location || "—"}
              </td>
              <td className={LABEL}>Date of Joining :</td>
              <td className={CELL}>
                {slip.date_of_joining
                  ? formatSlipShortDate(slip.date_of_joining)
                  : "—"}
              </td>
            </tr>

            <tr className="bg-gray-200 text-center font-bold">
              <th className={CELL} colSpan={2}>
                Earnings
              </th>
              <th className={CELL} colSpan={2}>
                Deductions
              </th>
              <th className={CELL}>Tax Details</th>
            </tr>
            <tr>
              <td className={CELL}>{earnings[0]?.label ?? ""}</td>
              <td className={`${CELL} text-right tabular-nums`}>
                {earnings[0] ? formatSlipMoney(earnings[0].amount) : ""}
              </td>
              <td className={CELL}>{deductions[0]?.label ?? ""}</td>
              <td className={`${CELL} text-right tabular-nums`}>
                {deductions[0] ? formatSlipMoney(deductions[0].amount) : ""}
              </td>
              <td className={`${CELL} bg-gray-200 text-center font-bold`}>
                Current Month Tax Paid
              </td>
            </tr>
            <tr>
              <td className={CELL}>{earnings[1]?.label ?? ""}</td>
              <td className={`${CELL} text-right tabular-nums`}>
                {earnings[1] ? formatSlipMoney(earnings[1].amount) : ""}
              </td>
              <td className={CELL}>{deductions[1]?.label ?? ""}</td>
              <td className={`${CELL} text-right tabular-nums`}>
                {deductions[1] ? formatSlipMoney(deductions[1].amount) : ""}
              </td>
              <td className={`${CELL} text-right tabular-nums`}>
                {formatSlipMoney(slip.tax_paid)}
              </td>
            </tr>
            {Array.from({ length: rowCount - 2 }, (_, offset) => {
              const index = offset + 2;
              const earning = earnings[index];
              const deduction = deductions[index];

              return (
                <tr key={index}>
                  <td className={CELL}>{earning?.label ?? ""}</td>
                  <td className={`${CELL} text-right tabular-nums`}>
                    {earning ? formatSlipMoney(earning.amount) : ""}
                  </td>
                  <td className={CELL}>{deduction?.label ?? ""}</td>
                  <td className={`${CELL} text-right tabular-nums`}>
                    {deduction ? formatSlipMoney(deduction.amount) : ""}
                  </td>
                  <td className={`${CELL} bg-gray-100`} />
                </tr>
              );
            })}

            <tr className="bg-gray-200 font-bold">
              <td className={CELL}>Gross Pay</td>
              <td className={`${CELL} text-right tabular-nums`}>
                {formatSlipMoney(slip.gross_salary)}
              </td>
              <td className={CELL}>Total Deductions</td>
              <td className={`${CELL} text-right tabular-nums`}>
                {formatSlipMoney(slip.total_deductions)}
              </td>
              <td className={CELL}>
                <span className="flex justify-between gap-3">
                  <span>Net Pay</span>
                  <span className="tabular-nums">
                    {formatSlipMoney(slip.net_salary)}
                  </span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* The generated line comes first: on a partial payslip it is the one
          thing that stops the figures above looking wrong against a bank
          statement. Anything a manager wrote follows it. */}
      {slip.disbursement_summary && (
        <p className="pt-6 text-xs">
          <span className="font-bold">Note:</span> {slip.disbursement_summary}
        </p>
      )}
      {slip.note && (
        <p className={slip.disbursement_summary ? "pt-2 text-xs" : "pt-6 text-xs"}>
          {!slip.disbursement_summary && (
            <span className="font-bold">Note: </span>
          )}
          {slip.note}
        </p>
      )}

      <div className="flex justify-end pt-24">
        <p className="text-sm font-bold">
          Authorized Signature: ____________________
        </p>
      </div>
    </div>
  );
};
