// The printed chrome both documents share: the mark at the top, and the
// contact block that the old Word templates carried at the bottom.
export const LetterHead = () => (
  <div className="flex justify-center pb-10">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src="/images/devnodes.png"
      alt="DevNodes"
      className="h-16 w-auto object-contain"
    />
  </div>
);

type LetterFooterProps = {
  name: string;
  title?: string;
  // Rendered opposite the contact block, where the printed copy gets signed.
  signatureLabel?: string;
  // Leaves room above the name for a signature, as the experience letter does.
  spaceForSignature?: boolean;
};

export const LetterFooter = ({
  name,
  title,
  signatureLabel,
  spaceForSignature = false,
}: LetterFooterProps) => (
  <div className="mt-12 flex items-end justify-between gap-8 text-sm">
    <div className="space-y-1">
      {spaceForSignature && <div className="mb-4 h-12" />}
      <p className="font-semibold">{name}</p>
      {title && <p>{title}</p>}
      <p className="pt-2">+92 337602492</p>
      <p className="text-blue-700 underline">DevNodes.co</p>
    </div>
    {signatureLabel && (
      <p className="whitespace-nowrap pb-6">{signatureLabel}</p>
    )}
  </div>
);
