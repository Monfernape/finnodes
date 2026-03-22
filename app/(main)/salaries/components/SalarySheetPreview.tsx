import { SalarySheet, SalarySheetItem } from "@/entities";
import { formatJoinDate, formatPreviewDate } from "@/lib/salary";

type Props = {
  sheet: SalarySheet;
  items: SalarySheetItem[];
};

export const SalarySheetPreview = ({ sheet, items }: Props) => {
  const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const numberFormatter = new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  });

  return (
    <div className="mx-auto w-full max-w-[960px] bg-white p-6 text-black shadow sm:p-10">
      <div className="mb-10 flex justify-end">
        <p className="text-lg font-semibold text-red-600">
          {formatPreviewDate(sheet.issued_on)}
        </p>
      </div>

      <div className="space-y-4 text-lg leading-8">
        <p>To,</p>
        <p>{sheet.recipient_name}</p>
        <p>{sheet.recipient_bank}</p>
        <p>{sheet.salutation}</p>
        <p className="pl-8 whitespace-pre-line">{sheet.letter_body}</p>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#f4b183]">
              <th className="border border-black px-3 py-2 font-bold">Sr.</th>
              <th className="border border-black px-3 py-2 font-bold">NAME</th>
              <th className="border border-black px-3 py-2 font-bold">CNIC</th>
              <th className="border border-black px-3 py-2 font-bold">
                Account Number
              </th>
              <th className="border border-black px-3 py-2 font-bold">
                DESIGNATION
              </th>
              <th className="border border-black px-3 py-2 font-bold">D.O.J</th>
              <th className="border border-black px-3 py-2 font-bold">
                GROSS SALARY
              </th>
              <th className="border border-black px-3 py-2 font-bold">
                NET SALARY
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-black px-3 py-2 align-bottom">
                  {index + 1}
                </td>
                <td className="border border-black px-3 py-2 align-bottom">
                  {item.name}
                </td>
                <td className="border border-black px-3 py-2 align-bottom">
                  {item.cnic}
                </td>
                <td className="border border-black px-3 py-2 align-bottom">
                  {item.account_number}
                </td>
                <td className="border border-black px-3 py-2 align-bottom">
                  {item.designation}
                </td>
                <td className="border border-black px-3 py-2 align-bottom">
                  {formatJoinDate(item.date_of_joining)}
                </td>
                <td className="border border-black px-3 py-2 text-right align-bottom">
                  {numberFormatter.format(item.gross_salary)}
                </td>
                <td className="border border-black px-3 py-2 text-right align-bottom">
                  {numberFormatter.format(item.net_salary)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
