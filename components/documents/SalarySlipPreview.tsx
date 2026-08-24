import { SalarySlip, SalarySlipLine } from "@/entities";
import {
  formatSlipAmount,
  formatSlipDate,
  formatSlipMonth,
  getDeductions,
  getEarnings,
} from "@/lib/salarySlip";
import { withHonorific } from "@/lib/documentText";
import { LetterFooter, LetterHead } from "./LetterHead";

type Props = {
  slip: SalarySlip;
  lines: SalarySlipLine[];
};

export const SalarySlipPreview = ({ slip, lines }: Props) => {
  const earnings = getEarnings(lines);
  const deductions = getDeductions(lines);
  // Earnings and deductions print side by side, so the shorter column is padded
  // to keep the table rectangular the way the original slip was.
  const rowCount = Math.max(earnings.length, deductions.length);

  return (
    <div className="print-area mx-auto w-full max-w-[900px] bg-white p-6 text-black shadow sm:p-12">
      <LetterHead />

      <h1 className="mb-10 text-center text-3xl">Salary Slip</h1>

      <div className="space-y-1 text-sm">
        <p>
          <span className="font-medium">Name:</span> {slip.employee_name}
        </p>
        <p>
          <span className="font-medium">Designation:</span>{" "}
          {slip.designation || "—"}
        </p>
        {slip.contact_number && (
          <p>
            <span className="font-medium">Personal Contact Number:</span>{" "}
            {slip.contact_number}
          </p>
        )}
        <p>
          <span className="font-medium">Salary Month:</span>{" "}
          {formatSlipMonth(slip.month, slip.year)}
        </p>
      </div>

      <div className="mt-8 space-y-4 text-sm leading-7">
        <p>
          This is to certify that{" "}
          <strong>{withHonorific(slip.employee_name)}</strong> has been employed
          with our organization as a {slip.designation || "team member"}
          {slip.date_of_joining
            ? ` since ${formatSlipDate(slip.date_of_joining)}`
            : ""}
          .
        </p>
        <p>
          Throughout his employment, we have found him to be dedicated, sincere,
          and fully committed to his responsibilities.
        </p>
        {slip.recipient_name && (
          <p>
            At the request of our employee, we are issuing this letter to
            introduce and refer him to <strong>{slip.recipient_name}</strong>
            {slip.purpose ? ` for the purpose of ${slip.purpose}` : ""}.
          </p>
        )}
        <p>
          Should you require any further information, please feel free to contact
          us.
        </p>
      </div>

      <p className="mb-3 mt-8 text-sm font-semibold">
        His salary particulars are given below.
      </p>

      <div className="print-table-scroll overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-3 py-2 font-normal">
                Earnings
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-normal">
                Amount
              </th>
              <th className="border border-gray-300 px-3 py-2 font-normal">
                Deductions
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-normal">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, index) => {
              const earning = earnings[index];
              const deduction = deductions[index];

              return (
                <tr key={index} className={index % 2 === 1 ? "bg-gray-50" : ""}>
                  <td className="border border-gray-300 px-3 py-2">
                    {earning?.label ?? ""}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
                    {earning ? formatSlipAmount(earning.amount) : ""}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    {deduction?.label ?? ""}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
                    {deduction ? formatSlipAmount(deduction.amount) : ""}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-medium">
              <td className="border border-gray-300 px-3 py-2">Gross Earnings</td>
              <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
                {formatSlipAmount(slip.gross_salary)}
              </td>
              <td className="border border-gray-300 px-3 py-2">
                Total Deductions
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
                {formatSlipAmount(slip.total_deductions)}
              </td>
            </tr>
            <tr className="bg-gray-100 font-semibold">
              <td className="border border-gray-300 px-3 py-2" colSpan={2} />
              <td className="border border-gray-300 px-3 py-2">Net Salary</td>
              <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
                {formatSlipAmount(slip.net_salary)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <LetterFooter
        name="Human Resources & Registration"
        signatureLabel="Director:"
      />
    </div>
  );
};
