import { Seat } from "@/entities";
import { formatPrintDate, formatSlipShortDate } from "@/lib/salarySlip";
import {
  TaxSalarySlip,
  TaxSlipPeriod,
  formatTaxSlipHeading,
  formatTaxSlipMoney,
  formatTaxSlipRange,
} from "@/lib/taxSalarySlip";

type Props = {
  seat: Seat;
  slip: TaxSalarySlip;
  from: TaxSlipPeriod;
  to: TaxSlipPeriod;
};

const CELL = "border border-gray-400 px-2 py-1 align-top";
const LABEL = `${CELL} whitespace-nowrap font-bold`;
const FIGURE = `${CELL} text-right tabular-nums`;

export const TaxSalarySlipPreview = ({ seat, slip, from, to }: Props) => (
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
        TAX SALARY SLIP: {formatTaxSlipHeading(from, to)}
      </h2>
      <p className="pt-1 text-xs">
        Tax year {slip.taxYear} · {slip.taxYearPeriod}
      </p>
    </div>

    <div className="print-table-scroll overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <tbody>
          <tr className="bg-gray-200">
            <th className={`${CELL} text-center`} colSpan={4}>
              Employee Details
            </th>
          </tr>
          <tr>
            <td className={LABEL}>Employee Name :</td>
            <td className={CELL}>{seat.name}</td>
            <td className={LABEL}>Account Number/IBAN :</td>
            <td className={CELL}>{seat.account_number || "—"}</td>
          </tr>
          <tr>
            <td className={LABEL}>Designation :</td>
            <td className={CELL}>{seat.designation || "—"}</td>
            <td className={LABEL}>Bank Name :</td>
            <td className={CELL}>{seat.bank_name || "—"}</td>
          </tr>
          <tr>
            <td className={LABEL}>Employment Status :</td>
            <td className={CELL}>{seat.employment_status || "—"}</td>
            <td className={LABEL}>CNIC :</td>
            <td className={CELL}>{seat.cnic || "—"}</td>
          </tr>
          <tr>
            <td className={LABEL}>Period :</td>
            <td className={CELL}>{formatTaxSlipRange(from, to)}</td>
            <td className={LABEL}>Date of Joining :</td>
            <td className={CELL}>
              {seat.date_of_joining
                ? formatSlipShortDate(seat.date_of_joining)
                : "—"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="print-table-scroll overflow-x-auto pt-4">
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <tbody>
          <tr className="bg-gray-200 text-center font-bold">
            <th className={`${CELL} text-left`}>Month</th>
            <th className={`${CELL} text-right`}>Gross Pay</th>
            <th className={`${CELL} text-right`}>Tax Deducted</th>
            <th className={`${CELL} text-right`}>Net Pay</th>
          </tr>
          {slip.months.map((month) => (
            <tr key={`${month.year}-${month.month}`}>
              <td className={CELL}>
                {month.label}
                {month.dispatches > 1 && (
                  <span className="text-[10px] text-gray-600">
                    {" "}
                    ({month.dispatches} dispatches)
                  </span>
                )}
              </td>
              {month.recorded ? (
                <>
                  <td className={FIGURE}>
                    {formatTaxSlipMoney(month.grossSalary)}
                  </td>
                  <td className={FIGURE}>
                    {formatTaxSlipMoney(month.taxDeducted)}
                  </td>
                  <td className={FIGURE}>
                    {formatTaxSlipMoney(month.netSalary)}
                  </td>
                </>
              ) : (
                // A month with no salary sheet behind it is left blank rather
                // than printed as a zero, which would read as unpaid.
                <>
                  <td className={`${CELL} bg-gray-100 text-center`}>—</td>
                  <td className={`${CELL} bg-gray-100 text-center`}>—</td>
                  <td className={`${CELL} bg-gray-100 text-center`}>—</td>
                </>
              )}
            </tr>
          ))}
          <tr className="bg-gray-200 font-bold">
            <td className={CELL}>
              Total ({slip.monthsRecorded}{" "}
              {slip.monthsRecorded === 1 ? "month" : "months"})
            </td>
            <td className={FIGURE}>{formatTaxSlipMoney(slip.grossSalary)}</td>
            <td className={FIGURE}>{formatTaxSlipMoney(slip.taxDeducted)}</td>
            <td className={FIGURE}>{formatTaxSlipMoney(slip.netSalary)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p className="pt-6 text-xs">
      <span className="font-bold">Note:</span> This statement covers{" "}
      {formatTaxSlipRange(from, to)} and reports salary paid and income tax
      deducted at source over that period.
      {slip.monthsMissing.length > 0 &&
        ` No salary was dispatched for ${slip.monthsMissing.join(", ")}.`}
    </p>

    <div className="flex justify-end pt-24">
      <p className="text-sm font-bold">
        Authorized Signature: ____________________
      </p>
    </div>
  </div>
);
