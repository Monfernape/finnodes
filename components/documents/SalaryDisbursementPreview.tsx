import { SalaryDisbursementLetter } from "@/entities";
import {
  LETTER_TITLE,
  buildReconciliationSentence,
  formatDisbursementAmount,
  formatDisbursementDate,
} from "@/lib/salaryDisbursement";
import { formatSlipDate, formatSlipMonth } from "@/lib/salarySlip";
import { withHonorific } from "@/lib/documentText";
import { LetterFooter, LetterHead } from "./LetterHead";

type Props = {
  letter: SalaryDisbursementLetter;
};

export const SalaryDisbursementPreview = ({ letter }: Props) => {
  const period = formatSlipMonth(letter.month, letter.year);

  return (
    <div className="print-area mx-auto w-full max-w-[900px] bg-white p-6 text-black shadow sm:p-12">
      <LetterHead />

      <h1 className="mb-8 text-center text-2xl font-semibold uppercase tracking-wide">
        {LETTER_TITLE}
      </h1>

      <p className="text-sm">Date: {formatSlipDate(letter.issued_on)}</p>
      <p className="mt-6 text-sm font-semibold">To Whom It May Concern</p>

      <div className="mt-4 space-y-4 text-sm leading-7">
        <p>
          This is to certify that{" "}
          <strong>{withHonorific(letter.employee_name)}</strong>
          {letter.cnic ? ` (CNIC ${letter.cnic})` : ""}, employed with DevNodes
          Pvt Ltd as {letter.designation || "a team member"}
          {letter.date_of_joining
            ? ` since ${formatSlipDate(letter.date_of_joining)}`
            : ""}
          , received the net salary for <strong>{period}</strong> as set out
          below.
        </p>
      </div>

      <div className="print-table-scroll mt-6 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400 px-3 py-2 font-medium">
                #
              </th>
              <th className="border border-gray-400 px-3 py-2 font-medium">
                Disbursed on
              </th>
              <th className="border border-gray-400 px-3 py-2 font-medium">
                Instalment
              </th>
              <th className="border border-gray-400 px-3 py-2 text-right font-medium">
                Amount (PKR)
              </th>
            </tr>
          </thead>
          <tbody>
            {letter.instalments.map((instalment, index) => (
              <tr key={`${instalment.paid_on}-${index}`}>
                <td className="border border-gray-400 px-3 py-2">
                  {index + 1}
                </td>
                <td className="border border-gray-400 px-3 py-2">
                  {formatDisbursementDate(instalment.paid_on)}
                </td>
                <td className="border border-gray-400 px-3 py-2">
                  {letter.instalments.length === 1
                    ? "Full salary"
                    : `Instalment ${index + 1} of ${letter.instalments.length}`}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-right tabular-nums">
                  {formatDisbursementAmount(instalment.amount)}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-semibold">
              <td className="border border-gray-400 px-3 py-2" colSpan={3}>
                Total net salary for {period}
              </td>
              <td className="border border-gray-400 px-3 py-2 text-right tabular-nums">
                {formatDisbursementAmount(letter.total_paid)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-4 text-sm leading-7">
        <p>{buildReconciliationSentence(letter)}</p>
        <p>
          The figures above match the amounts credited to the employee&apos;s
          account and the salary slip issued for the same month.
        </p>
        <p>
          This letter is issued at the employee&apos;s request for verification
          purposes. Should you require any further information, please feel free
          to contact us.
        </p>
      </div>

      <LetterFooter
        name="Human Resources & Registration"
        signatureLabel="Authorized Signature: ____________________"
      />
    </div>
  );
};
