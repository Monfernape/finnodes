import type { ReactNode } from "react";

export type PerformanceReviewPreviewSection = {
  title: string;
  status: string;
  prompts: string[];
  answers: Record<string, string>;
};

type PerformanceReviewPreviewProps = {
  employeeName: string;
  reviewName: string;
  sections: PerformanceReviewPreviewSection[];
};

const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;
const BULLET_PATTERN = /^[-*]\s+(.+)$/;
const NUMBERED_PATTERN = /^\d+[.)]\s+(.+)$/;

function ReviewAnswer({ answer }: { answer: string | undefined }) {
  const trimmedAnswer = answer?.trim();

  if (!trimmedAnswer) {
    return (
      <p className="mt-2 text-[15px] italic leading-7 text-gray-400">
        No response provided.
      </p>
    );
  }

  const blocks: ReactNode[] = [];
  let bulletItems: string[] = [];
  let numberedItems: string[] = [];

  const flushLists = () => {
    if (bulletItems.length > 0) {
      blocks.push(
        <ul
          key={`bullets-${blocks.length}`}
          className="list-disc space-y-1 pl-5"
        >
          {bulletItems.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>,
      );
      bulletItems = [];
    }

    if (numberedItems.length > 0) {
      blocks.push(
        <ol
          key={`numbers-${blocks.length}`}
          className="list-decimal space-y-1 pl-5"
        >
          {numberedItems.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ol>,
      );
      numberedItems = [];
    }
  };

  trimmedAnswer.split("\n").forEach((line, index) => {
    const content = line.trim();
    const heading = content.match(HEADING_PATTERN);
    const bullet = content.match(BULLET_PATTERN);
    const numbered = content.match(NUMBERED_PATTERN);

    if (!content) {
      flushLists();
      return;
    }

    if (heading) {
      flushLists();
      blocks.push(
        <h4
          key={`heading-${index}`}
          className="pt-1 text-base font-semibold leading-7 text-gray-800"
        >
          {heading[2]}
        </h4>,
      );
      return;
    }

    if (bullet) {
      if (numberedItems.length > 0) flushLists();
      bulletItems.push(bullet[1]);
      return;
    }

    if (numbered) {
      if (bulletItems.length > 0) flushLists();
      numberedItems.push(numbered[1]);
      return;
    }

    flushLists();
    blocks.push(<p key={`paragraph-${index}`}>{content}</p>);
  });

  flushLists();

  return (
    <div className="mt-2 space-y-3 text-[15px] leading-7 text-gray-600">
      {blocks}
    </div>
  );
}

export function PerformanceReviewPreview({
  employeeName,
  reviewName,
  sections,
}: PerformanceReviewPreviewProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9">
      <header className="border-b border-gray-100 pb-7">
        <p className="text-sm font-medium text-gray-500">{employeeName}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
          {reviewName}
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          Performance review preview
        </p>
      </header>

      <div className="divide-y divide-gray-100">
        {sections.map((section) => (
          <section key={section.title} className="py-8 first:pt-7 last:pb-0">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-gray-950">
                {section.title}
              </h3>
              <p className="mt-1 text-sm capitalize text-gray-500">
                {section.status.replaceAll("_", " ")}
              </p>
            </div>

            <div className="mt-6 space-y-8">
              {section.prompts.map((prompt) => (
                <div key={prompt}>
                  <h4 className="text-sm font-semibold leading-6 text-gray-800">
                    {prompt}
                  </h4>
                  <ReviewAnswer answer={section.answers[prompt]} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
