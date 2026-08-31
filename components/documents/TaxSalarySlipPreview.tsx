import { Seat } from "@/entities";
import {
  DEFAULT_BANK_NAME,
  formatPrintDate,
  formatSlipShortDate,
} from "@/lib/salarySlip";
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

// The month table is four narrow columns, so it fits a phone at the smaller
// type size and only scrolls locally on the very narrowest handsets.
const CELL = "border border-gray-400 px-1.5 py-1 align-top sm:px-2";
const FIGURE = `${CELL} text-right tabular-nums`;

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-gray-400 px-2 py-1.5">
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
      {label}
    </p>
    <p className="mt-0.5 break-words text-xs">{value || "—"}</p>
  </div>
);

export const TaxSalarySlipPreview = ({ seat, slip, from, to }: Props) => (
  <div className="print-area mx-auto w-full max-w-[900px] bg-white p-4 text-black shadow sm:p-10">
    <div className="flex items-start justify-between gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/devnodes.png"
        alt="DevNodes"
        className="h-8 w-auto object-contain sm:h-10"
      />
      <p className="text-[10px] sm:text-xs">Print Date:{formatPrintDate()}</p>
    </div>

    <div className="pb-4 pt-5 text-center sm:pt-6">
      <h1 className="text-base font-bold sm:text-lg">DevNodes Pvt,Ltd</h1>
      <h2 className="text-base font-bold sm:text-lg">
        TAX SALARY SLIP: {formatTaxSlipHeading(from, to)}
      </h2>
      <p className="pt-1 text-[10px] sm:text-xs">
        Tax year {slip.taxYear} · {slip.taxYearPeriod}
      </p>
    </div>

    {/* Stacked on a phone and two up from `sm`, rather than a wide table that
        would have to be scrolled sideways to read a name. */}
    <div>
      <p className="border border-b-0 border-gray-400 bg-gray-200 px-2 py-1 text-center text-xs font-bold">
        Employee Details
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2">
        <Detail label="Employee Name" value={seat.name} />
        <Detail
          label="Account Number/IBAN"
          value={seat.account_number || ""}
        />
        <Detail label="Designation" value={seat.designation || ""} />
        <Detail label="Bank Name" value={seat.bank_name || DEFAULT_BANK_NAME} />
        <Detail label="Employment Status" value={seat.employment_status || ""} />
        <Detail label="CNIC" value={seat.cnic || ""} />
        <Detail label="Period" value={formatTaxSlipRange(from, to)} />
        <Detail
          label="Date of Joining"
          value={
            seat.date_of_joining ? formatSlipShortDate(seat.date_of_joining) : ""
          }
        />
      </div>
    </div>

    <div className="print-table-scroll overflow-x-auto pt-4">
      <table className="w-full min-w-[300px] border-collapse text-left text-[11px] sm:text-xs">
        <tbody>
          <tr className="bg-gray-200 text-center font-bold">
            <th className={`${CELL} text-left`}>Month</th>
            <th className={`${CELL} text-right`}>Gross Pay</th>
            <th className={`${CELL} text-right`}>Tax</th>
            <th className={`${CELL} text-right`}>Net Pay</th>
          </tr>
          {slip.months.map((month) => (
            <tr key={`${month.year}-${month.month}`}>
              <td className={CELL}>
                {month.label}
                {month.dispatches > 1 && (
                  <span className="block text-[10px] text-gray-600">
                    {month.dispatches} dispatches
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

    <p className="pt-5 text-[11px] sm:pt-6 sm:text-xs">
      <span className="font-bold">Note:</span> This statement covers{" "}
      {formatTaxSlipRange(from, to)} and reports salary paid and income tax
      deducted at source over that period.
      {slip.monthsMissing.length > 0 &&
        ` No salary was dispatched for ${slip.monthsMissing.join(", ")}.`}
    </p>

    <div className="flex justify-end pt-16 sm:pt-24">
      <p className="text-xs font-bold sm:text-sm">
        Authorized Signature: ____________________
      </p>
    </div>
  </div>
);
