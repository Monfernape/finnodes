import { ExperienceLetter } from "@/entities";
import { buildExperienceLetterContent } from "@/lib/experienceLetter";
import { LetterFooter, LetterHead } from "./LetterHead";

type Props = {
  letter: ExperienceLetter;
  signOffName: string;
  signOffTitle: string;
};

export const ExperienceLetterPreview = ({
  letter,
  signOffName,
  signOffTitle,
}: Props) => {
  // Composed on every render from the stored technology slugs, so the letter
  // text is never something that was submitted from a browser.
  const content = buildExperienceLetterContent(letter, {
    signOffName,
    signOffTitle,
  });

  return (
    <div className="print-area mx-auto w-full max-w-[900px] bg-white p-6 text-black shadow sm:p-12">
      <LetterHead />

      <h1 className="mb-10 text-center text-3xl">{content.title}</h1>

      <div className="space-y-4 text-sm leading-7">
        <p className="font-semibold">{content.title}</p>
        <p className="font-semibold">{content.addressee}</p>
        <p>{content.opening}</p>
        {content.assignment && <p>{content.assignment}</p>}
        <p>{content.responsibilitiesLead}</p>
        <ul className="ml-5 list-disc space-y-2">
          {content.responsibilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {content.closing.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p className="font-semibold">Sincerely,</p>
      </div>

      <LetterFooter
        name={content.signOffName}
        title={content.signOffTitle}
        spaceForSignature
      />
    </div>
  );
};
